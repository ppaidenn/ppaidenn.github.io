create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  username text not null,
  email text,
  avatar_url text,
  bio text,
  personal_links text[],
  silly_question text,
  silly_answer text,
  security_question text,
  security_answer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists personal_links text[];
alter table public.profiles add column if not exists silly_question text;
alter table public.profiles add column if not exists silly_answer text;

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username));

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_profiles_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop function if exists public.get_public_profiles(text[]);
create or replace function public.get_public_profiles(usernames text[])
returns table (
  full_name text,
  username text,
  avatar_url text,
  bio text,
  personal_links text[],
  silly_question text,
  silly_answer text
)
language sql
security definer
set search_path = public
as $$
  select
    p.full_name,
    p.username,
    p.avatar_url,
    p.bio,
    p.personal_links,
    p.silly_question,
    p.silly_answer
  from public.profiles p
  where lower(p.username) = any(usernames);
$$;

grant execute on function public.get_public_profiles(text[]) to anon, authenticated;

drop function if exists public.get_public_profiles_by_ids(uuid[]);
create or replace function public.get_public_profiles_by_ids(user_ids uuid[])
returns table (
  id uuid,
  full_name text,
  username text,
  avatar_url text,
  personal_links text[]
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    p.username,
    p.avatar_url,
    p.personal_links
  from public.profiles p
  where p.id = any(user_ids);
$$;

grant execute on function public.get_public_profiles_by_ids(uuid[]) to anon, authenticated;

drop function if exists public.get_public_profile_by_username(text);
create or replace function public.get_public_profile_by_username(target_username text)
returns table (
  id uuid,
  full_name text,
  username text,
  avatar_url text,
  bio text,
  personal_links text[]
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    p.username,
    p.avatar_url,
    p.bio,
    p.personal_links
  from public.profiles p
  where lower(p.username) = lower(trim(coalesce(target_username, '')))
  limit 1;
$$;

grant execute on function public.get_public_profile_by_username(text) to anon, authenticated;
