-- 003_create_rsvps.sql
-- RSVPs table and transactional create_rsvp function for the Rethink Events MVP.

create table public.rsvps (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id),
  event_id   uuid        not null references public.events(id),
  created_at timestamptz not null default now(),

  constraint rsvps_unique_user_event unique (user_id, event_id)
);

create index idx_rsvps_user_id  on public.rsvps (user_id);
create index idx_rsvps_event_id on public.rsvps (event_id);

-- Transactional RSVP creation with validation, conflict detection, and capacity check.
-- Uses SELECT FOR UPDATE on the event row to prevent race conditions.
create or replace function public.create_rsvp(p_user_id uuid, p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event       record;
  v_rsvp_count  integer;
  v_conflict     boolean;
begin
  -- Lock the event row to prevent concurrent capacity races.
  select id, status, starts_at, ends_at, capacity
    into v_event
    from public.events
   where id = p_event_id
   for update;

  if not found then
    return jsonb_build_object('success', false, 'reason', 'not_approved');
  end if;

  -- 1. Event must be approved.
  if v_event.status <> 'approved' then
    return jsonb_build_object('success', false, 'reason', 'not_approved');
  end if;

  -- 2. Event must not have already started.
  if v_event.starts_at <= now() then
    return jsonb_build_object('success', false, 'reason', 'past');
  end if;

  -- 3. Check time overlap with user's existing RSVPs.
  --    Boundary-sharing (one ends exactly when another starts) does NOT conflict.
  select exists (
    select 1
      from public.rsvps r
      join public.events e on e.id = r.event_id
     where r.user_id = p_user_id
       and e.status  = 'approved'
       and e.starts_at < v_event.ends_at
       and e.ends_at   > v_event.starts_at
  ) into v_conflict;

  if v_conflict then
    return jsonb_build_object('success', false, 'reason', 'conflict');
  end if;

  -- 4. Capacity check (only when capacity is set).
  if v_event.capacity is not null then
    select count(*)
      into v_rsvp_count
      from public.rsvps
     where event_id = p_event_id;

    if v_rsvp_count >= v_event.capacity then
      return jsonb_build_object('success', false, 'reason', 'full');
    end if;
  end if;

  -- 5. Insert the RSVP.
  insert into public.rsvps (user_id, event_id)
  values (p_user_id, p_event_id);

  return jsonb_build_object('success', true);
end;
$$;
