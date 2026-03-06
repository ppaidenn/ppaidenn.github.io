alter table public.posts
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists posts_user_id_idx
  on public.posts (user_id);
