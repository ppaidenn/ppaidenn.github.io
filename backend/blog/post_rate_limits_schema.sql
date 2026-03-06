create table if not exists public.post_rate_limits (
  ip_hash text primary key,
  last_post_at timestamptz not null
);

alter table public.post_rate_limits enable row level security;
