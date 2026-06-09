-- 007_create_registrations.sql
-- Generalizes the native-only rsvps table into one registrations table.
-- kind = 'native'   -> our guest list (capacity + conflict enforced)
-- kind = 'external' -> intent log before redirecting to an external register_url

create table public.registrations (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id),
  event_id   uuid        not null references public.events(id),
  kind       text        not null check (kind in ('native', 'external')),
  created_at timestamptz not null default now(),
  constraint registrations_unique_user_event unique (user_id, event_id)
);

create index idx_registrations_user_id  on public.registrations (user_id);
create index idx_registrations_event_id on public.registrations (event_id);

-- Backfill every existing RSVP as a native registration.
insert into public.registrations (id, user_id, event_id, kind, created_at)
select id, user_id, event_id, 'native', created_at from public.rsvps;

-- Single entry point. Branches on the event's register_mode.
-- Native: full transactional validation (approved, not past, no time conflict, capacity).
-- External: only requires approved + not past, then logs intent (no conflict/capacity).
create or replace function public.create_registration(p_user_id uuid, p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event      record;
  v_rsvp_count integer;
  v_conflict   boolean;
begin
  select id, status, starts_at, ends_at, capacity, register_mode
    into v_event
    from public.events
   where id = p_event_id
   for update;

  if not found then
    return jsonb_build_object('success', false, 'reason', 'not_approved');
  end if;

  if v_event.status <> 'approved' then
    return jsonb_build_object('success', false, 'reason', 'not_approved');
  end if;

  if v_event.starts_at <= now() then
    return jsonb_build_object('success', false, 'reason', 'past');
  end if;

  -- External: log intent and return. No conflict/capacity checks.
  if v_event.register_mode = 'external' then
    insert into public.registrations (user_id, event_id, kind)
    values (p_user_id, p_event_id, 'external')
    on conflict (user_id, event_id) do nothing;
    return jsonb_build_object('success', true, 'kind', 'external');
  end if;

  -- Native path: time-conflict check against the user's other native registrations.
  select exists (
    select 1
      from public.registrations r
      join public.events e on e.id = r.event_id
     where r.user_id = p_user_id
       and r.kind    = 'native'
       and e.status  = 'approved'
       and e.starts_at < v_event.ends_at
       and e.ends_at   > v_event.starts_at
  ) into v_conflict;

  if v_conflict then
    return jsonb_build_object('success', false, 'reason', 'conflict');
  end if;

  if v_event.capacity is not null then
    select count(*) into v_rsvp_count
      from public.registrations
     where event_id = p_event_id and kind = 'native';
    if v_rsvp_count >= v_event.capacity then
      return jsonb_build_object('success', false, 'reason', 'full');
    end if;
  end if;

  insert into public.registrations (user_id, event_id, kind)
  values (p_user_id, p_event_id, 'native');

  return jsonb_build_object('success', true, 'kind', 'native');
end;
$$;

alter table public.registrations enable row level security;

create policy "registrations: select for authenticated"
  on public.registrations for select
  to authenticated
  using (true);

create policy "registrations: delete own"
  on public.registrations for delete
  to authenticated
  using (user_id = auth.uid());

-- Direct INSERT blocked; use create_registration().
