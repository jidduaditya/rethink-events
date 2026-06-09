-- 006_events_v0_fields.sql
-- V0 event fields: photo, city (for filtering), speaker block, hybrid registration.

alter table public.events
  add column image_url        text,
  add column city             text,
  add column speaker_name     text,
  add column speaker_bio      text,
  add column speaker_photo_url text,
  add column register_mode    text not null default 'native'
                              check (register_mode in ('native', 'external')),
  add column register_url     text;

-- External registration requires a destination URL; native must not have one.
alter table public.events
  add constraint events_register_url_required
  check (
    (register_mode = 'external' and register_url is not null)
    or (register_mode = 'native' and register_url is null)
  );

create index idx_events_city on public.events (city);
