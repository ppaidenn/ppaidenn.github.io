create table if not exists public.comment_rate_limits (
  ip_hash text primary key,
  last_comment_at timestamptz not null
);

alter table public.comment_rate_limits enable row level security;
