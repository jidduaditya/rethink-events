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

  insert into public.registrations (user_id, event_id, kind)
  values
    (v_user_id, 'a0000000-0000-0000-0000-000000000001', 'native'),
    (v_user_id, 'a0000000-0000-0000-0000-000000000002', 'native');

end;
$$;

-- ============================================================
-- V0 ADDITIONS — allowlist + v0 event fields
-- These statements run AFTER the block above so all ids exist.
-- ============================================================

-- --------------------------------------------------------
-- ALLOWLIST
-- Lets the login gate admit dev logins without a manual step.
-- The seeded profile (admin@rethink.dev) and the product owner
-- email are both included. on conflict = safe to re-run.
-- --------------------------------------------------------
insert into public.allowlist (email, source) values
  ('jiddu.aditya@gmail.com', 'manual'),
  ('admin@rethink.dev',       'manual')
on conflict (email) do nothing;

-- --------------------------------------------------------
-- ENRICH EVENTS WITH V0 DISPLAY FIELDS
-- --------------------------------------------------------

-- Event 1: online — no city (online events have no venue city)
-- Add speaker so the detail page has a real speaker block to click.
update public.events
   set speaker_name = 'Priya Nair',
       speaker_bio  = 'AI researcher at a Bangalore-based deep-tech startup. Building multi-agent systems since GPT-3.'
 where id = 'a0000000-0000-0000-0000-000000000001';

-- Event 2: offline Bangalore meetup — set city + speaker
update public.events
   set city         = 'Bangalore',
       speaker_name = 'Arjun Mehta',
       speaker_bio  = 'Founder, Stackwire. Shipped 4 products in the last 2 years. Talks about building in public.'
 where id = 'a0000000-0000-0000-0000-000000000002';

-- Event 3: past online AMA — no city needed; no speaker change
-- (no enrichment required — past events are low-priority for display)

-- Event 4: pending offline Mumbai — set city so it shows correctly if approved
update public.events
   set city = 'Mumbai'
 where id = 'a0000000-0000-0000-0000-000000000004';

-- Event 5: rejected — no enrichment needed

-- --------------------------------------------------------
-- ONE EXTERNAL-REGISTRATION EVENT
-- Flip event 1 (approved, future, online) to external so the
-- hybrid registration path is testable in dev.
-- Constraint: register_mode = 'external' requires register_url NOT NULL.
-- --------------------------------------------------------
update public.events
   set register_mode = 'external',
       register_url  = 'https://forms.gle/example-rethink-event'
 where id = 'a0000000-0000-0000-0000-000000000001';
