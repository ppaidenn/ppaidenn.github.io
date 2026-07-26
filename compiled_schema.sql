 -- BLOG POSTS 
  create table if not exists public.posts (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    author text,
    body text not null,
    images text[] default '{}'::text[],
    created_at timestamptz not null default now()
  );

  -- ensure RLS is enabled
  alter table public.posts enable row level security;

  -- public read
  drop policy if exists "Public read" on public.posts;
  create policy "Public read"
  on public.posts for select
  using (true);

  -- remove anonymous inserts
  drop policy if exists "Public insert" on public.posts;

-- POST RATE LIMITS TABLE
  create table if not exists public.post_rate_limits (
    ip_hash text primary key,
    last_post_at timestamptz not null
  );
  alter table public.post_rate_limits enable row level security;


-- COMMENTS CONTROL
create extension if not exists pgcrypto;

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id text not null,
  author text,
  body text not null,
  created_at timestamptz not null default now(),
  constraint comments_post_id_len check (char_length(post_id) between 1 and 120),
  constraint comments_author_len check (author is null or char_length(author) between 1 and 60),
  constraint comments_body_len check (char_length(body) between 1 and 1200)
);

create index if not exists comments_post_id_created_at_idx
  on public.comments (post_id, created_at desc);

create table if not exists public.comment_rate_limits (
  ip_hash text primary key,
  last_comment_at timestamptz not null
);

alter table public.comments enable row level security;

drop policy if exists comments_select_public on public.comments;
create policy comments_select_public
  on public.comments
  for select
  to anon, authenticated
  using (true);

-- Inserts from clients are blocked by default.
-- Comments should be inserted through the Edge Function using service role.
drop policy if exists comments_insert_public on public.comments;

-- Permanent IP hash blocking for blog interactive actions.
-- Run once in Supabase SQL editor.

create table if not exists public.blocked_ip_hashes (
  ip_hash text primary key,
  blocked_at timestamptz not null default now(),
  device_name text,
  source text,
  reason text
);

alter table public.blocked_ip_hashes
  add column if not exists device_name text;


-- PUSH SUBSCRIPTION
create extension if not exists pgcrypto;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_subscriptions_active_idx
  on public.push_subscriptions (is_active);

create or replace function public.set_push_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_push_subscriptions_updated_at on public.push_subscriptions;
create trigger trg_push_subscriptions_updated_at
before update on public.push_subscriptions
for each row
execute function public.set_push_subscriptions_updated_at();

alter table public.push_subscriptions disable row level security;


-- Account content
-- push_subscriptions_schema.sql
create extension if not exists pgcrypto;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_subscriptions_active_idx
  on public.push_subscriptions (is_active);

create or replace function public.set_push_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_push_subscriptions_updated_at on public.push_subscriptions;
create trigger trg_push_subscriptions_updated_at
before update on public.push_subscriptions
for each row
execute function public.set_push_subscriptions_updated_at();

alter table public.push_subscriptions disable row level security;

-- profiles_schema.sql
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  email text,
  avatar_url text,
  bio text,
  silly_question text,
  silly_answer text,
  security_question text,
  security_answer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text;
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

create or replace function public.get_public_profiles(usernames text[])
returns table (
  username text,
  avatar_url text,
  bio text,
  silly_question text,
  silly_answer text
)
language sql
security definer
set search_path = public
as $$
  select
    p.username,
    p.avatar_url,
    p.bio,
    p.silly_question,
    p.silly_answer
  from public.profiles p
  where lower(p.username) = any(usernames);
$$;

grant execute on function public.get_public_profiles(text[]) to anon, authenticated;

create or replace function public.get_public_profiles_by_ids(user_ids uuid[])
returns table (
  id uuid,
  username text,
  avatar_url text
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    p.avatar_url
  from public.profiles p
  where p.id = any(user_ids);
$$;

grant execute on function public.get_public_profiles_by_ids(uuid[]) to anon, authenticated;

create or replace function public.get_all_public_profiles()
returns table (
  id uuid,
  username text,
  avatar_url text
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    p.avatar_url
  from public.profiles p
  where coalesce(trim(p.username), '') <> ''
  order by lower(p.username), p.username;
$$;

grant execute on function public.get_all_public_profiles() to anon, authenticated;

-- public_profiles_directory_schema
create or replace function public.get_all_public_profiles()
returns table (
  id uuid,
  username text,
  avatar_url text
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    p.avatar_url
  from public.profiles p
  where coalesce(trim(p.username), '') <> ''
  order by lower(p.username), p.username;
$$;

grant execute on function public.get_all_public_profiles() to anon, authenticated;


-- friendships_schema.sql
drop function if exists public.get_all_public_profiles();

create function public.get_all_public_profiles()
returns table (
  id uuid,
  username text,
  avatar_url text
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    p.avatar_url
  from public.profiles p
  where coalesce(trim(p.username), '') <> ''
  order by lower(p.username), p.username;
$$;

grant execute on function public.get_all_public_profiles() to anon, authenticated;

create table if not exists public.friendships (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  constraint friendships_no_self check (user_id <> friend_id)
);

create index if not exists friendships_friend_id_idx
  on public.friendships (friend_id);

alter table public.friendships enable row level security;

drop policy if exists "friendships_select_own" on public.friendships;
create policy "friendships_select_own"
on public.friendships
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "friendships_insert_own" on public.friendships;
create policy "friendships_insert_own"
on public.friendships
for insert
to authenticated
with check (auth.uid() = user_id and user_id <> friend_id);

drop policy if exists "friendships_delete_own" on public.friendships;
create policy "friendships_delete_own"
on public.friendships
for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.get_my_friends()
returns table (
  friend_id uuid,
  username text,
  avatar_url text
)
language sql
security definer
set search_path = public
as $$
  select
    f.friend_id,
    p.username,
    p.avatar_url
  from public.friendships f
  join public.profiles p on p.id = f.friend_id
  where f.user_id = auth.uid()
  order by lower(p.username), p.username;
$$;

grant execute on function public.get_my_friends() to authenticated;

create or replace function public.add_friend_by_username(target_username text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  friend_target uuid;
begin
  if me is null then
    return false;
  end if;

  select p.id
    into friend_target
  from public.profiles p
  where lower(p.username) = lower(trim(coalesce(target_username, '')))
  limit 1;

  if friend_target is null or friend_target = me then
    return false;
  end if;

  insert into public.friendships (user_id, friend_id)
  values (me, friend_target)
  on conflict (user_id, friend_id) do nothing;

  return true;
end;
$$;

grant execute on function public.add_friend_by_username(text) to authenticated;