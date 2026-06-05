-- 001_create_profiles.sql
-- Profiles table extending auth.users for the Rethink Events MVP.

create table public.profiles (
  id         uuid        primary key references auth.users(id) on delete cascade,
  full_name  text        not null,
  email      text        not null unique,
  role       text        not null default 'member'
                         check (role in ('member', 'admin')),
  city       text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user is inserted.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
