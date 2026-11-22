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
