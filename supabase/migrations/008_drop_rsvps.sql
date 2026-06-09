-- 008_drop_rsvps.sql
-- After registrations is verified and the app is repointed, retire the old objects.
drop function if exists public.create_rsvp(uuid, uuid);
drop table if exists public.rsvps;
