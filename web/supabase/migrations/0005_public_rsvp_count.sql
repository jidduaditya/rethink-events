-- 0005_public_rsvp_count.sql
-- Allow anyone (anon + authenticated) to count going RSVPs on published or
-- cancelled events. Going count is public social-proof data (shown on the
-- event page and OG image). We expose the full row here, but rsvps only
-- contain event_id, user_id, status, checked_in — no PII beyond user_id,
-- which is not rendered anywhere on the public page.
--
-- Apply in Supabase SQL editor (or local: supabase db reset).

create policy "going rsvps readable on public events"
  on public.rsvps for select
  using (
    status = 'going'
    and exists (
      select 1 from public.events
      where id = rsvps.event_id
        and state in ('published', 'cancelled')
    )
  );
