-- 016_event_tags.sql
-- Adds a single optional tag to events for relevance filtering ("For you" row).

alter table public.events
  add column tag text check (tag in (
    'beginner',
    'interview-prep',
    'ai-pm',
    'build',
    'resume'
  ));
