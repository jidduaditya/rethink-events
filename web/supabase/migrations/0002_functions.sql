-- 0002_functions.sql — helpers, triggers, and the RPC write paths.
-- All SECURITY DEFINER functions pin search_path to '' and schema-qualify.

-- ─── admin check (usable inside RLS policies) ────────────────────────────────
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ─── auto-create a profile row on signup ─────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email);
  return new;
end; $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── keep events.updated_at fresh ────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end; $$;
create trigger events_touch_updated_at
  before update on public.events
  for each row execute function public.touch_updated_at();

-- ─── set initial event state + denormalized host_name on insert ──────────────
-- Trusted host → published immediately; everyone else → pending_review.
-- SECURITY NOTES:
--   host_name is always pulled from the profile (never from the insert payload)
--   to prevent identity spoofing.
--   State is always enforced for non-admins (not just when new.state='draft')
--   to prevent review-queue bypass (sending state='published' directly).
create or replace function public.set_event_initial_state()
returns trigger language plpgsql security definer set search_path = '' as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = new.host_id;
  -- Always derive from profile; never trust the caller-supplied value.
  new.host_name := p.full_name;
  -- Enforce trust-based state only for authenticated non-admin users.
  -- Service role and admins may supply explicit state (migrations, seeding, tests).
  -- Use auth.role() not auth.uid() — both service_role and anon have uid=null,
  -- but anon callers must still be subject to state enforcement.
  if auth.role() <> 'service_role' and not public.is_admin() then
    new.state := case when p.is_trusted then 'published'::public.event_state
                      else 'pending_review'::public.event_state end;
  end if;
  return new;
end; $$;
create trigger events_initial_state
  before insert on public.events
  for each row execute function public.set_event_initial_state();

-- ─── guard event updates — state machine + immutable fields ─────────────────
-- Admins may make any transition and change any field.
-- Non-admin hosts:
--   - may only transition published → cancelled (their own event)
--   - may NOT change host_id (ownership reassignment)
--   - may NOT change host_name (the trigger always sets it from profile, but
--     a second update attempt by the host after initial insert also goes here)
create or replace function public.guard_event_transition()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Service role bypasses all guards (migrations, seeding, server-side admin).
  -- auth.role() distinguishes service_role from anon — both have uid=null,
  -- but anon callers must still be subject to the transition guard.
  if auth.role() <> 'service_role' and not public.is_admin() then
    -- Block ownership reassignment.
    if new.host_id is distinct from old.host_id then
      raise exception 'cannot reassign event ownership';
    end if;
    -- Block host_name spoofing on update.
    if new.host_name is distinct from old.host_name then
      raise exception 'cannot change host display name directly';
    end if;
    -- State machine: only published → cancelled is permitted for non-admins.
    if new.state is distinct from old.state then
      if not (old.state = 'published' and new.state = 'cancelled') then
        raise exception 'illegal state transition % -> % (non-admin)', old.state, new.state;
      end if;
    end if;
  end if;
  return new;
end; $$;
create trigger events_guard_transition
  before update on public.events
  for each row execute function public.guard_event_transition();

-- ─── flip host to trusted when their pending event is approved ───────────────
create or replace function public.flip_host_trusted_on_publish()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.state = 'published' and old.state = 'pending_review' then
    update public.profiles set is_trusted = true
     where id = new.host_id and is_trusted = false;
  end if;
  return new;
end; $$;
create trigger events_flip_trust
  after update on public.events
  for each row execute function public.flip_host_trusted_on_publish();

-- ─── protect trust/admin flags from self-elevation ───────────────────────────
-- Authenticated non-admins cannot change is_trusted/is_admin on any row.
-- Service-role / server contexts (auth.uid() is null) and admins are allowed.
create or replace function public.protect_profile_flags()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.is_trusted is distinct from old.is_trusted
       or new.is_admin is distinct from old.is_admin then
      raise exception 'cannot modify trust/admin flags';
    end if;
  end if;
  return new;
end; $$;
create trigger profiles_protect_flags
  before update on public.profiles
  for each row execute function public.protect_profile_flags();

-- ─── atomic, capacity-checked RSVP (harvested pattern, conflict-check removed) ─
-- Direct INSERT into rsvps is blocked by RLS; callers go through this.
create or replace function public.rsvp_to_event(p_event_id uuid)
returns public.rsvps language plpgsql security definer set search_path = '' as $$
declare e public.events; cnt int; r public.rsvps;
begin
  select * into e from public.events where id = p_event_id for update;
  if not found or e.state <> 'published' then raise exception 'event not open'; end if;
  if e.starts_at <= now() then raise exception 'event has started'; end if;
  if e.capacity is not null then
    select count(*) into cnt from public.rsvps
      where event_id = p_event_id and status = 'going';
    if cnt >= e.capacity then raise exception 'event full'; end if;
  end if;
  insert into public.rsvps (event_id, user_id) values (p_event_id, auth.uid())
    on conflict (event_id, user_id) do update set status = 'going'
    returning * into r;
  return r;
end; $$;

-- ─── cohort social proof: members matching my goal+level+city who are going ───
create or replace function public.cohort_going_count(p_event_id uuid)
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int
    from public.rsvps r
    join public.profiles p  on p.id  = r.user_id
    join public.profiles me on me.id = auth.uid()
   where r.event_id = p_event_id and r.status = 'going'
     and p.goal = me.goal and p.level = me.level and p.city = me.city
     and p.id <> me.id;
$$;

-- ─── attendee list for the host run-view (host/admin only) ───────────────────
create or replace function public.event_attendees(p_event_id uuid)
returns table (user_id uuid, full_name text, checked_in boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.events e
     where e.id = p_event_id and (e.host_id = auth.uid() or public.is_admin())
  ) then
    raise exception 'not authorized';
  end if;
  return query
    select r.user_id, p.full_name, r.checked_in
      from public.rsvps r join public.profiles p on p.id = r.user_id
     where r.event_id = p_event_id and r.status = 'going'
     order by p.full_name;
end; $$;
