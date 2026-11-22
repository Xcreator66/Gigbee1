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
