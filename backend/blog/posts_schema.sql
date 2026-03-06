create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  body text not null,
  images text[] default '{}'::text[],
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;

drop policy if exists "Public read" on public.posts;
create policy "Public read"
on public.posts
for select
using (true);

-- Inserts are handled through Edge Functions using the service role.
drop policy if exists "Public insert" on public.posts;
