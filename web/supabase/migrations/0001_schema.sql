-- 0001_schema.sql — ReThink Events V1 data model.
-- Tables: profiles, events, rsvps, feedback. RLS is added in 0003; functions in 0002.

-- ─── enums ──────────────────────────────────────────────────────────────────
create type city        as enum ('bangalore','pune','delhi','hyderabad');
create type event_tag   as enum ('beginner','interview_prep','ai_pm','build','resume');
create type event_state as enum ('draft','pending_review','published','cancelled','taken_down');
-- goal/level values are an OPEN QUESTION (team to confirm). Sensible defaults below.
create type member_goal  as enum ('break_into_pm','interview_prep','level_up','build_with_ai','switch_domain');
create type member_level as enum ('aspiring','junior','mid','senior');

-- ─── profiles (extends auth.users) ──────────────────────────────────────────
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  email      text not null,
  goal       member_goal,
  level      member_level,
  city       city,
  is_trusted boolean not null default false,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─── events ─────────────────────────────────────────────────────────────────
-- host_name is denormalized from profiles so anon public pages + the OG image
-- render the host without any read access to profiles (keeps profiles locked down).
create table public.events (
  id               uuid primary key default gen_random_uuid(),
  host_id          uuid not null references public.profiles(id),
  host_name        text,
  title            text not null,
  description      text,
  city             city not null,
  venue            text,
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  capacity         int check (capacity is null or capacity > 0),
  tags             event_tag[] not null default '{}',
  state            event_state not null default 'draft',
  featured_for     jsonb,                 -- admin hand-pick {goal,level,city}; null = not featured
  broadcast_message text,
  broadcast_sent_at timestamptz,
  reminded_at      timestamptz,           -- 24h reminder idempotency (slice 3.8)
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint events_ends_after_starts check (ends_at > starts_at)
);
create index idx_events_state_starts on public.events (state, starts_at);
create index idx_events_city_state   on public.events (city, state);
create index idx_events_host         on public.events (host_id);

-- ─── rsvps ──────────────────────────────────────────────────────────────────
create table public.rsvps (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'going' check (status in ('going','cancelled')),
  checked_in boolean not null default false,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);
create index idx_rsvps_event on public.rsvps (event_id);
create index idx_rsvps_user  on public.rsvps (user_id);

-- ─── feedback (binary thumbs + optional note; host/admin-only) ───────────────
create table public.feedback (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  thumbs_up  boolean not null,
  note       text,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);
create index idx_feedback_event on public.feedback (event_id);
