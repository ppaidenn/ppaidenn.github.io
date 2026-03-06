create table if not exists public.blocked_ip_hashes (
  ip_hash text primary key,
  blocked_at timestamptz not null default now(),
  device_name text,
  source text,
  reason text
);

alter table public.blocked_ip_hashes
  add column if not exists device_name text;
