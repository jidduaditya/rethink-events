-- 012_event_messages.sql
-- Adds the event_messages table for host broadcast (§4.5, §4.9 of events-v1-plan.md).
-- One row per host-sent update. Email fan-out is handled application-side after insert.
-- RLS: only the event's creator can insert; creator, admins, and registrants can select.

create table public.event_messages (
  id         uuid        primary key default gen_random_uuid(),
  event_id   uuid        not null references public.events(id) on delete cascade,
  sender_id  uuid        not null references public.profiles(id),
  body       text        not null check (char_length(body) <= 1000),
  created_at timestamptz not null default now()
);

create index idx_event_messages_event_id on public.event_messages (event_id, created_at desc);

alter table public.event_messages enable row level security;

-- INSERT: only the event's creator can send a broadcast
create policy "event_messages: creator insert"
  on public.event_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.events e
       where e.id = event_messages.event_id
         and e.created_by = auth.uid()
    )
  );

-- SELECT: creator, admins, and users holding any non-cancelled registration on the event
create policy "event_messages: participant select"
  on public.event_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
       where p.id = auth.uid()
         and p.role = 'admin'
    )
    or exists (
      select 1 from public.events e
       where e.id = event_messages.event_id
         and e.created_by = auth.uid()
    )
    or exists (
      select 1 from public.registrations r
       where r.event_id = event_messages.event_id
         and r.user_id = auth.uid()
    )
  );
