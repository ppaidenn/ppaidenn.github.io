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
