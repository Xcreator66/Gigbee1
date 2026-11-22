-- GigBee V1.4 audit hardening. Apply ONLY to a dedicated GigBee project
-- after 202611190004_account_rights.sql. This migration is additive and preserves user data.
-- 1) Published lessons and quiz questions cannot be rewritten after credentials are issued.
-- 2) Courses must have real lessons and answered quiz questions before publication.
-- 3) Push tokens may be reused after signing out of another account on the same device,
--    without permitting two enabled accounts to receive alerts on the same token.

create or replace function private.guard_gigbee_course_publication()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.creator_id is distinct from old.creator_id then
    raise exception 'Course creator cannot be changed';
  end if;
  if old.status in ('published','archived') then
    if (new.title,new.description,new.category,new.cover_path,new.price_inr,new.creator_id)
       is distinct from
       (old.title,old.description,old.category,old.cover_path,old.price_inr,old.creator_id) then
      raise exception 'Published course contents are locked to protect assessment records';
    end if;
    if new.status = 'draft' then
      raise exception 'Published or archived courses cannot become editable drafts';
    end if;
  end if;
  if new.status='published' and old.status is distinct from 'published' then
    if not exists (select 1 from public.lessons l where l.course_id=new.id) then
      raise exception 'Add at least one lesson before publishing';
    end if;
    if not exists (select 1 from public.quiz_questions q where q.course_id=new.id) then
      raise exception 'Add at least one assessment question before publishing';
    end if;
    if exists (
      select 1 from public.quiz_questions q
        left join private.quiz_answers a on a.question_id=q.id
      where q.course_id=new.id and a.question_id is null
    ) then
      raise exception 'Every assessment question needs a saved correct answer';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_gigbee_course_publication() from public,anon,authenticated;
drop trigger if exists gigbee_guard_course_publication on public.courses;
create trigger gigbee_guard_course_publication
before update on public.courses for each row
execute function private.guard_gigbee_course_publication();

drop policy if exists "lessons creator insert" on public.lessons;
create policy "lessons creator insert" on public.lessons for insert to authenticated
with check (
  exists (select 1 from public.courses c
    where c.id=course_id and c.creator_id=(select auth.uid()) and c.status='draft')
);
drop policy if exists "lessons creator update" on public.lessons;
create policy "lessons creator update" on public.lessons for update to authenticated
using (
  exists (select 1 from public.courses c
    where c.id=course_id and c.creator_id=(select auth.uid()) and c.status='draft')
)
with check (
  exists (select 1 from public.courses c
    where c.id=course_id and c.creator_id=(select auth.uid()) and c.status='draft')
);

drop policy if exists "quiz creator insert" on public.quiz_questions;
create policy "quiz creator insert" on public.quiz_questions for insert to authenticated
with check (
  exists (select 1 from public.courses c
    where c.id=course_id and c.creator_id=(select auth.uid()) and c.status='draft')
);
drop policy if exists "quiz creator update" on public.quiz_questions;
create policy "quiz creator update" on public.quiz_questions for update to authenticated
using (
  exists (select 1 from public.courses c
    where c.id=course_id and c.creator_id=(select auth.uid()) and c.status='draft')
)
with check (
  exists (select 1 from public.courses c
    where c.id=course_id and c.creator_id=(select auth.uid()) and c.status='draft')
);

-- Original unique token constraint meant a shared physical device could never
-- register push for a second account after an earlier account registered it.
-- Keep tokens unique *per owner*, and disable all other users' token records.
alter table public.push_devices drop constraint if exists push_devices_expo_push_token_key;
create unique index if not exists gigbee_push_devices_user_token_idx
on public.push_devices (user_id,expo_push_token);

create or replace function private.gigbee_push_token_handover()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.enabled then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.expo_push_token)::bigint);
    update public.push_devices
      set enabled=false,updated_at=now()
      where expo_push_token=new.expo_push_token and id is distinct from new.id and enabled;
  end if;
  return new;
end;
$$;
revoke all on function private.gigbee_push_token_handover() from public,anon,authenticated;
drop trigger if exists gigbee_push_token_handover_insert on public.push_devices;
create trigger gigbee_push_token_handover_insert
before insert on public.push_devices for each row
execute function private.gigbee_push_token_handover();
drop trigger if exists gigbee_push_token_handover_update on public.push_devices;
create trigger gigbee_push_token_handover_update
before update of enabled,expo_push_token on public.push_devices for each row
when (new.enabled)
execute function private.gigbee_push_token_handover();

-- Only an enabled device currently owned by the notification recipient may be used.
-- Existing deliveries to disabled accounts remain queued but will never be sent
-- because the claim worker filters out disabled devices.

-- A quiz question and its confidential answer key must be created in one transaction.
-- Otherwise a transient network error can leave a permanently unpublishable draft.
create or replace function public.add_gigbee_quiz_question(
  p_course uuid, p_question text, p_options jsonb, p_correct_index integer
) returns uuid language plpgsql security definer set search_path='' as $$
declare qid uuid; course_creator uuid; course_status text;
begin
  if (select auth.uid()) is null then raise exception 'Sign in required'; end if;
  select creator_id,status into course_creator,course_status
    from public.courses where id=p_course for update;
  if course_creator is distinct from (select auth.uid()) or course_status<>'draft' then
    raise exception 'Only the draft course creator can add questions';
  end if;
  if char_length(trim(coalesce(p_question,'')))<8 or char_length(p_question)>2000
    or jsonb_typeof(p_options) is distinct from 'array'
    or jsonb_array_length(p_options)<>4 or p_correct_index not between 0 and 3 then
    raise exception 'Provide a question, four answers and the correct option';
  end if;
  if jsonb_typeof(p_options->0)<>'string' or jsonb_typeof(p_options->1)<>'string'
    or jsonb_typeof(p_options->2)<>'string' or jsonb_typeof(p_options->3)<>'string'
    or exists (
       select 1 from jsonb_array_elements_text(p_options) as opt(answer_text)
         where char_length(trim(opt.answer_text))<1 or char_length(opt.answer_text)>500
    ) then raise exception 'Each answer option must contain 1–500 characters'; end if;
  insert into public.quiz_questions(course_id,question,options,position)
    values(p_course,trim(p_question),p_options,
      (select coalesce(max(position)+1,0) from public.quiz_questions where course_id=p_course))
    returning id into qid;
  insert into private.quiz_answers(question_id,correct_index) values(qid,p_correct_index);
  return qid;
end;
$$;
revoke all on function public.add_gigbee_quiz_question(uuid,text,jsonb,integer) from public,anon,authenticated;
grant execute on function public.add_gigbee_quiz_question(uuid,text,jsonb,integer) to authenticated;

-- Rate-limit service request abuse and prevent simultaneous identical pending orders.
create or replace function public.request_service(p_package uuid,p_message text)
returns uuid language plpgsql security definer set search_path='' as $$
declare sp public.service_packages%rowtype; srid uuid; uid uuid:=(select auth.uid());
begin
  if uid is null or char_length(trim(coalesce(p_message,'')))<10 or char_length(p_message)>2000 then
    raise exception 'Sign in and describe your request (10–2000 characters)';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(uid::text)::bigint);
  if (select count(*) from public.service_requests
      where client_id=uid and created_at>=now()-interval '24 hours')>=15 then
    raise exception 'Daily service request limit reached';
  end if;
  if exists(select 1 from public.service_requests
    where client_id=uid and package_id=p_package and status='pending') then
    raise exception 'You already have a pending request for this service';
  end if;
  select * into sp from public.service_packages where id=p_package and status='active';
  if not found or sp.freelancer_id=uid then raise exception 'Service unavailable'; end if;
  insert into public.user_roles(user_id,role) values(uid,'client') on conflict do nothing;
  insert into public.service_requests(
    package_id,client_id,freelancer_id,message,quoted_price_inr,
    quoted_title,quoted_description,quoted_category)
  values(p_package,uid,sp.freelancer_id,trim(p_message),sp.price_inr,
    sp.title,sp.description,sp.category) returning id into srid;
  perform private.notify(sp.freelancer_id,'New service request',sp.title,'/my-services');
  return srid;
end;
$$;
revoke all on function public.request_service(uuid,text) from public,anon,authenticated;
grant execute on function public.request_service(uuid,text) to authenticated;

create index if not exists service_requests_client_recent_idx
on public.service_requests(client_id,created_at desc);

-- Prevent bypassing the publication guard by inserting directly as published.
drop policy if exists "courses creator insert" on public.courses;
create policy "courses creator insert" on public.courses for insert to authenticated
with check(creator_id=(select auth.uid()) and status='draft' and price_inr=0
  and exists(select 1 from public.user_roles
    where user_id=(select auth.uid()) and role='creator'));

-- Permit owners to remove unused uploaded files after a failed deliverable submission.
-- Referenced deliverables stay immutable and available to their project participants.
drop policy if exists "gigbee private file owner cleanup" on storage.objects;
create policy "gigbee private file owner cleanup" on storage.objects for delete to authenticated
using(bucket_id='gigbee-files' and (storage.foldername(name))[1]=(select auth.uid())::text
  and not exists(select 1 from public.deliverables d where d.file_path=name));
drop policy if exists "gigbee avatar owner cleanup" on storage.objects;
create policy "gigbee avatar owner cleanup" on storage.objects for delete to authenticated
using(bucket_id='gigbee-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text
  and not exists(select 1 from public.profiles p where p.avatar_path=name));

-- Moderators may change workflow fields, never rewrite the original evidence.
revoke update on public.reports from authenticated;
grant update(status) on public.reports to authenticated;
revoke update on public.disputes from authenticated;
grant update(status,resolution,resolved_at) on public.disputes to authenticated;
revoke update on public.account_deletion_requests from authenticated;
grant update(status,updated_at) on public.account_deletion_requests to authenticated;

-- Include job closure in the existing immutable moderation status audit.
drop trigger if exists gigbee_job_status_audit on public.jobs;
create trigger gigbee_job_status_audit after update on public.jobs for each row
execute function private.capture_moderation_audit();

-- New project chat messages should create in-app notification records.
-- Do not copy private chat contents into push/email; use only a generic summary.
-- Coalesce rapid messages to reduce repeated external notification delivery.
create or replace function private.gigbee_chat_notification()
returns trigger language plpgsql security definer set search_path='' as $$
declare recipient uuid; destination text;
begin
  destination := '/project/'||new.project_id::text;
  select case when p.client_id=new.sender_id then p.freelancer_id else p.client_id end
    into recipient from public.projects p where p.id=new.project_id
      and new.sender_id in (p.client_id,p.freelancer_id);
  if recipient is null then return new; end if;
  if not exists(
    select 1 from public.notifications n where n.user_id=recipient
      and n.href=destination and n.title='New project message'
      and n.created_at > now()-interval '2 minutes'
  ) then
    perform private.notify(recipient,'New project message',
      'You have a new message in your GigBee project workspace.',destination);
  end if;
  return new;
end;
$$;
revoke all on function private.gigbee_chat_notification() from public,anon,authenticated;
drop trigger if exists gigbee_chat_notification on public.messages;
create trigger gigbee_chat_notification after insert on public.messages
for each row execute function private.gigbee_chat_notification();

create index if not exists gigbee_notification_recent_project_idx
on public.notifications(user_id,href,created_at desc)
where title='New project message';
