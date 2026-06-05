-- seed.sql
-- Development seed data for the Rethink Events MVP.
-- Run after creating auth users manually or via the app.
--
-- Replace the placeholder UUID below with an actual auth user id
-- from your local Supabase instance (check auth.users table).

-- Placeholder user id. Change this to match a real auth user.
do $$
declare
  v_user_id uuid := '00000000-0000-0000-0000-000000000001';
begin

  -- Ensure a matching profile exists for seeding.
  -- In production the trigger creates this automatically.
  insert into public.profiles (id, full_name, email, role, city)
  values (v_user_id, 'Seed Admin', 'admin@rethink.dev', 'admin', 'Bangalore')
  on conflict (id) do nothing;

  -- --------------------------------------------------------
  -- EVENTS
  -- --------------------------------------------------------

  -- 1. Approved upcoming online event (in 7 days, 2h duration)
  insert into public.events (id, created_by, title, description, event_type, meet_url, starts_at, ends_at, capacity, status)
  values (
    'a0000000-0000-0000-0000-000000000001',
    v_user_id,
    'Intro to Building with AI Agents',
    'A beginner-friendly walkthrough of agent architectures, tool use, and prompt design.',
    'online',
    'https://meet.google.com/abc-defg-hij',
    now() + interval '7 days',
    now() + interval '7 days 2 hours',
    100,
    'approved'
  );

  -- 2. Approved upcoming offline event (in 14 days, 3h duration)
  insert into public.events (id, created_by, title, description, event_type, location_name, location_address, starts_at, ends_at, capacity, status)
  values (
    'a0000000-0000-0000-0000-000000000002',
    v_user_id,
    'Bangalore Builder Meetup #1',
    'First in-person meetup for builders in Bangalore. Demos, lightning talks, and chai.',
    'offline',
    'Foxtrot Koramangala',
    '80 Feet Road, Koramangala, Bangalore 560034',
    now() + interval '14 days',
    now() + interval '14 days 3 hours',
    40,
    'approved'
  );

  -- 3. Approved past event (ended 3 days ago)
  insert into public.events (id, created_by, title, description, event_type, meet_url, starts_at, ends_at, status)
  values (
    'a0000000-0000-0000-0000-000000000003',
    v_user_id,
    'AMA: Shipping Side Projects',
    'Candid conversation about getting side projects out the door.',
    'online',
    'https://meet.google.com/xyz-uvwx-rst',
    now() - interval '3 days 2 hours',
    now() - interval '3 days',
    'approved'
  );

  -- 4. Pending event (awaiting admin approval)
  insert into public.events (id, created_by, title, description, event_type, location_name, location_address, starts_at, ends_at, capacity, status)
  values (
    'a0000000-0000-0000-0000-000000000004',
    v_user_id,
    'Design Systems Workshop',
    'Hands-on workshop building a design system from scratch with Figma and code.',
    'offline',
    'WeWork BKC',
    'Bandra Kurla Complex, Mumbai 400051',
    now() + interval '21 days',
    now() + interval '21 days 4 hours',
    30,
    'pending'
  );

  -- 5. Rejected event
  insert into public.events (id, created_by, title, description, event_type, meet_url, starts_at, ends_at, status)
  values (
    'a0000000-0000-0000-0000-000000000005',
    v_user_id,
    'Crypto Airdrop Farming 101',
    'Not aligned with community focus. Rejected by admin.',
    'online',
    'https://meet.google.com/nop-qrst-uvw',
    now() + interval '10 days',
    now() + interval '10 days 1 hour',
    'rejected'
  );

  -- --------------------------------------------------------
  -- RSVPS (only for approved upcoming events)
  -- --------------------------------------------------------

  insert into public.rsvps (user_id, event_id)
  values
    (v_user_id, 'a0000000-0000-0000-0000-000000000001'),
    (v_user_id, 'a0000000-0000-0000-0000-000000000002');

end;
$$;
