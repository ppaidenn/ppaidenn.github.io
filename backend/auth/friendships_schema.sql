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
drop policy if exists "friendships_delete_own" on public.friendships;

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

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','canceled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friend_requests_no_self check (requester_id <> receiver_id),
  constraint friend_requests_pair_unique unique (requester_id, receiver_id)
);

create index if not exists friend_requests_receiver_status_idx
  on public.friend_requests (receiver_id, status, created_at desc);

create index if not exists friend_requests_requester_status_idx
  on public.friend_requests (requester_id, status, created_at desc);

alter table public.friend_requests enable row level security;

drop policy if exists "friend_requests_select_own" on public.friend_requests;
create policy "friend_requests_select_own"
on public.friend_requests
for select
to authenticated
using (auth.uid() = requester_id or auth.uid() = receiver_id);

drop policy if exists "friend_requests_insert_own" on public.friend_requests;
create policy "friend_requests_insert_own"
on public.friend_requests
for insert
to authenticated
with check (auth.uid() = requester_id and requester_id <> receiver_id);

drop policy if exists "friend_requests_update_receiver" on public.friend_requests;
create policy "friend_requests_update_receiver"
on public.friend_requests
for update
to authenticated
using (auth.uid() = receiver_id)
with check (auth.uid() = receiver_id);

create or replace function public.get_my_pending_request_count()
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.friend_requests fr
  where fr.receiver_id = auth.uid()
    and fr.status = 'pending';
$$;

grant execute on function public.get_my_pending_request_count() to authenticated;

create or replace function public.get_my_friend_requests()
returns table (
  request_id uuid,
  requester_id uuid,
  username text,
  avatar_url text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    fr.id as request_id,
    fr.requester_id,
    p.username,
    p.avatar_url,
    fr.created_at
  from public.friend_requests fr
  join public.profiles p on p.id = fr.requester_id
  where fr.receiver_id = auth.uid()
    and fr.status = 'pending'
  order by fr.created_at desc;
$$;

grant execute on function public.get_my_friend_requests() to authenticated;

create or replace function public.get_my_outgoing_friend_requests()
returns table (
  receiver_id uuid,
  username text
)
language sql
security definer
set search_path = public
as $$
  select
    fr.receiver_id,
    p.username
  from public.friend_requests fr
  join public.profiles p on p.id = fr.receiver_id
  where fr.requester_id = auth.uid()
    and fr.status = 'pending'
  order by lower(p.username), p.username;
$$;

grant execute on function public.get_my_outgoing_friend_requests() to authenticated;

create or replace function public.respond_to_friend_request(request_id uuid, accept_request boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  req record;
begin
  if me is null then
    return false;
  end if;

  select *
    into req
  from public.friend_requests fr
  where fr.id = request_id
    and fr.receiver_id = me
    and fr.status = 'pending'
  limit 1;

  if req is null then
    return false;
  end if;

  update public.friend_requests
  set
    status = case when accept_request then 'accepted' else 'rejected' end,
    responded_at = now()
  where id = request_id;

  if accept_request then
    insert into public.friendships (user_id, friend_id)
    values (req.requester_id, req.receiver_id)
    on conflict (user_id, friend_id) do nothing;

    insert into public.friendships (user_id, friend_id)
    values (req.receiver_id, req.requester_id)
    on conflict (user_id, friend_id) do nothing;
  end if;

  return true;
end;
$$;

grant execute on function public.respond_to_friend_request(uuid, boolean) to authenticated;

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

  if exists (
    select 1
    from public.friendships f
    where (f.user_id = me and f.friend_id = friend_target)
       or (f.user_id = friend_target and f.friend_id = me)
  ) then
    return true;
  end if;

  insert into public.friend_requests (requester_id, receiver_id, status, responded_at, created_at)
  values (me, friend_target, 'pending', null, now())
  on conflict (requester_id, receiver_id)
  do update set status = 'pending', responded_at = null, created_at = now();

  return true;
end;
$$;

grant execute on function public.add_friend_by_username(text) to authenticated;
