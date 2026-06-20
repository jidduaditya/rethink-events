-- 010_trust_and_lifecycle.sql
-- V1: trusted-host publishing model and event lifecycle (cancelled state).
-- Human applies after feat/events-v0 is merged and migrations 001-009 are confirmed applied.

-- 1. Trusted-host flag on profiles.
--    First event approval flips this true; future events publish instantly.
alter table public.profiles
  add column trusted_host boolean not null default false;

-- 2. Extend events.status check constraint to include 'cancelled'.
--    The constraint is inline and auto-named; find it by predicate, drop, recreate named.
do $$
declare
  v_conname text;
begin
  for v_conname in
    select conname
      from pg_constraint
     where conrelid = 'public.events'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute 'alter table public.events drop constraint ' || quote_ident(v_conname);
  end loop;
end;
$$;

alter table public.events
  add constraint events_status_check
  check (status in ('pending', 'approved', 'rejected', 'cancelled'));

-- 3. Lifecycle columns.
alter table public.events
  add column cancelled_at        timestamptz,
  add column cancellation_reason text,
  add column reminder_sent_at    timestamptz;

-- 4. Before-insert trigger: override status based on creator's trust.
--    Trusted hosts and admins publish immediately; first-timers go to review.
create or replace function public.set_event_status_on_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role    text;
  v_trusted boolean;
begin
  select role, trusted_host
    into v_role, v_trusted
    from public.profiles
   where id = new.created_by;

  if v_role = 'admin' or v_trusted = true then
    new.status := 'approved';
  else
    new.status := 'pending';
  end if;

  return new;
end;
$$;

create trigger set_event_status_before_insert
  before insert on public.events
  for each row
  execute function public.set_event_status_on_insert();

-- 5. approve_event(event_id): admin-only, atomic approve + trust grant.
create or replace function public.approve_event(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_role text;
  v_creator_id  uuid;
begin
  select role into v_caller_role
    from public.profiles
   where id = auth.uid();

  if v_caller_role <> 'admin' then
    return jsonb_build_object('success', false, 'reason', 'not_admin');
  end if;

  select created_by into v_creator_id
    from public.events
   where id = p_event_id
     and status = 'pending';

  if not found then
    return jsonb_build_object('success', false, 'reason', 'not_pending');
  end if;

  update public.events
     set status = 'approved'
   where id = p_event_id;

  update public.profiles
     set trusted_host = true
   where id = v_creator_id;

  return jsonb_build_object('success', true);
end;
$$;

-- 6. cancel_event(event_id, reason): host or admin, approved future events only.
--    Returns registrant emails so the app layer can fan out cancellation emails.
create or replace function public.cancel_event(p_event_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_role       text;
  v_event             record;
  v_registrant_emails jsonb;
begin
  select role into v_caller_role
    from public.profiles
   where id = auth.uid();

  select id, created_by, status, starts_at
    into v_event
    from public.events
   where id = p_event_id;

  if not found then
    return jsonb_build_object('success', false, 'reason', 'not_found');
  end if;

  if v_caller_role <> 'admin' and v_event.created_by <> auth.uid() then
    return jsonb_build_object('success', false, 'reason', 'not_authorized');
  end if;

  if v_event.status <> 'approved' then
    return jsonb_build_object('success', false, 'reason', 'not_approved');
  end if;

  if v_event.starts_at <= now() then
    return jsonb_build_object('success', false, 'reason', 'already_started');
  end if;

  select jsonb_agg(p.email)
    into v_registrant_emails
    from public.registrations r
    join public.profiles p on p.id = r.user_id
   where r.event_id = p_event_id;

  update public.events
     set status              = 'cancelled',
         cancelled_at        = now(),
         cancellation_reason = p_reason
   where id = p_event_id;

  return jsonb_build_object(
    'success', true,
    'registrant_emails', coalesce(v_registrant_emails, '[]'::jsonb)
  );
end;
$$;

-- 7. set_trusted_host(user_id, trusted): admin-only trust grant/revoke.
create or replace function public.set_trusted_host(p_user_id uuid, p_trusted boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_role text;
begin
  select role into v_caller_role
    from public.profiles
   where id = auth.uid();

  if v_caller_role <> 'admin' then
    return jsonb_build_object('success', false, 'reason', 'not_admin');
  end if;

  update public.profiles
     set trusted_host = p_trusted
   where id = p_user_id;

  if not found then
    return jsonb_build_object('success', false, 'reason', 'not_found');
  end if;

  return jsonb_build_object('success', true);
end;
$$;
