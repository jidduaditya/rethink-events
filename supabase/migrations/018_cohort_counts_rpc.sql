-- 018_cohort_counts_rpc.sql
-- Returns per-event count of confirmed registrants whose profile matches
-- the caller's goal, level, and city. Used for "N from your cohort" display.

create or replace function public.get_cohort_counts(
  p_event_ids uuid[],
  p_goal      text,
  p_level     text,
  p_city      text
)
returns table(event_id uuid, cohort_count bigint)
language sql
security definer
set search_path = ''
as $$
  select r.event_id, count(*)::bigint as cohort_count
  from public.registrations r
  join public.profiles p on p.id = r.user_id
  where r.event_id = any(p_event_ids)
    and r.status = 'confirmed'
    and p.goal  = p_goal
    and p.level = p_level
    and p.city  = p_city
  group by r.event_id;
$$;
