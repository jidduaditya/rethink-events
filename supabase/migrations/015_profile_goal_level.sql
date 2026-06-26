-- 015_profile_goal_level.sql
-- Adds goal and level to profiles for relevance filtering ("For you" row).
-- Both nullable so existing rows are not broken.

alter table public.profiles
  add column goal text check (goal in (
    'break_into_pm',
    'grow_as_pm',
    'build_products',
    'ai_pm',
    'interview_prep'
  )),
  add column level text check (level in (
    'aspiring',
    'early',
    'mid',
    'senior'
  ));
