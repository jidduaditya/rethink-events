-- 017_featured_for.sql
-- Adds admin hand-pick targeting to events.
-- All three columns must be non-null for the feature to activate.

alter table public.events
  add column featured_for_goal  text check (featured_for_goal in (
    'break_into_pm', 'grow_as_pm', 'build_products', 'ai_pm', 'interview_prep'
  )),
  add column featured_for_level text check (featured_for_level in (
    'aspiring', 'early', 'mid', 'senior'
  )),
  add column featured_for_city  text;
