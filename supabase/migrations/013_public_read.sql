-- 013_public_read.sql
-- Public read access for approved events via a security-definer function.
-- Anon reads route exclusively through get_public_event().
-- No anon SELECT policy is added on profiles or registrations.

create or replace function public.get_public_event(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event        record;
  v_host_name    text;
  v_confirmed    integer;
begin
  -- Fetch the event; return null if not found or not approved.
  select *
    into v_event
    from public.events
   where id = p_event_id
     and status = 'approved';

  if not found then
    return null;
  end if;

  -- Fetch host display name from profiles (no anon policy needed --
  -- security definer runs as the function owner, not the caller).
  select full_name
    into v_host_name
    from public.profiles
   where id = v_event.created_by;

  -- Count confirmed registrations.
  select count(*)::integer
    into v_confirmed
    from public.registrations
   where event_id = p_event_id
     and status   = 'confirmed';

  return jsonb_build_object(
    'id',                   v_event.id,
    'title',                v_event.title,
    'description',          v_event.description,
    'event_type',           v_event.event_type,
    'starts_at',            v_event.starts_at,
    'ends_at',              v_event.ends_at,
    'timezone',             v_event.timezone,
    'capacity',             v_event.capacity,
    'city',                 null,
    'location_name',        v_event.location_name,
    'location_address',     v_event.location_address,
    'meet_url',             v_event.meet_url,
    'image_url',            null,
    'speaker_name',         null,
    'speaker_bio',          null,
    'speaker_photo_url',    null,
    'register_mode',        null,
    'status',               v_event.status,
    'cancelled_at',         null,
    'cancellation_reason',  null,
    'created_by',           v_event.created_by,
    'host_name',            coalesce(v_host_name, 'RETHINK'),
    'confirmed_count',      coalesce(v_confirmed, 0)
  );
end;
$$;

-- Grant execute to anon and authenticated roles so the public event page
-- and OG image route can call this function without auth.
grant execute on function public.get_public_event(uuid) to anon, authenticated;

-- Comment: no anon SELECT policy is added to events, profiles, or rsvps.
-- All anon reads of event data must go through get_public_event().
