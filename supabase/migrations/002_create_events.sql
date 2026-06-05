-- 002_create_events.sql
-- Events table for the Rethink Events MVP.

create table public.events (
  id               uuid        primary key default gen_random_uuid(),
  created_by       uuid        not null references public.profiles(id),
  title            text        not null,
  description      text        not null,
  event_type       text        not null
                               check (event_type in ('online', 'offline')),
  meet_url         text,
  location_name    text,
  location_address text,
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  timezone         text        not null default 'Asia/Kolkata',
  capacity         integer
                               check (capacity is null or capacity >= 1),
  status           text        not null default 'pending'
                               check (status in ('pending', 'approved', 'rejected')),
  created_at       timestamptz not null default now(),

  constraint events_ends_after_starts check (ends_at > starts_at)
);

create index idx_events_status_starts_at on public.events (status, starts_at);
create index idx_events_created_by       on public.events (created_by);
