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
