-- 014_reminder_cron.sql
-- Schedules the send-reminders edge function to run hourly via pg_cron.
--
-- BEFORE APPLYING THIS MIGRATION, Aditya must:
--   1. Enable the pg_cron extension:
--      Dashboard → Database → Extensions → enable pg_cron
--   2. Enable the pg_net extension:
--      Dashboard → Database → Extensions → enable pg_net
--   3. Replace {PROJECT_REF} below with your Supabase project reference ID
--      (found in Dashboard → Settings → General → Reference ID).
--   4. Replace {SERVICE_KEY} below with your service role key
--      (Dashboard → Settings → API → service_role key).
--      Alternatively, store the key in Supabase Vault and reference it via
--      vault.decrypted_secrets — preferred for production.
--
-- The send-reminders function (supabase/functions/send-reminders/index.ts)
-- is idempotent: it sets reminder_sent_at before sending, so re-runs are safe.

select cron.schedule(
  'send-reminders-hourly',
  '0 * * * *',  -- every hour, on the hour
  $$
  select net.http_post(
    url     := 'https://{PROJECT_REF}.supabase.co/functions/v1/send-reminders',
    headers := '{"Authorization": "Bearer {SERVICE_KEY}", "Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
