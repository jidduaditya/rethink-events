-- 0004_fix_trigger_service_role.sql
-- Fixes two trigger functions so the service role (migrations, seeding,
-- server-side admin) can set explicit event states without being blocked,
-- while still enforcing all rules on anon and authenticated non-admin callers.
--
-- Root cause of original bug: used (auth.uid() is not null) to detect the
-- service role, but auth.uid() is null for BOTH service_role AND anon —
-- meaning anon callers would also bypass state enforcement and the guard.
-- Correct check: auth.role() = 'service_role'.

create or replace function public.set_event_initial_state()
returns trigger language plpgsql security definer set search_path = '' as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = new.host_id;
  -- Always derive from profile; never trust the caller-supplied value.
  new.host_name := p.full_name;
  -- auth.role() distinguishes service_role from anon (both have uid=null).
  -- Service role and admins may supply explicit state; everyone else gets
  -- trust-enforced state.
  if auth.role() <> 'service_role' and not public.is_admin() then
    new.state := case when p.is_trusted then 'published'::public.event_state
                      else 'pending_review'::public.event_state end;
  end if;
  return new;
end; $$;

create or replace function public.guard_event_transition()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Service role bypasses the guard (migrations, seeds, server-side ops).
  -- Anon and authenticated non-admins are still subject to all checks.
  if auth.role() <> 'service_role' and not public.is_admin() then
    if new.host_id is distinct from old.host_id then
      raise exception 'cannot reassign event ownership';
    end if;
    if new.host_name is distinct from old.host_name then
      raise exception 'cannot change host display name directly';
    end if;
    if new.state is distinct from old.state then
      if not (old.state = 'published' and new.state = 'cancelled') then
        raise exception 'illegal state transition % -> % (non-admin)', old.state, new.state;
      end if;
    end if;
  end if;
  return new;
end; $$;
