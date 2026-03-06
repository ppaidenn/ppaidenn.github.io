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

alter table public.comments enable row level security;

drop policy if exists comments_select_public on public.comments;
create policy comments_select_public
  on public.comments
  for select
  to anon, authenticated
  using (true);

-- Inserts are handled through Edge Functions using the service role.
drop policy if exists comments_insert_public on public.comments;
