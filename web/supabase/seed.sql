-- seed.sql — development seed for ReThink Events V1.
-- Apply AFTER migrations. Replace the UUIDs with real auth.users ids
-- from your Supabase dashboard (Auth → Users) or create them via the app.
--
-- Usage:
--   supabase db seed  (if using local)
--   or paste into the Supabase SQL editor against your hosted project.

do $$
declare
  v_admin_id   uuid := '00000000-0000-0000-0000-000000000001';
  v_trusted_id uuid := '00000000-0000-0000-0000-000000000002';
  v_host_id    uuid := '00000000-0000-0000-0000-000000000003';
begin

  -- Profiles (the trigger creates these automatically in production;
  -- for seed we insert directly because auth.users isn't seeded here).
  insert into public.profiles (id, full_name, email, is_admin, is_trusted, goal, level, city)
  values
    (v_admin_id,   'Seed Admin',        'admin@rethink.dev',   true,  true,  'level_up',       'senior', 'bangalore'),
    (v_trusted_id, 'Trusted Host',      'trusted@rethink.dev', false, true,  'build_with_ai',  'mid',    'pune'),
    (v_host_id,    'First-Time Host',   'host@rethink.dev',    false, false, 'break_into_pm',  'junior', 'delhi')
  on conflict (id) do nothing;

  -- Events (inserted directly so we can control state;
  -- in production the initial-state trigger sets state from trust).
  insert into public.events
    (id, host_id, host_name, title, description, city, venue, starts_at, ends_at, capacity, tags, state)
  values
    (
      'e0000000-0000-0000-0000-000000000001', v_trusted_id, 'Trusted Host',
      'Intro to Building with AI Agents',
      'A beginner-friendly walkthrough of agent architectures, tool use, and prompt design. Bring your laptop.',
      'bangalore', 'Koramangala Social',
      now() + interval '7 days', now() + interval '7 days 2 hours',
      40, array['ai_pm','beginner']::event_tag[], 'published'
    ),
    (
      'e0000000-0000-0000-0000-000000000002', v_trusted_id, 'Trusted Host',
      'PM Interview Bootcamp',
      'Mock interviews, framework walkthroughs, and honest feedback. Intermediate+.',
      'pune', 'WeWork Baner',
      now() + interval '14 days', now() + interval '14 days 3 hours',
      30, array['interview_prep']::event_tag[], 'published'
    ),
    (
      'e0000000-0000-0000-0000-000000000003', v_admin_id, 'Seed Admin',
      'Resume Teardown: Real PMs, Real Feedback',
      'Submit your resume before the session. We tear it apart (nicely) live.',
      'hyderabad', 'T-Hub',
      now() + interval '3 days', now() + interval '3 days 90 minutes',
      25, array['resume','beginner']::event_tag[], 'published'
    ),
    (
      'e0000000-0000-0000-0000-000000000004', v_host_id, 'First-Time Host',
      'Side Projects: Getting Out of the Building',
      'How to validate a product idea in a weekend.',
      'delhi', '91springboard Okhla',
      now() + interval '21 days', now() + interval '21 days 2 hours',
      null, array['build']::event_tag[], 'pending_review'
    )
  on conflict (id) do nothing;

end; $$;
