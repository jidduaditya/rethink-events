-- 0006_host_whitelist.sql — whitelist-gated hosting (Phase 4).
-- The whitelist is the ONLY write path for profiles.is_trusted:
--   insert into host_whitelist -> matching profile (if any) becomes trusted
--   delete from host_whitelist -> matching profile (if any) loses trust
--   profile created at signup  -> trusted iff email is on the list
-- Competing write paths retired here: the first-event-review trust flip
-- (events_flip_trust). The app-side manual toggle is removed in the same PR.
-- To host, an admin must whitelist their own email too — the list is exactly
-- who can host, no exceptions.

-- ─── table ───────────────────────────────────────────────────────────────────
create table public.host_whitelist (
  email      text primary key check (email = lower(email)),
  added_by   uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.host_whitelist enable row level security;

create policy whitelist_admin_select on public.host_whitelist
  for select to authenticated using (public.is_admin());
create policy whitelist_admin_insert on public.host_whitelist
  for insert to authenticated with check (public.is_admin());
create policy whitelist_admin_delete on public.host_whitelist
  for delete to authenticated using (public.is_admin());
-- no update policy: rows are add/remove only

-- ─── trust check usable inside RLS policies (mirrors public.is_admin) ────────
create or replace function public.is_trusted_host()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select is_trusted from public.profiles where id = auth.uid()), false);
$$;

-- ─── grant / revoke triggers: one transaction, no drift ──────────────────────
create or replace function public.apply_whitelist_grant()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set is_trusted = true where lower(email) = new.email;
  return new;
end; $$;
create trigger whitelist_grant
  after insert on public.host_whitelist
  for each row execute function public.apply_whitelist_grant();

create or replace function public.apply_whitelist_revoke()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set is_trusted = false where lower(email) = old.email;
  return old;
end; $$;
create trigger whitelist_revoke
  after delete on public.host_whitelist
  for each row execute function public.apply_whitelist_revoke();

-- ─── pre-approval: profile created after its email was whitelisted ───────────
create or replace function public.apply_whitelist_on_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.host_whitelist w where w.email = lower(new.email)) then
    new.is_trusted := true;
  end if;
  return new;
end; $$;
create trigger profiles_whitelist_on_signup
  before insert on public.profiles
  for each row execute function public.apply_whitelist_on_signup();

-- ─── retire the competing write path ─────────────────────────────────────────
-- With INSERT gated to trusted hosts, pending_review is unreachable, and this
-- flip would grant trust outside the whitelist. The state machine and enum
-- stay (dormant, V2 fallback).
drop trigger if exists events_flip_trust on public.events;
drop function if exists public.flip_host_trusted_on_publish();

-- ─── reset: the list starts empty and is the complete truth ──────────────────
update public.profiles set is_trusted = false where is_trusted;

-- ─── tighten events INSERT: only trusted hosts create events ─────────────────
drop policy events_insert_own on public.events;
create policy events_insert_trusted on public.events
  for insert to authenticated
  with check (host_id = auth.uid() and public.is_trusted_host());
