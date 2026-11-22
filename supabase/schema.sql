-- GigBee combined schema for a new project.

-- GigBee V1 foundation. Apply ONLY to a dedicated GigBee Supabase project.
-- No production payment, escrow, payout, course or certificate features exist in V1.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  username text unique,
  headline text not null default '',
  bio text not null default '',
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint display_name_length check (char_length(display_name) <= 100),
  constraint username_format check (username is null or username ~ '^[a-z0-9_]{3,24}$'),
  constraint headline_length check (char_length(headline) <= 140),
  constraint bio_length check (char_length(bio) <= 2000)
);

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('freelancer', 'client', 'learner', 'creator')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 8 and 120),
  description text not null check (char_length(description) between 60 and 6000),
  category text not null check (char_length(category) between 2 and 80),
  budget_inr integer not null check (budget_inr between 100 and 10000000),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  freelancer_id uuid not null references public.profiles(id) on delete cascade,
  proposal text not null check (char_length(proposal) between 30 and 2000),
  status text not null default 'submitted' check (status in ('submitted', 'withdrawn')),
  created_at timestamptz not null default now(),
  unique (job_id, freelancer_id)
);

create index if not exists jobs_status_created_idx on public.jobs(status, created_at desc);
create index if not exists jobs_client_created_idx on public.jobs(client_id, created_at desc);
create index if not exists applications_freelancer_created_idx on public.applications(freelancer_id, created_at desc);
create index if not exists applications_job_created_idx on public.applications(job_id, created_at desc);

create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
revoke all on function private.set_updated_at() from public, anon, authenticated;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
drop trigger if exists jobs_updated_at on public.jobs;
create trigger jobs_updated_at before update on public.jobs
for each row execute function private.set_updated_at();

-- auth.users is not exposed through the public Data API.
-- A restricted trigger creates a profile and beginner role during account creation.
create or replace function private.handle_new_gigbee_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(left(new.raw_user_meta_data->>'full_name', 100), ''));
  insert into public.user_roles(user_id, role) values (new.id, 'freelancer');
  return new;
end;
$$;
revoke all on function private.handle_new_gigbee_user() from public, anon, authenticated;
drop trigger if exists gigbee_on_auth_user_created on auth.users;
create trigger gigbee_on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_gigbee_user();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;

-- Clear explicit grants; sensitive tables are never readable by anonymous users.
revoke all on public.profiles, public.user_roles, public.jobs, public.applications from anon, authenticated;
grant select on public.profiles, public.jobs to anon;
grant select, update on public.profiles to authenticated;
grant select, insert on public.user_roles to authenticated;
grant select, insert, update on public.jobs to authenticated;
grant select, insert on public.applications to authenticated;

-- Public profile pages show opted-in profile fields only.
create policy "profiles public or own read" on public.profiles
for select to anon, authenticated
using (is_public = true or (select auth.uid()) = id);
create policy "profiles own update" on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "roles owner read" on public.user_roles
for select to authenticated
using ((select auth.uid()) = user_id);
create policy "roles self-activate" on public.user_roles
for insert to authenticated
with check ((select auth.uid()) = user_id and role in ('freelancer', 'client', 'learner'));

create policy "jobs open or owned readable" on public.jobs
for select to anon, authenticated
using (status = 'open' or client_id = (select auth.uid()));
create policy "client can post job" on public.jobs
for insert to authenticated
with check (
  client_id = (select auth.uid())
  and exists(select 1 from public.user_roles r
             where r.user_id = (select auth.uid()) and r.role = 'client')
);
create policy "client can edit own job" on public.jobs
for update to authenticated
using (client_id = (select auth.uid()))
with check (client_id = (select auth.uid()));

-- Applicants see their own applications. Job owners see applicants for THEIR jobs.
create policy "application participants read" on public.applications
for select to authenticated
using (
  freelancer_id = (select auth.uid())
  or exists(select 1 from public.jobs j
            where j.id = job_id and j.client_id = (select auth.uid()))
);
create policy "freelancer can apply once to open job" on public.applications
for insert to authenticated
with check (
  freelancer_id = (select auth.uid()) and status = 'submitted'
  and exists(select 1 from public.user_roles r
             where r.user_id = (select auth.uid()) and r.role = 'freelancer')
  and exists(select 1 from public.jobs j
             where j.id = job_id and j.status = 'open'
               and j.client_id <> (select auth.uid()))
);

-- No authenticated DELETE and no direct application UPDATE grants.
-- Future job acceptance, payments, reviews and certificates require server-side transitions.

-- Conservative abuse control for first release: max 10 new jobs and 10 applications
-- per account per rolling 24 hours. These checks run server-side, not in the UI.
create or replace function private.guard_new_job()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.client_id::text)::bigint);
  if (select count(*) from public.jobs
      where client_id = new.client_id and created_at >= pg_catalog.now() - interval '24 hours') >= 10 then
    raise exception 'Daily job posting limit reached';
  end if;
  new.created_at := pg_catalog.now();
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;
revoke all on function private.guard_new_job() from public, anon, authenticated;
drop trigger if exists gigbee_guard_new_job on public.jobs;
create trigger gigbee_guard_new_job before insert on public.jobs
for each row execute function private.guard_new_job();

create or replace function private.guard_new_application()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.freelancer_id::text)::bigint);
  if (select count(*) from public.applications
      where freelancer_id = new.freelancer_id and created_at >= pg_catalog.now() - interval '24 hours') >= 10 then
    raise exception 'Daily application limit reached';
  end if;
  new.created_at := pg_catalog.now();
  new.status := 'submitted';
  return new;
end;
$$;
revoke all on function private.guard_new_application() from public, anon, authenticated;
drop trigger if exists gigbee_guard_new_application on public.applications;
create trigger gigbee_guard_new_application before insert on public.applications
for each row execute function private.guard_new_application();


-- GigBee integrated marketplace, learning and trust system.
-- Apply after 202611190001_foundation.sql. This schema does not create or imply a regulated escrow arrangement.
-- All privileged actions are handled by authenticated PostgreSQL RPCs or verified payment webhooks.

alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add constraint applications_status_check check (status in ('submitted','withdrawn','accepted','declined'));

alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles add column if not exists city text default '';
alter table public.profiles add column if not exists website text default '';
alter table public.profiles add column if not exists availability text not null default 'available' check (availability in ('available','busy','unavailable'));

create table if not exists public.skills (
 id uuid primary key default gen_random_uuid(), name text not null unique, category text not null default 'Other'
);
create table if not exists public.user_skills (
 user_id uuid not null references public.profiles(id) on delete cascade,
 skill_id uuid not null references public.skills(id) on delete cascade,
 level text not null default 'learning' check(level in ('learning','intermediate','expert')),
 primary key(user_id,skill_id)
);
create table if not exists public.portfolio_items (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 title text not null check(char_length(title) between 4 and 120), description text not null default '',
 project_url text, image_path text, created_at timestamptz not null default now()
);
create table if not exists public.saved_jobs (
 user_id uuid not null references public.profiles(id) on delete cascade,
 job_id uuid not null references public.jobs(id) on delete cascade,
 created_at timestamptz not null default now(), primary key (user_id, job_id)
);
create table if not exists public.projects (
 id uuid primary key default gen_random_uuid(), job_id uuid not null unique references public.jobs(id),
 application_id uuid not null unique references public.applications(id),
 client_id uuid not null references public.profiles(id), freelancer_id uuid not null references public.profiles(id),
 status text not null default 'active' check(status in ('active','delivered','revision_requested','completed','disputed','cancelled')),
 agreed_budget_inr integer not null check(agreed_budget_inr > 0),
 payment_status text not null default 'unpaid' check(payment_status in ('unpaid','link_created','captured','refunded','failed')),
 created_at timestamptz not null default now(), completed_at timestamptz,
 constraint distinct_project_participants check(client_id<>freelancer_id)
);
create table if not exists public.deliverables (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 freelancer_id uuid not null references public.profiles(id), note text not null check(char_length(note) between 10 and 5000),
 file_path text, status text not null default 'submitted' check(status in ('submitted','revision_requested','accepted')),
 created_at timestamptz not null default now(), reviewed_at timestamptz
);
create table if not exists public.messages (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 sender_id uuid not null references public.profiles(id), body text not null check(char_length(body) between 1 and 3000),
 created_at timestamptz not null default now(), read_at timestamptz
);
create table if not exists public.reviews (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id),
 reviewer_id uuid not null references public.profiles(id), reviewee_id uuid not null references public.profiles(id),
 rating integer not null check(rating between 1 and 5), comment text not null default '' check(char_length(comment)<=1000),
 created_at timestamptz not null default now(), unique(project_id,reviewer_id)
);
create table if not exists public.certificates (
 id uuid primary key default gen_random_uuid(), code uuid not null unique default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id), kind text not null check(kind in ('work','course')),
 title text not null, project_id uuid unique references public.projects(id), course_id uuid,
 issued_at timestamptz not null default now(), revoked_at timestamptz,
 constraint certificate_one_source check ((kind='work' and project_id is not null and course_id is null) or (kind='course' and course_id is not null and project_id is null))
);
create table if not exists public.notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 title text not null, body text not null default '', href text, is_read boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.disputes (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id),
 opened_by uuid not null references public.profiles(id), reason text not null check(char_length(reason) between 15 and 3000),
 status text not null default 'open' check(status in ('open','under_review','resolved','dismissed')),
 resolution text, created_at timestamptz not null default now(), resolved_at timestamptz
);
create table if not exists public.reports (
 id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.profiles(id),
 subject_id uuid references public.profiles(id), job_id uuid references public.jobs(id),
 reason text not null check(char_length(reason) between 10 and 3000),
 status text not null default 'open' check(status in ('open','reviewing','resolved','dismissed')),
 created_at timestamptz not null default now()
);
create table if not exists private.staff (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('admin','moderator'))
);
create table if not exists public.payment_events (
 provider_event_id text primary key, event_type text not null, order_id text,
 received_at timestamptz not null default now(), event_hash text
);
create table if not exists public.payment_orders (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id),
 provider text not null check(provider in ('razorpay')),
 provider_link_id text unique, provider_link_url text, provider_payment_id text unique,
 amount_paise bigint not null check(amount_paise>0), status text not null default 'created',
 created_at timestamptz not null default now(), unique(project_id,provider)
);

-- Learning: public discovery + free course enrollments. Paid courses require a separate provider-approved flow.
create table if not exists public.courses (
 id uuid primary key default gen_random_uuid(), creator_id uuid not null references public.profiles(id),
 title text not null check(char_length(title) between 5 and 140), description text not null default '',
 category text not null default 'General', cover_path text,
 price_inr integer not null default 0 check(price_inr=0),
 status text not null default 'draft' check(status in ('draft','published','archived')),
 created_at timestamptz not null default now()
);
create table if not exists public.lessons (
 id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses(id) on delete cascade,
 title text not null, content text not null default '', video_url text, position integer not null default 0,
 unique(course_id,position)
);
create table if not exists public.enrollments (
 user_id uuid not null references public.profiles(id) on delete cascade,
 course_id uuid not null references public.courses(id) on delete cascade,
 enrolled_at timestamptz not null default now(), finished_at timestamptz,
 primary key(user_id,course_id)
);
create table if not exists public.lesson_progress (
 user_id uuid not null references public.profiles(id) on delete cascade,
 lesson_id uuid not null references public.lessons(id) on delete cascade,
 completed_at timestamptz not null default now(), primary key(user_id,lesson_id)
);
create table if not exists public.quiz_questions (
 id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses(id) on delete cascade,
 question text not null, options jsonb not null check(jsonb_typeof(options)='array' and jsonb_array_length(options)=4),
 position integer not null default 0
);
create table if not exists private.quiz_answers (
 question_id uuid primary key references public.quiz_questions(id) on delete cascade,
 correct_index integer not null check(correct_index between 0 and 3)
);
create table if not exists public.quiz_attempts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id),
 course_id uuid not null references public.courses(id), score integer not null check(score between 0 and 100),
 passed boolean not null, created_at timestamptz not null default now()
);
alter table public.certificates add constraint certificates_course_id_fk foreign key(course_id) references public.courses(id);

create index if not exists projects_client_idx on public.projects(client_id,created_at desc);
create index if not exists projects_freelancer_idx on public.projects(freelancer_id,created_at desc);
create index if not exists messages_project_created_idx on public.messages(project_id,created_at);
create index if not exists notifications_user_idx on public.notifications(user_id,created_at desc);
create index if not exists courses_status_idx on public.courses(status,created_at desc);
create index if not exists reports_status_idx on public.reports(status,created_at desc);

-- Financial tables are in public schema for service-role Data API access, but no client role has grants or policies.
alter table public.payment_events enable row level security;
alter table public.payment_orders enable row level security;
revoke all on public.payment_events, public.payment_orders from anon, authenticated;
-- No raw access to private schema or payment records. Admin is never determined by editable user metadata.
revoke all on all tables in schema private from public,anon,authenticated;
create or replace function private.is_staff() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.staff where user_id=(select auth.uid()))
$$;
revoke all on function private.is_staff() from public,anon,authenticated;
create or replace function private.is_participant(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.projects where id=p_id and (client_id=(select auth.uid()) or freelancer_id=(select auth.uid())))
$$;
revoke all on function private.is_participant(uuid) from public,anon,authenticated;

-- Grant exposure only when RLS is enabled; policies constrain every read and write.
do $$ declare t text; begin
 foreach t in array array['skills','user_skills','portfolio_items','saved_jobs','projects','deliverables','messages','reviews','certificates','notifications','disputes','reports','courses','lessons','enrollments','lesson_progress','quiz_questions','quiz_attempts'] loop
  execute format('alter table public.%I enable row level security', t);
  execute format('revoke all on public.%I from anon,authenticated',t);
 end loop;
end $$;
grant select on public.skills, public.courses, public.lessons, public.quiz_questions, public.portfolio_items, public.reviews, public.certificates to anon;
grant select,insert,update,delete on public.user_skills, public.portfolio_items, public.saved_jobs to authenticated;
grant select,insert,update on public.profiles to authenticated;
grant select,insert on public.user_roles to authenticated;
grant select,insert,update on public.courses, public.lessons, public.quiz_questions to authenticated;
grant select,insert on public.enrollments, public.lesson_progress to authenticated;
grant select on public.projects, public.deliverables, public.quiz_attempts, public.reviews, public.certificates, public.disputes to authenticated;
grant select,insert on public.messages, public.reports to authenticated;
grant select,update on public.notifications to authenticated;
grant select on public.skills, public.courses, public.lessons, public.quiz_questions, public.portfolio_items, public.reviews, public.certificates to authenticated;

create policy "skills public" on public.skills for select to anon,authenticated using(true);
create policy "user_skills visible" on public.user_skills for select to authenticated
 using(user_id=auth.uid() or exists(select 1 from public.profiles p where p.id=user_id and p.is_public));
create policy "user_skills insert own" on public.user_skills for insert to authenticated with check(user_id=auth.uid());
create policy "user_skills update own" on public.user_skills for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "user_skills delete own" on public.user_skills for delete to authenticated using(user_id=auth.uid());
create policy "portfolio public or own" on public.portfolio_items for select to anon,authenticated
 using(user_id=auth.uid() or exists(select 1 from public.profiles p where p.id=user_id and p.is_public));
create policy "portfolio own insert" on public.portfolio_items for insert to authenticated with check(user_id=auth.uid());
create policy "portfolio own update" on public.portfolio_items for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "portfolio own delete" on public.portfolio_items for delete to authenticated using(user_id=auth.uid());
create policy "saved own read" on public.saved_jobs for select to authenticated using(user_id=auth.uid());
create policy "saved own insert" on public.saved_jobs for insert to authenticated with check(user_id=auth.uid());
create policy "saved own delete" on public.saved_jobs for delete to authenticated using(user_id=auth.uid());
create policy "projects participants" on public.projects for select to authenticated
 using(client_id=auth.uid() or freelancer_id=auth.uid() or (select private.is_staff()));
create policy "deliverables participants" on public.deliverables for select to authenticated
 using(private.is_participant(project_id) or (select private.is_staff()));
create policy "messages participants read" on public.messages for select to authenticated
 using(private.is_participant(project_id) or (select private.is_staff()));
create policy "messages participants write" on public.messages for insert to authenticated
 with check(sender_id=auth.uid() and private.is_participant(project_id) and char_length(body)>0);
create policy "reviews completed public" on public.reviews for select to anon,authenticated
 using(exists(select 1 from public.projects p where p.id=project_id and p.status='completed'));
create policy "certificates public active" on public.certificates for select to anon,authenticated
 using(revoked_at is null or owner_id=auth.uid() or (select private.is_staff()));
create policy "notifications own read" on public.notifications for select to authenticated using(user_id=auth.uid());
create policy "notifications own mark read" on public.notifications for update to authenticated
 using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "disputes participants" on public.disputes for select to authenticated
 using(private.is_participant(project_id) or (select private.is_staff()));
create policy "reports own or staff read" on public.reports for select to authenticated
 using(reporter_id=auth.uid() or (select private.is_staff()));
create policy "reports own insert" on public.reports for insert to authenticated
 with check(reporter_id=auth.uid());
create policy "courses published or creator" on public.courses for select to anon,authenticated
 using(status='published' or creator_id=auth.uid() or (select private.is_staff()));
create policy "courses creator insert" on public.courses for insert to authenticated
 with check(creator_id=auth.uid() and exists(select 1 from public.user_roles where user_id=auth.uid() and role='creator'));
create policy "courses creator update" on public.courses for update to authenticated
 using(creator_id=auth.uid()) with check(creator_id=auth.uid());
create policy "lessons visible" on public.lessons for select to anon,authenticated
 using(exists(select 1 from public.courses c where c.id=course_id and (c.status='published' or c.creator_id=auth.uid())));
create policy "lessons creator insert" on public.lessons for insert to authenticated
 with check(exists(select 1 from public.courses c where c.id=course_id and c.creator_id=auth.uid()));
create policy "lessons creator update" on public.lessons for update to authenticated
 using(exists(select 1 from public.courses c where c.id=course_id and c.creator_id=auth.uid()))
 with check(exists(select 1 from public.courses c where c.id=course_id and c.creator_id=auth.uid()));
create policy "quiz public questions" on public.quiz_questions for select to anon,authenticated
 using(exists(select 1 from public.courses c where c.id=course_id and (c.status='published' or c.creator_id=auth.uid())) or (select private.is_staff()));
create policy "quiz creator insert" on public.quiz_questions for insert to authenticated
 with check(exists(select 1 from public.courses c where c.id=course_id and c.creator_id=auth.uid()));
create policy "quiz creator update" on public.quiz_questions for update to authenticated
 using(exists(select 1 from public.courses c where c.id=course_id and c.creator_id=auth.uid()))
 with check(exists(select 1 from public.courses c where c.id=course_id and c.creator_id=auth.uid()));
create policy "enrollments own read" on public.enrollments for select to authenticated using(user_id=auth.uid());
create policy "enrollments own insert" on public.enrollments for insert to authenticated
 with check(user_id=auth.uid() and exists(select 1 from public.courses c where c.id=course_id and c.status='published' and c.price_inr=0));
create policy "lesson progress own read" on public.lesson_progress for select to authenticated using(user_id=auth.uid());
create policy "lesson progress own insert" on public.lesson_progress for insert to authenticated
 with check(user_id=auth.uid() and exists(select 1 from public.lessons l join public.enrollments e on e.course_id=l.course_id where l.id=lesson_id and e.user_id=auth.uid()));
create policy "quiz attempts own read" on public.quiz_attempts for select to authenticated using(user_id=auth.uid());

-- Readable public profiles may also be viewed by clients receiving job proposals / project counterparts.
create or replace function private.may_view_profile(target_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.applications a join public.jobs j on j.id=a.job_id
  where a.freelancer_id=target_id and j.client_id=(select auth.uid()))
 or exists(select 1 from public.projects p where (p.client_id=target_id and p.freelancer_id=(select auth.uid())) or (p.freelancer_id=target_id and p.client_id=(select auth.uid())))
$$;
revoke all on function private.may_view_profile(uuid) from public,anon,authenticated;
drop policy if exists "profiles public or own read" on public.profiles;
create policy "profiles public participant or own" on public.profiles for select to anon,authenticated
 using(is_public or id=auth.uid() or private.may_view_profile(id) or (select private.is_staff()));
drop policy if exists "jobs open or owned readable" on public.jobs;
create policy "jobs visible to participants" on public.jobs for select to anon,authenticated
 using(status='open' or client_id=auth.uid() or exists(select 1 from public.projects p where p.job_id=id and (p.client_id=auth.uid() or p.freelancer_id=auth.uid())) or (select private.is_staff()));
-- Since applications checks original jobs, rejected applicants may no longer see closed job details, but retain proposal history.

-- Permit creator activation from the same account, no separate login.
drop policy if exists "roles self-activate" on public.user_roles;
create policy "roles self-activate" on public.user_roles for insert to authenticated
 with check(user_id=auth.uid() and role in ('freelancer','client','learner','creator'));

-- Admin/moderator permission is separate from user roles.
create policy "moderators see reports" on public.reports for update to authenticated
 using((select private.is_staff())) with check((select private.is_staff()));
grant update on public.reports to authenticated;
create policy "moderators see disputes" on public.disputes for update to authenticated
 using((select private.is_staff())) with check((select private.is_staff()));
grant update on public.disputes to authenticated;

-- RLS prevents users from directly inserting fabricated reviews, certificates, project status, delivery or transaction rows.
-- State transitions are exclusively exposed through narrowly authorized and audited RPCs below.

create or replace function private.notify(uid uuid, ttl text, msg text, destination text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 insert into public.notifications(user_id,title,body,href) values(uid,ttl,msg,destination);
end $$;
revoke all on function private.notify(uuid,text,text,text) from public,anon,authenticated;

create or replace function public.hire_applicant(p_application uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare a public.applications%rowtype; j public.jobs%rowtype; pid uuid;
begin
 if (select auth.uid()) is null then raise exception 'Sign in required'; end if;
 select * into a from public.applications where id=p_application for update;
 if not found or a.status<>'submitted' then raise exception 'Application not available'; end if;
 select * into j from public.jobs where id=a.job_id for update;
 if j.client_id<>auth.uid() or j.status<>'open' then raise exception 'Only the client can hire for an open job'; end if;
 insert into public.projects(job_id,application_id,client_id,freelancer_id,agreed_budget_inr)
 values(j.id,a.id,j.client_id,a.freelancer_id,j.budget_inr) returning id into pid;
 update public.jobs set status='closed' where id=j.id;
 update public.applications set status=case when id=a.id then 'accepted' else 'declined' end where job_id=j.id and status='submitted';
 perform private.notify(a.freelancer_id,'You were hired',j.title,'/project/'||pid::text);
 return pid;
end $$;
revoke all on function public.hire_applicant(uuid) from public,anon,authenticated;
grant execute on function public.hire_applicant(uuid) to authenticated;

create or replace function public.submit_deliverable(p_project uuid,p_note text,p_file text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare p public.projects%rowtype; did uuid;
begin
 select * into p from public.projects where id=p_project for update;
 if not found or p.freelancer_id<>auth.uid() or p.status not in ('active','revision_requested') then raise exception 'Project not ready for delivery'; end if;
 if char_length(trim(p_note))<10 or char_length(p_note)>5000 then raise exception 'Delivery note must be 10–5000 characters'; end if;
 if p_file is not null and p_file not like (auth.uid()::text || '/%') then raise exception 'Invalid file path'; end if;
 insert into public.deliverables(project_id,freelancer_id,note,file_path) values(p_project,auth.uid(),trim(p_note),p_file) returning id into did;
 update public.projects set status='delivered' where id=p_project;
 perform private.notify(p.client_id,'Delivery submitted','Your freelancer submitted work for review','/project/'||p_project::text);
 return did;
end $$;
revoke all on function public.submit_deliverable(uuid,text,text) from public,anon,authenticated;
grant execute on function public.submit_deliverable(uuid,text,text) to authenticated;

create or replace function public.review_deliverable(p_deliverable uuid,p_accept boolean)
returns void language plpgsql security definer set search_path='' as $$
declare d public.deliverables%rowtype; p public.projects%rowtype; jt text;
begin
 select * into d from public.deliverables where id=p_deliverable for update;
 if not found or d.status<>'submitted' then raise exception 'Deliverable unavailable for review'; end if;
 select * into p from public.projects where id=d.project_id for update;
 if p.client_id<>auth.uid() or p.status<>'delivered' then raise exception 'Only the client can review'; end if;
 update public.deliverables set status=case when p_accept then 'accepted' else 'revision_requested' end,reviewed_at=now() where id=d.id;
 update public.projects set status=case when p_accept then 'completed' else 'revision_requested' end,
  completed_at=case when p_accept then now() else null end where id=p.id;
 if p_accept then
   select title into jt from public.jobs where id=p.job_id;
   insert into public.certificates(owner_id,kind,title,project_id) values(p.freelancer_id,'work',jt,p.id) on conflict(project_id) do nothing;
 end if;
 perform private.notify(p.freelancer_id,case when p_accept then 'Project completed' else 'Revision requested' end,
  case when p_accept then 'Your deliverable was approved' else 'Client requested an update' end,'/project/'||p.id::text);
end $$;
revoke all on function public.review_deliverable(uuid,boolean) from public,anon,authenticated;
grant execute on function public.review_deliverable(uuid,boolean) to authenticated;

create or replace function public.leave_review(p_project uuid,p_rating integer,p_comment text default '')
returns uuid language plpgsql security definer set search_path='' as $$
declare p public.projects%rowtype; other_id uuid; rid uuid;
begin
 select * into p from public.projects where id=p_project;
 if not found or p.status<>'completed' or auth.uid() not in (p.client_id,p.freelancer_id) then raise exception 'Only completed project participants can review'; end if;
 if p_rating<1 or p_rating>5 or char_length(p_comment)>1000 then raise exception 'Invalid review'; end if;
 other_id:=case when auth.uid()=p.client_id then p.freelancer_id else p.client_id end;
 insert into public.reviews(project_id,reviewer_id,reviewee_id,rating,comment)
 values(p_project,auth.uid(),other_id,p_rating,p_comment) returning id into rid;
 perform private.notify(other_id,'New project review','A project participant reviewed your work','/project/'||p_project::text);
 return rid;
end $$;
revoke all on function public.leave_review(uuid,integer,text) from public,anon,authenticated;
grant execute on function public.leave_review(uuid,integer,text) to authenticated;

create or replace function public.open_dispute(p_project uuid,p_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare p public.projects%rowtype; did uuid;
begin
 select * into p from public.projects where id=p_project for update;
 if not found or auth.uid() not in (p.client_id,p.freelancer_id) or p.status in ('completed','cancelled','disputed') then raise exception 'Dispute unavailable'; end if;
 if char_length(trim(p_reason))<15 then raise exception 'Please describe the issue'; end if;
 insert into public.disputes(project_id,opened_by,reason) values(p_project,auth.uid(),trim(p_reason)) returning id into did;
 update public.projects set status='disputed' where id=p_project;
 perform private.notify(case when auth.uid()=p.client_id then p.freelancer_id else p.client_id end,
  'Project dispute opened','This project is under review','/project/'||p_project::text);
 return did;
end $$;
revoke all on function public.open_dispute(uuid,text) from public,anon,authenticated;
grant execute on function public.open_dispute(uuid,text) to authenticated;

create or replace function public.complete_course_lesson(p_lesson uuid)
returns void language plpgsql security definer set search_path='' as $$
declare cid uuid;
begin
 select course_id into cid from public.lessons where id=p_lesson;
 if cid is null or not exists(select 1 from public.enrollments where course_id=cid and user_id=auth.uid()) then raise exception 'Enroll first'; end if;
 insert into public.lesson_progress(user_id,lesson_id) values(auth.uid(),p_lesson) on conflict do nothing;
end $$;
revoke all on function public.complete_course_lesson(uuid) from public,anon,authenticated;
grant execute on function public.complete_course_lesson(uuid) to authenticated;

create or replace function public.submit_course_quiz(p_course uuid,p_answers jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare total integer; correct integer; score_pct integer; passed_ok boolean; has_lessons integer; completed_lessons integer;
begin
 if not exists(select 1 from public.enrollments where user_id=auth.uid() and course_id=p_course) then raise exception 'Enroll in the course first'; end if;
 if jsonb_typeof(p_answers)<>'object' then raise exception 'Answers must be an object'; end if;
 select count(*),count(*) filter (where p_answers->>(q.id::text)=a.correct_index::text)
 into total,correct from public.quiz_questions q join private.quiz_answers a on a.question_id=q.id where q.course_id=p_course;
 if total=0 then raise exception 'This course has no final assessment'; end if;
 select count(*),count(*) filter(where lp.user_id=auth.uid()) into has_lessons,completed_lessons
 from public.lessons l left join public.lesson_progress lp on lp.lesson_id=l.id and lp.user_id=auth.uid() where l.course_id=p_course;
 if completed_lessons<>has_lessons then raise exception 'Complete all lessons first'; end if;
 score_pct:=round(100.0*correct/total); passed_ok:=score_pct>=70;
 insert into public.quiz_attempts(user_id,course_id,score,passed) values(auth.uid(),p_course,score_pct,passed_ok);
 if passed_ok then
  update public.enrollments set finished_at=coalesce(finished_at,now()) where user_id=auth.uid() and course_id=p_course;
  insert into public.certificates(owner_id,kind,title,course_id)
   select auth.uid(),'course',title,id from public.courses where id=p_course
   on conflict do nothing;
 end if;
 return jsonb_build_object('score',score_pct,'passed',passed_ok);
end $$;
revoke all on function public.submit_course_quiz(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.submit_course_quiz(uuid,jsonb) to authenticated;

-- No public access to correct answers, payment credentials or staff membership.
-- Trust metrics derive from completed work only.
create or replace view public.freelancer_stats with (security_invoker=true) as
 select p.id, p.username,p.display_name,p.headline,p.is_public,
 (select count(*) from public.projects pr where pr.freelancer_id=p.id and pr.status='completed') as completed_jobs,
 (select round(avg(r.rating)::numeric,1) from public.reviews r where r.reviewee_id=p.id) as average_rating
 from public.profiles p where p.is_public=true;
grant select on public.freelancer_stats to anon,authenticated;

-- Buckets: profile images public, portfolio & deliverable files private by default.
insert into storage.buckets(id,name,public,file_size_limit)
 values ('gigbee-avatars','gigbee-avatars',true,5242880),('gigbee-files','gigbee-files',false,26214400)
 on conflict(id) do nothing;
create policy "avatars are public" on storage.objects for select to anon,authenticated
 using(bucket_id='gigbee-avatars');
create policy "avatar owner upload" on storage.objects for insert to authenticated
 with check(bucket_id='gigbee-avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "avatar owner update" on storage.objects for update to authenticated
 using(bucket_id='gigbee-avatars' and (storage.foldername(name))[1]=auth.uid()::text)
 with check(bucket_id='gigbee-avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "private files owner insert" on storage.objects for insert to authenticated
 with check(bucket_id='gigbee-files' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "private files owner select" on storage.objects for select to authenticated
 using(bucket_id='gigbee-files' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "private deliverables available to clients" on storage.objects for select to authenticated
 using(bucket_id='gigbee-files' and exists(
  select 1 from public.deliverables d join public.projects p on p.id=d.project_id
   where d.file_path=name and p.client_id=auth.uid()));
-- Portfolio images can be public only from public avatar bucket; private bucket never serves public links.

-- Realtime receives only messages that have passed RLS.
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then
  alter publication supabase_realtime add table public.messages;
 end if;
end $$;

-- Pre-populated category taxonomy. These are metadata, not fake users/jobs.
insert into public.skills(name,category) values
 ('Graphic Design','Design'),('UI/UX','Design'),('Video Editing','Video Editing'),('Motion Graphics','Video Editing'),
 ('Copywriting','Writing'),('Content Writing','Writing'),('React Native','Development'),('Web Development','Development'),
 ('Social Media Marketing','Marketing'),('SEO','Marketing'),('Excel','Data'),('Data Analysis','Data')
on conflict(name) do nothing;

create unique index if not exists certificates_course_owner_unique on public.certificates(owner_id,course_id) where course_id is not null;
-- Enable lesson authors to set assessment answers without exposing answer keys to learners.
create or replace function public.set_quiz_answer(p_question uuid,p_index integer)
returns void language plpgsql security definer set search_path='' as $$
declare cid uuid;
begin
 select q.course_id into cid from public.quiz_questions q join public.courses c on c.id=q.course_id
 where q.id=p_question and c.creator_id=auth.uid() and c.status='draft';
 if cid is null or p_index not between 0 and 3 then raise exception 'Only draft course owners can set answers'; end if;
 insert into private.quiz_answers(question_id,correct_index) values(p_question,p_index)
 on conflict(question_id) do update set correct_index=excluded.correct_index;
end $$;
revoke all on function public.set_quiz_answer(uuid,integer) from public,anon,authenticated;
grant execute on function public.set_quiz_answer(uuid,integer) to authenticated;
-- Course certificates never self-issue and work certificates only issue on reviewed work.
-- Application metadata can be reviewed by the job owner, and job closure remains an authenticated action.

create or replace function public.is_gigbee_staff() returns boolean
language sql stable security definer set search_path='' as $$ select private.is_staff() $$;
revoke all on function public.is_gigbee_staff() from public,anon,authenticated;
grant execute on function public.is_gigbee_staff() to authenticated;
create policy "staff moderate jobs" on public.jobs for update to authenticated
 using((select private.is_staff())) with check((select private.is_staff()));
create policy "staff moderate courses" on public.courses for update to authenticated
 using((select private.is_staff())) with check((select private.is_staff()));
-- To assign an administrator, run with project owner privileges:
-- insert into private.staff(user_id,role) values ('USER_UUID'::uuid,'admin');

-- Security hardening: lookup of a certificate by a random code is a capability,
-- but an anonymous user must not be able to enumerate every recipient's record.
revoke select on public.certificates from anon;
drop policy if exists "certificates public active" on public.certificates;
create policy "certificates own or staff" on public.certificates for select to authenticated
 using(owner_id=auth.uid() or (select private.is_staff()));
create or replace function public.verify_gigbee_certificate(p_code uuid)
returns table(kind text,title text,issued_at timestamptz,holder_name text)
language sql stable security definer set search_path='' as $$
 select c.kind,c.title,c.issued_at,case when p.is_public then p.display_name else '' end
 from public.certificates c join public.profiles p on p.id=c.owner_id
 where c.code=p_code and c.revoked_at is null limit 1
$$;
revoke all on function public.verify_gigbee_certificate(uuid) from public,anon,authenticated;
grant execute on function public.verify_gigbee_certificate(uuid) to anon,authenticated;

-- Safe completed project test for public reviews without granting anonymous project access.
create or replace function private.is_completed_project(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.projects where id=p_id and status='completed')
$$;
revoke all on function private.is_completed_project(uuid) from public,anon,authenticated;
drop policy if exists "reviews completed public" on public.reviews;
create policy "reviews completed public" on public.reviews for select to anon,authenticated
 using(private.is_completed_project(project_id));

create or replace function private.guard_job_changes() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.projects p where p.job_id=old.id) then
   if (new.client_id,new.title,new.description,new.category,new.budget_inr,new.created_at,new.status)
      is distinct from (old.client_id,old.title,old.description,old.category,old.budget_inr,old.created_at,'closed') then
     raise exception 'Hired job details are locked';
   end if;
 end if;
 return new;
end $$;
revoke all on function private.guard_job_changes() from public,anon,authenticated;
drop trigger if exists gigbee_lock_hired_job on public.jobs;
create trigger gigbee_lock_hired_job before update on public.jobs for each row execute function private.guard_job_changes();

create or replace function private.limit_messages() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.sender_id::text)::bigint);
 if (select count(*) from public.messages where sender_id=new.sender_id and created_at>now()-interval '1 hour')>=120 then
   raise exception 'Message rate limit exceeded';
 end if;
 new.created_at:=now();return new;
end $$;
revoke all on function private.limit_messages() from public,anon,authenticated;
drop trigger if exists gigbee_limit_messages on public.messages;
create trigger gigbee_limit_messages before insert on public.messages for each row execute function private.limit_messages();

-- The private schema is NOT exposed by Supabase Data API. RLS helpers need invocation
-- permission to execute safely; SECURITY DEFINER scopes their underlying reads.
grant usage on schema private to anon, authenticated;
grant execute on function private.is_staff() to anon,authenticated;
grant execute on function private.is_participant(uuid) to authenticated;
grant execute on function private.may_view_profile(uuid) to anon,authenticated;
grant execute on function private.is_completed_project(uuid) to anon,authenticated;

create or replace function private.can_view_job(p_job uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.projects pr where pr.job_id=p_job
 and (pr.client_id=(select auth.uid()) or pr.freelancer_id=(select auth.uid())))
$$;
revoke all on function private.can_view_job(uuid) from public,anon,authenticated;
grant execute on function private.can_view_job(uuid) to anon,authenticated;
drop policy if exists "jobs visible to participants" on public.jobs;
create policy "jobs visible to participants" on public.jobs for select to anon,authenticated
 using(status='open' or client_id=auth.uid() or private.can_view_job(id) or private.is_staff());

-- Security-invoker views must not reference restricted projects for anonymous callers.
-- Use a dedicated safe aggregate helper instead of exposing every project row.
create or replace function private.public_freelancer_completed(target_id uuid)
returns bigint language sql stable security definer set search_path='' as $$
 select count(*) from public.projects where freelancer_id=target_id and status='completed'
$$;
revoke all on function private.public_freelancer_completed(uuid) from public,anon,authenticated;
grant execute on function private.public_freelancer_completed(uuid) to anon,authenticated;
create or replace view public.freelancer_stats with (security_invoker=true) as
 select p.id,p.username,p.display_name,p.headline,p.is_public,
 private.public_freelancer_completed(p.id) as completed_jobs,
 (select round(avg(r.rating)::numeric,1) from public.reviews r where r.reviewee_id=p.id) as average_rating
 from public.profiles p where p.is_public=true;

-- Service packages let established freelancers offer fixed-price services without bidding.
create table if not exists public.service_packages (
 id uuid primary key default gen_random_uuid(), freelancer_id uuid not null references public.profiles(id) on delete cascade,
 title text not null check(char_length(title) between 8 and 120),
 description text not null check(char_length(description) between 60 and 6000),
 category text not null,price_inr integer not null check(price_inr between 100 and 10000000),
 delivery_days integer not null check(delivery_days between 1 and 365),
 status text not null default 'active' check(status in ('active','paused')),
 created_at timestamptz not null default now()
);
create table if not exists public.service_requests (
 id uuid primary key default gen_random_uuid(),package_id uuid not null references public.service_packages(id),
 client_id uuid not null references public.profiles(id),freelancer_id uuid not null references public.profiles(id),
 message text not null check(char_length(message) between 10 and 2000),
 status text not null default 'pending' check(status in ('pending','accepted','declined')),
 project_id uuid unique references public.projects(id), created_at timestamptz not null default now(),
 constraint distinct_service_order_participants check(client_id<>freelancer_id)
);
alter table public.service_packages enable row level security;
alter table public.service_requests enable row level security;
revoke all on public.service_packages,public.service_requests from anon,authenticated;
grant select on public.service_packages to anon,authenticated;
grant insert,update,delete on public.service_packages to authenticated;
grant select on public.service_requests to authenticated;
create policy "service packages discovery" on public.service_packages for select to anon,authenticated
 using(status='active' or freelancer_id=auth.uid() or private.is_staff());
create policy "service packages owner create" on public.service_packages for insert to authenticated
 with check(freelancer_id=auth.uid() and exists(select 1 from public.user_roles r where r.user_id=auth.uid() and r.role='freelancer'));
create policy "service packages owner update" on public.service_packages for update to authenticated
 using(freelancer_id=auth.uid()) with check(freelancer_id=auth.uid());
create policy "service packages owner delete" on public.service_packages for delete to authenticated
 using(freelancer_id=auth.uid() and not exists(select 1 from public.service_requests sr where sr.package_id=id));
create policy "service requests participants" on public.service_requests for select to authenticated
 using(client_id=auth.uid() or freelancer_id=auth.uid() or private.is_staff());

create or replace function public.request_service(p_package uuid,p_message text)
returns uuid language plpgsql security definer set search_path='' as $$
declare sp public.service_packages%rowtype; srid uuid;
begin
 if (select auth.uid()) is null or char_length(trim(p_message))<10 then raise exception 'Sign in and describe your request';end if;
 select * into sp from public.service_packages where id=p_package and status='active';
 if not found or sp.freelancer_id=auth.uid() then raise exception 'Service unavailable';end if;
 insert into public.user_roles(user_id,role) values(auth.uid(),'client') on conflict do nothing;
 insert into public.service_requests(package_id,client_id,freelancer_id,message)
 values(p_package,auth.uid(),sp.freelancer_id,trim(p_message)) returning id into srid;
 perform private.notify(sp.freelancer_id,'New service request',sp.title,'/my-services');
 return srid;
end $$;
revoke all on function public.request_service(uuid,text) from public,anon,authenticated;
grant execute on function public.request_service(uuid,text) to authenticated;

create or replace function public.respond_service_request(p_request uuid,p_accept boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare r public.service_requests%rowtype; sp public.service_packages%rowtype; jobid uuid;appid uuid; projectid uuid;
begin
 select * into r from public.service_requests where id=p_request for update;
 if not found or r.status<>'pending' or r.freelancer_id<>auth.uid() then raise exception 'Request unavailable';end if;
 if not p_accept then
   update public.service_requests set status='declined' where id=r.id;
   perform private.notify(r.client_id,'Service request declined','Your request was declined',null);
   return null;
 end if;
 select * into sp from public.service_packages where id=r.package_id;
 if not found then raise exception 'Service package unavailable';end if;
 insert into public.jobs(client_id,title,description,category,budget_inr,status)
 values(r.client_id,sp.title,sp.description,sp.category,sp.price_inr,'open') returning id into jobid;
 insert into public.applications(job_id,freelancer_id,proposal,status)
 values(jobid,r.freelancer_id,'Fixed service engagement requested: '||r.message,'submitted') returning id into appid;
 insert into public.projects(job_id,application_id,client_id,freelancer_id,agreed_budget_inr)
 values(jobid,appid,r.client_id,r.freelancer_id,sp.price_inr) returning id into projectid;
 update public.jobs set status='closed' where id=jobid;
 update public.applications set status='accepted' where id=appid;
 update public.service_requests set status='accepted',project_id=projectid where id=r.id;
 perform private.notify(r.client_id,'Service request accepted','Your project workspace is ready','/project/'||projectid::text);
 return projectid;
end $$;
revoke all on function public.respond_service_request(uuid,boolean) from public,anon,authenticated;
grant execute on function public.respond_service_request(uuid,boolean) to authenticated;

create or replace view public.freelancer_rankings with (security_invoker=true) as
select id,username,display_name,headline,completed_jobs,average_rating,
case when completed_jobs>=20 then 'Expert' when completed_jobs>=5 then 'Intermediate' else 'Beginner' end as tier
from public.freelancer_stats where completed_jobs>0;
grant select on public.freelancer_rankings to anon,authenticated;

alter table public.portfolio_items add constraint portfolio_https_or_null
 check (project_url is null or project_url ~* '^https?://');
alter table public.quiz_questions add constraint quiz_option_strings
 check (jsonb_typeof(options->0)='string' and jsonb_typeof(options->1)='string'
 and jsonb_typeof(options->2)='string' and jsonb_typeof(options->3)='string');

-- Service terms are snapshotted when requested so no party can silently change a quote.
alter table public.service_requests add column if not exists quoted_price_inr integer;
alter table public.service_requests add column if not exists quoted_title text;
alter table public.service_requests add column if not exists quoted_description text;
alter table public.service_requests add column if not exists quoted_category text;
create or replace function public.request_service(p_package uuid,p_message text)
returns uuid language plpgsql security definer set search_path='' as $$
declare sp public.service_packages%rowtype; srid uuid;
begin
 if (select auth.uid()) is null or char_length(trim(p_message))<10 then raise exception 'Sign in and describe your request';end if;
 select * into sp from public.service_packages where id=p_package and status='active';
 if not found or sp.freelancer_id=auth.uid() then raise exception 'Service unavailable';end if;
 insert into public.user_roles(user_id,role) values(auth.uid(),'client') on conflict do nothing;
 insert into public.service_requests(package_id,client_id,freelancer_id,message,quoted_price_inr,quoted_title,quoted_description,quoted_category)
 values(p_package,auth.uid(),sp.freelancer_id,trim(p_message),sp.price_inr,sp.title,sp.description,sp.category) returning id into srid;
 perform private.notify(sp.freelancer_id,'New service request',sp.title,'/my-services');return srid;
end $$;
create or replace function public.respond_service_request(p_request uuid,p_accept boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare r public.service_requests%rowtype;jobid uuid;appid uuid;projectid uuid;
begin
 select * into r from public.service_requests where id=p_request for update;
 if not found or r.status<>'pending' or r.freelancer_id<>auth.uid() then raise exception 'Request unavailable';end if;
 if not p_accept then
  update public.service_requests set status='declined' where id=r.id;
  perform private.notify(r.client_id,'Service request declined','Your request was declined',null);return null;
 end if;
 insert into public.jobs(client_id,title,description,category,budget_inr,status)
 values(r.client_id,r.quoted_title,r.quoted_description,r.quoted_category,r.quoted_price_inr,'open') returning id into jobid;
 insert into public.applications(job_id,freelancer_id,proposal,status)
 values(jobid,r.freelancer_id,'Fixed service engagement requested: '||r.message,'submitted') returning id into appid;
 insert into public.projects(job_id,application_id,client_id,freelancer_id,agreed_budget_inr)
 values(jobid,appid,r.client_id,r.freelancer_id,r.quoted_price_inr) returning id into projectid;
 update public.jobs set status='closed' where id=jobid;
 update public.applications set status='accepted' where id=appid;
 update public.service_requests set status='accepted',project_id=projectid where id=r.id;
 perform private.notify(r.client_id,'Service request accepted','Your project workspace is ready','/project/'||projectid::text);
 return projectid;
end $$;

-- Users can mark notifications read but cannot fabricate the notification contents.
revoke update on public.notifications from authenticated;
grant update(is_read) on public.notifications to authenticated;

create or replace function private.guard_job_changes() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.projects p where p.job_id=old.id) then
   if (new.client_id,new.title,new.description,new.category,new.budget_inr,new.created_at,new.status)
      is distinct from (old.client_id,old.title,old.description,old.category,old.budget_inr,old.created_at,'closed') then
     raise exception 'Hired job details are locked';
   end if;
 elsif exists(select 1 from public.applications a where a.job_id=old.id) then
   if (new.client_id,new.title,new.description,new.category,new.budget_inr,new.created_at)
      is distinct from (old.client_id,old.title,old.description,old.category,old.budget_inr,old.created_at) then
    raise exception 'Job terms are locked after applications begin';
   end if;
 end if;
 return new;
end $$;

-- Server-side Edge Functions only; these grants do not expose financial data to app clients.
grant select,insert,update on public.payment_orders,public.payment_events to service_role;


-- V1.1 NOTIFICATIONS, FINANCIAL STATUS AND MODERATION AUDIT
-- GigBee V1.1: opt-in notifications, privacy-preserving payment activity, moderator audit.
-- Apply AFTER 202611190002_marketplace.sql to a DEDICATED GigBee Supabase project.
-- Payments are still provider-gated; no escrow, settlement or payout claims are introduced.

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  push_enabled boolean not null default false,
  email_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null unique check (char_length(expo_push_token) between 25 and 255),
  platform text not null check (platform in ('android','ios')),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
create index if not exists push_devices_owner_idx on public.push_devices(user_id);

-- Queue is not exposed to the client; only the authenticated service worker may claim it.
create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  channel text not null check (channel in ('push','email')),
  device_id uuid references public.push_devices(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','processing','sent','dead')),
  attempt_count integer not null default 0 check(attempt_count between 0 and 10),
  next_attempt_at timestamptz not null default now(),
  lock_until timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint channel_destination check (
    (channel='push' and device_id is not null) or (channel='email' and device_id is null)
  ),
  unique (notification_id,channel,device_id)
);
create unique index if not exists notification_email_once_idx
  on public.notification_deliveries(notification_id) where channel='email';
create index if not exists notification_delivery_queue_idx on public.notification_deliveries(status,next_attempt_at);

alter table public.notification_preferences enable row level security;
alter table public.push_devices enable row level security;
alter table public.notification_deliveries enable row level security;
revoke all on public.notification_preferences,public.push_devices,public.notification_deliveries from anon,authenticated;
grant select,insert,update on public.notification_preferences to authenticated;
grant select,insert,update,delete on public.push_devices to authenticated;
create policy "preferences only owner read" on public.notification_preferences
  for select to authenticated using(user_id=(select auth.uid()));
create policy "preferences only owner insert" on public.notification_preferences
  for insert to authenticated with check(user_id=(select auth.uid()));
create policy "preferences only owner update" on public.notification_preferences
  for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "devices only owner read" on public.push_devices
  for select to authenticated using(user_id=(select auth.uid()));
create policy "devices only owner insert" on public.push_devices
  for insert to authenticated with check(user_id=(select auth.uid()));
create policy "devices only owner update" on public.push_devices
  for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "devices only owner delete" on public.push_devices
  for delete to authenticated using(user_id=(select auth.uid()));

create or replace function private.enqueue_gigbee_notification()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.notification_deliveries(notification_id,user_id,channel,device_id)
    select new.id,new.user_id,'push',p.id
    from public.push_devices p
    join public.notification_preferences prefs on prefs.user_id=p.user_id
    where p.user_id=new.user_id and p.enabled and prefs.push_enabled
    on conflict do nothing;
  insert into public.notification_deliveries(notification_id,user_id,channel)
    select new.id,new.user_id,'email'
    from public.notification_preferences prefs
    where prefs.user_id=new.user_id and prefs.email_enabled
    on conflict do nothing;
  return new;
end;
$$;
revoke all on function private.enqueue_gigbee_notification() from public,anon,authenticated;
drop trigger if exists gigbee_queue_notification on public.notifications;
create trigger gigbee_queue_notification after insert on public.notifications
  for each row execute function private.enqueue_gigbee_notification();

-- Only the service-role worker can claim deliveries. SKIP LOCKED prevents duplicate claims.
create or replace function public.claim_gigbee_deliveries(p_limit integer default 25)
returns table (id uuid, channel text, destination text, title text, body text, href text)
language plpgsql security definer set search_path='' as $$
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;
  return query
  with candidates as (
    select d.id from public.notification_deliveries d
    where (d.status='pending' or (d.status='processing' and d.lock_until < now()))
      and d.next_attempt_at <= now() and d.attempt_count < 5
      and exists (
        select 1 from public.notification_preferences pref
        where pref.user_id=d.user_id and
          ((d.channel='push' and pref.push_enabled) or (d.channel='email' and pref.email_enabled))
      )
      and (d.channel='email' or exists(select 1 from public.push_devices dv where dv.id=d.device_id and dv.enabled))
    order by d.created_at
    for update skip locked
    limit least(greatest(coalesce(p_limit,25),1),100)
  ), claimed as (
    update public.notification_deliveries d
      set status='processing',attempt_count=d.attempt_count+1,lock_until=now()+interval '3 minutes'
    from candidates c where d.id=c.id
    returning d.id,d.channel,d.device_id,d.user_id,d.notification_id
  )
  select c.id,c.channel,
    case when c.channel='push' then pd.expo_push_token else u.email end as destination,
    n.title,n.body,n.href
  from claimed c
    join public.notifications n on n.id=c.notification_id
    left join public.push_devices pd on pd.id=c.device_id and pd.enabled
    left join auth.users u on u.id=c.user_id
  where (c.channel='push' and pd.expo_push_token is not null)
    or (c.channel='email' and u.email is not null);
end;
$$;
revoke all on function public.claim_gigbee_deliveries(integer) from public,anon,authenticated;
grant execute on function public.claim_gigbee_deliveries(integer) to service_role;

create or replace function public.finish_gigbee_delivery(
  p_id uuid, p_success boolean, p_error text default null, p_permanent boolean default false
) returns void language plpgsql security definer set search_path='' as $$
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;
  update public.notification_deliveries d set
    status=case when p_success then 'sent' when p_permanent or attempt_count>=5 then 'dead' else 'pending' end,
    sent_at=case when p_success then now() else sent_at end,
    lock_until=null,
    last_error=case when p_success then null else left(coalesce(p_error,'delivery failed'),500) end,
    next_attempt_at=case when p_success or p_permanent then next_attempt_at
      else now() + make_interval(mins => least(60, power(2,least(attempt_count,5))::integer)) end
    where d.id=p_id and d.status='processing';
end;
$$;
revoke all on function public.finish_gigbee_delivery(uuid,boolean,text,boolean) from public,anon,authenticated;
grant execute on function public.finish_gigbee_delivery(uuid,boolean,text,boolean) to service_role;

-- No direct client access to raw payment orders; this displays only factual project states.
create or replace function public.my_gigbee_payment_activity()
returns table (project_id uuid, project_title text, role text, agreed_budget_inr integer,
  payment_status text, recorded_provider_status text, created_at timestamptz)
language sql stable security definer set search_path='' as $$
  select p.id,j.title,
    case when p.client_id=(select auth.uid()) then 'client' else 'freelancer' end,
    p.agreed_budget_inr,p.payment_status,
    coalesce(po.status,'not_started'),p.created_at
  from public.projects p
  join public.jobs j on j.id=p.job_id
  left join public.payment_orders po on po.project_id=p.id
  where (p.client_id=(select auth.uid()) or p.freelancer_id=(select auth.uid()))
    and (select auth.uid()) is not null
  order by p.created_at desc limit 100;
$$;
revoke all on function public.my_gigbee_payment_activity() from public,anon,authenticated;
grant execute on function public.my_gigbee_payment_activity() to authenticated;

-- Audit moderation actions automatically, including changes made through the admin website.
create table if not exists private.moderation_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  target_table text not null,
  target_id uuid not null,
  old_status text,
  new_status text,
  created_at timestamptz not null default now()
);
revoke all on private.moderation_audit from public,anon,authenticated;
create index if not exists moderation_audit_created_idx on private.moderation_audit(created_at desc);
create or replace function private.capture_moderation_audit()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status is distinct from old.status then
    insert into private.moderation_audit(actor_id,target_table,target_id,old_status,new_status)
    values((select auth.uid()),TG_TABLE_NAME,new.id,old.status,new.status);
  end if;
  return new;
end;
$$;
revoke all on function private.capture_moderation_audit() from public,anon,authenticated;
drop trigger if exists gigbee_report_audit on public.reports;
create trigger gigbee_report_audit after update on public.reports for each row
  execute function private.capture_moderation_audit();
drop trigger if exists gigbee_dispute_audit on public.disputes;
create trigger gigbee_dispute_audit after update on public.disputes for each row
  execute function private.capture_moderation_audit();

create or replace function public.gigbee_staff_audit(p_limit integer default 50)
returns table (id uuid,actor_id uuid,target_table text,target_id uuid,old_status text,new_status text,created_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  if (select auth.uid()) is null or not private.is_staff() then
    raise exception 'Staff only' using errcode='42501';
  end if;
  return query select a.id,a.actor_id,a.target_table,a.target_id,a.old_status,a.new_status,a.created_at
    from private.moderation_audit a order by a.created_at desc
    limit least(greatest(coalesce(p_limit,50),1),100);
end;
$$;
revoke all on function public.gigbee_staff_audit(integer) from public,anon,authenticated;
grant execute on function public.gigbee_staff_audit(integer) to authenticated;


-- V1.1 ACCOUNT DELETION REQUESTS
-- Account deletion intake. Actual removal from Auth, Storage, and financial records
-- is handled only by approved staff after checking legal/transaction retention duties.
-- This is a genuine user-submitted request, NOT instant deletion.
create table if not exists public.account_deletion_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references public.profiles(id) on delete cascade,
 note text not null default '' check(char_length(note)<=1000),
 status text not null default 'requested' check(status in ('requested','reviewing','completed','cancelled')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.account_deletion_requests enable row level security;
revoke all on public.account_deletion_requests from anon,authenticated;
grant select,insert,update on public.account_deletion_requests to authenticated;
create policy "owners see deletion requests" on public.account_deletion_requests for select to authenticated
 using(user_id=(select auth.uid()) or (select private.is_staff()));
create policy "owners request deletion" on public.account_deletion_requests for insert to authenticated
 with check(user_id=(select auth.uid()) and status='requested');
create policy "staff process deletion requests" on public.account_deletion_requests for update to authenticated
 using((select private.is_staff())) with check((select private.is_staff()));
drop trigger if exists gigbee_deletion_audit on public.account_deletion_requests;
create trigger gigbee_deletion_audit after update on public.account_deletion_requests
  for each row execute function private.capture_moderation_audit();

-- GigBee V1.4 additive audit migration follows
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
