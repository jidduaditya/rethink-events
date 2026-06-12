-- 011_registration_depth.sql
-- V1: Registration depth — status, registration_code, checked_in_at,
--     waitlist/cancel/promote/check-in/ticket RPCs, conflict-check read fn.
-- Human applies after 010_trust_and_lifecycle.sql is confirmed applied.

-- ─── 1. New columns on registrations ────────────────────────────────────────

alter table public.registrations
  add column status            text        not null default 'confirmed'
    check (status in ('confirmed', 'waitlisted', 'cancelled')),
  add column registration_code text        unique,
  add column checked_in_at     timestamptz;

-- ─── 2. Code generator ───────────────────────────────────────────────────────

-- generate_registration_code(): returns a collision-free unique 8-char code
-- from an unambiguous uppercase alphabet (no 0/O/1/I).

create or replace function public.generate_registration_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code     text;
  v_exists   boolean;
begin
  loop
    v_code := '';
    for i in 1..8 loop
      v_code := v_code ||
        substr(v_alphabet, floor(random() * length(v_alphabet))::int + 1, 1);
    end loop;
    select exists(
      select 1 from public.registrations where registration_code = v_code
    ) into v_exists;
    exit when not v_exists;
  end loop;
  return v_code;
end;
$$;

-- ─── 3. Backfill registration_code for all existing rows ─────────────────────

do $$
declare
  v_row      record;
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code     text;
  v_exists   boolean;
begin
  for v_row in
    select id from public.registrations where registration_code is null
  loop
    loop
      v_code := '';
      for i in 1..8 loop
        v_code := v_code ||
          substr(v_alphabet, floor(random() * length(v_alphabet))::int + 1, 1);
      end loop;
      select exists(
        select 1 from public.registrations where registration_code = v_code
      ) into v_exists;
      exit when not v_exists;
    end loop;
    update public.registrations
       set registration_code = v_code
     where id = v_row.id;
  end loop;
end;
$$;

-- Now enforce not-null after backfill.
alter table public.registrations
  alter column registration_code set not null;

-- ─── 4. Rework create_registration ───────────────────────────────────────────
--
-- Changes from V0:
--   - Capacity counts only 'confirmed' rows.
--   - Full  insert as 'waitlisted', return {success:true, state:'waitlisted', position:n, code}.
--   - Space  insert as 'confirmed', return {success:true, state:'confirmed', code}.
--   - Conflict rejection REMOVED (client handles via find_conflict).
--   - registration_code assigned on insert.
--   - Enforces: approved event, future event, no duplicate non-cancelled row.

create or replace function public.create_registration(p_user_id uuid, p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event         record;
  v_confirmed_cnt int;
  v_waitlist_pos  int;
  v_code          text;
  v_new_status    text;
  v_reg_id        uuid;
  v_kind          text;
begin
  -- Fetch event.
  select id, status, starts_at, capacity, register_mode
    into v_event
    from public.events
   where id = p_event_id;

  if not found then
    return jsonb_build_object('success', false, 'reason', 'not_found');
  end if;

  -- Must be approved.
  if v_event.status <> 'approved' then
    return jsonb_build_object('success', false, 'reason', 'not_approved');
  end if;

  -- Must be in the future.
  if v_event.starts_at <= now() then
    return jsonb_build_object('success', false, 'reason', 'past');
  end if;

  -- Prevent duplicate non-cancelled registration.
  if exists (
    select 1 from public.registrations
     where user_id  = p_user_id
       and event_id = p_event_id
       and status  <> 'cancelled'
  ) then
    return jsonb_build_object('success', false, 'reason', 'already_registered');
  end if;

  -- Count only 'confirmed' rows for capacity enforcement.
  select count(*) into v_confirmed_cnt
    from public.registrations
   where event_id = p_event_id
     and status   = 'confirmed';

  -- Determine new status.
  if v_event.capacity is not null and v_confirmed_cnt >= v_event.capacity then
    v_new_status := 'waitlisted';
  else
    v_new_status := 'confirmed';
  end if;

  -- Determine kind.
  v_kind := case when v_event.register_mode = 'external' then 'external' else 'native' end;

  -- Generate registration code.
  v_code := public.generate_registration_code();

  -- Insert registration.
  insert into public.registrations (user_id, event_id, kind, status, registration_code)
  values (p_user_id, p_event_id, v_kind, v_new_status, v_code)
  returning id into v_reg_id;

  -- Return based on status.
  if v_new_status = 'waitlisted' then
    -- Position = number of waitlisted rows with created_at <= this row's created_at.
    select count(*) into v_waitlist_pos
      from public.registrations r2
      join public.registrations r3 on r3.id = v_reg_id
     where r2.event_id    = p_event_id
       and r2.status      = 'waitlisted'
       and r2.created_at <= r3.created_at;

    return jsonb_build_object(
      'success',  true,
      'state',    'waitlisted',
      'position', v_waitlist_pos,
      'code',     v_code,
      'kind',     v_kind
    );
  else
    return jsonb_build_object(
      'success', true,
      'state',   'confirmed',
      'code',    v_code,
      'kind',    v_kind
    );
  end if;
end;
$$;

-- ─── 5. find_conflict ────────────────────────────────────────────────────────
--
-- Returns the title of the first confirmed registration that time-overlaps
-- with the given event for the given user. Returns null if no conflict.
-- Used client-side only (the server no longer rejects on conflict).

create or replace function public.find_conflict(p_user_id uuid, p_event_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target   record;
  v_conflict text;
begin
  select starts_at, ends_at into v_target
    from public.events
   where id = p_event_id;

  if not found then
    return null;
  end if;

  select e.title into v_conflict
    from public.registrations r
    join public.events e on e.id = r.event_id
   where r.user_id    = p_user_id
     and r.status     = 'confirmed'
     and r.event_id  <> p_event_id
     and e.starts_at  < v_target.ends_at
     and e.ends_at    > v_target.starts_at
   limit 1;

  return v_conflict;
end;
$$;

-- ─── 6. promote_from_waitlist ────────────────────────────────────────────────
--
-- Promotes the oldest waitlisted registration to 'confirmed'.
-- Returns the promoted row as jsonb (or null if no waitlist).
-- Called inside cancel_my_registration and host_remove_registration.

create or replace function public.promote_from_waitlist(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reg record;
begin
  select id, user_id, registration_code
    into v_reg
    from public.registrations
   where event_id = p_event_id
     and status   = 'waitlisted'
   order by created_at asc
   limit 1
   for update skip locked;

  if not found then
    return null;
  end if;

  update public.registrations
     set status = 'confirmed'
   where id = v_reg.id;

  return jsonb_build_object(
    'id',                v_reg.id,
    'user_id',           v_reg.user_id,
    'registration_code', v_reg.registration_code
  );
end;
$$;

-- ─── 7. cancel_my_registration ───────────────────────────────────────────────
--
-- Owner cancels their own registration; only for future events.
-- Atomically calls promote_from_waitlist after cancellation.
-- Returns {success, promoted} where promoted is the promoted row or null.

create or replace function public.cancel_my_registration(p_registration_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reg      record;
  v_starts_at timestamptz;
  v_promoted  jsonb;
begin
  select id, user_id, event_id, status
    into v_reg
    from public.registrations
   where id = p_registration_id;

  if not found then
    return jsonb_build_object('success', false, 'reason', 'not_found');
  end if;

  -- Caller must own this registration.
  if v_reg.user_id <> auth.uid() then
    return jsonb_build_object('success', false, 'reason', 'not_authorized');
  end if;

  -- Must not already be cancelled.
  if v_reg.status = 'cancelled' then
    return jsonb_build_object('success', false, 'reason', 'already_cancelled');
  end if;

  -- Event must be in the future.
  select starts_at into v_starts_at
    from public.events
   where id = v_reg.event_id;

  if v_starts_at <= now() then
    return jsonb_build_object('success', false, 'reason', 'event_started');
  end if;

  -- Cancel the registration.
  update public.registrations
     set status = 'cancelled'
   where id = p_registration_id;

  -- Promote the oldest waitlisted registrant.
  v_promoted := public.promote_from_waitlist(v_reg.event_id);

  return jsonb_build_object(
    'success',  true,
    'promoted', v_promoted
  );
end;
$$;

-- ─── 8. host_remove_registration ─────────────────────────────────────────────
--
-- Event creator (or admin) sets a registration to 'cancelled'.
-- Replaces direct DELETE for host removals so promotion runs atomically.
-- Migration 009 host-delete policy is kept as defense-in-depth.

create or replace function public.host_remove_registration(p_registration_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reg        record;
  v_created_by uuid;
  v_caller_role text;
  v_promoted   jsonb;
begin
  select id, user_id, event_id, status
    into v_reg
    from public.registrations
   where id = p_registration_id;

  if not found then
    return jsonb_build_object('success', false, 'reason', 'not_found');
  end if;

  -- Fetch the event creator.
  select created_by into v_created_by
    from public.events
   where id = v_reg.event_id;

  -- Fetch caller role.
  select role into v_caller_role
    from public.profiles
   where id = auth.uid();

  -- Must be event creator or admin.
  if v_created_by <> auth.uid() and v_caller_role <> 'admin' then
    return jsonb_build_object('success', false, 'reason', 'not_authorized');
  end if;

  -- Cancel the registration.
  update public.registrations
     set status = 'cancelled'
   where id = p_registration_id;

  -- Promote from waitlist.
  v_promoted := public.promote_from_waitlist(v_reg.event_id);

  return jsonb_build_object(
    'success',  true,
    'promoted', v_promoted
  );
end;
$$;

-- ─── 9. set_check_in ─────────────────────────────────────────────────────────
--
-- Event creator toggles checked_in_at for a confirmed attendee.
-- Valid window: starts_at <= now() <= ends_at + 24h.

create or replace function public.set_check_in(p_registration_id uuid, p_checked_in boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reg   record;
  v_event record;
begin
  select id, event_id, status
    into v_reg
    from public.registrations
   where id = p_registration_id;

  if not found then
    return jsonb_build_object('success', false, 'reason', 'not_found');
  end if;

  select id, created_by, starts_at, ends_at
    into v_event
    from public.events
   where id = v_reg.event_id;

  -- Caller must be event creator.
  if v_event.created_by <> auth.uid() then
    return jsonb_build_object('success', false, 'reason', 'not_authorized');
  end if;

  -- Check-in window: starts_at <= now() <= ends_at + 24h.
  if now() < v_event.starts_at then
    return jsonb_build_object('success', false, 'reason', 'event_not_started');
  end if;

  if now() > v_event.ends_at + interval '24 hours' then
    return jsonb_build_object('success', false, 'reason', 'window_closed');
  end if;

  -- Only confirmed registrants can be checked in.
  if v_reg.status <> 'confirmed' then
    return jsonb_build_object('success', false, 'reason', 'not_confirmed');
  end if;

  update public.registrations
     set checked_in_at = case when p_checked_in then now() else null end
   where id = p_registration_id;

  return jsonb_build_object('success', true);
end;
$$;

-- ─── 10. get_ticket ──────────────────────────────────────────────────────────
--
-- Security-definer bearer-link lookup — safe for anon callers.
-- Returns event title/time/venue, first name, registration status and code.
-- Returns null if the code does not exist.

create or replace function public.get_ticket(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result           jsonb;
  v_event_id         uuid;
  v_waitlist_position int;
  v_reg_created_at   timestamptz;
begin
  select
    jsonb_build_object(
      'event_id',          e.id,
      'event_title',       e.title,
      'starts_at',         e.starts_at,
      'ends_at',           e.ends_at,
      'timezone',          e.timezone,
      'venue',             coalesce(e.location_name, 'ONLINE'),
      'city',              e.city,
      'first_name',        split_part(p.full_name, ' ', 1),
      'status',            r.status,
      'registration_code', r.registration_code,
      'waitlist_position', null::int
    ),
    e.id,
    r.created_at
    into v_result, v_event_id, v_reg_created_at
    from public.registrations r
    join public.events         e on e.id = r.event_id
    join public.profiles       p on p.id = r.user_id
   where r.registration_code = p_code;

  if not found then
    return null;
  end if;

  -- If waitlisted, compute queue position (1-indexed oldest-first).
  if (v_result ->> 'status') = 'waitlisted' then
    select count(*) into v_waitlist_position
      from public.registrations
     where event_id   = v_event_id
       and status     = 'waitlisted'
       and created_at <= v_reg_created_at;

    v_result := v_result || jsonb_build_object('waitlist_position', v_waitlist_position);
  end if;

  return v_result;
end;
$$;

-- ─── 11. RLS updates ─────────────────────────────────────────────────────────

-- Registrants cannot UPDATE the registrations table directly;
-- all state changes go through the RPCs above.
-- (No new UPDATE policy is added.)

-- Allow authenticated users to SELECT their own registrations.
-- (The existing V0 policies only cover the rsvps table; these cover registrations.)
create policy "registrations: owner select own"
  on public.registrations for select
  to authenticated
  using (user_id = auth.uid());

-- Allow authenticated users to read any registration row (needed for host panel
-- to display attendee list). get_ticket uses security-definer and bypasses RLS.
create policy "registrations: authenticated read all"
  on public.registrations for select
  to authenticated
  using (true);
