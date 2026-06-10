-- 009_host_remove_registration.sql
-- Allow an event's creator to remove (delete) registrations for their own event.
create policy "registrations: host delete own-event"
  on public.registrations for delete
  to authenticated
  using (
    exists (
      select 1 from public.events e
       where e.id = registrations.event_id
         and e.created_by = auth.uid()
    )
  );
