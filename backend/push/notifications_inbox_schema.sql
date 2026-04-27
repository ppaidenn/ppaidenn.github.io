create extension if not exists pgcrypto;

create table if not exists public.notifications_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('friend_request', 'event_invite', 'event_update', 'event_reminder', 'friend_removed', 'tournament_access_request')),
  title text not null,
  body text not null,
  link_url text,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_username text,
  entity_type text,
  entity_id text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notifications_inbox
  drop constraint if exists notifications_inbox_type_check;

alter table public.notifications_inbox
  add constraint notifications_inbox_type_check
  check (type in ('friend_request', 'event_invite', 'event_update', 'event_reminder', 'friend_removed', 'tournament_access_request'));

create index if not exists notifications_inbox_user_created_idx
  on public.notifications_inbox (user_id, created_at desc);

create index if not exists notifications_inbox_user_unread_idx
  on public.notifications_inbox (user_id, read_at, created_at desc);

create or replace function public.set_notifications_inbox_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_notifications_inbox_updated_at on public.notifications_inbox;
create trigger trg_notifications_inbox_updated_at
before update on public.notifications_inbox
for each row
execute function public.set_notifications_inbox_updated_at();

alter table public.notifications_inbox enable row level security;

drop policy if exists "notifications_inbox_select_own" on public.notifications_inbox;
create policy "notifications_inbox_select_own"
on public.notifications_inbox
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "notifications_inbox_update_own" on public.notifications_inbox;
create policy "notifications_inbox_update_own"
on public.notifications_inbox
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.get_my_notifications(p_limit integer default 25)
returns table (
  notification_id uuid,
  type text,
  title text,
  body text,
  link_url text,
  actor_user_id uuid,
  actor_username text,
  entity_type text,
  entity_id text,
  read_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    n.id as notification_id,
    n.type,
    n.title,
    n.body,
    n.link_url,
    n.actor_user_id,
    n.actor_username,
    n.entity_type,
    n.entity_id,
    n.read_at,
    n.created_at
  from public.notifications_inbox n
  where n.user_id = auth.uid()
  order by n.created_at desc
  limit greatest(1, least(coalesce(p_limit, 25), 100));
$$;

grant execute on function public.get_my_notifications(integer) to authenticated;

create or replace function public.get_my_unread_notification_count()
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.notifications_inbox n
  where n.user_id = auth.uid()
    and n.read_at is null;
$$;

grant execute on function public.get_my_unread_notification_count() to authenticated;

create or replace function public.mark_notification_read(target_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null or target_notification_id is null then
    return false;
  end if;

  update public.notifications_inbox
  set read_at = coalesce(read_at, now()),
      updated_at = now()
  where id = target_notification_id
    and user_id = me;

  return found;
end;
$$;

grant execute on function public.mark_notification_read(uuid) to authenticated;

create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  changed integer := 0;
begin
  if me is null then
    return 0;
  end if;

  update public.notifications_inbox
  set read_at = now(),
      updated_at = now()
  where user_id = me
    and read_at is null;

  get diagnostics changed = row_count;
  return changed;
end;
$$;

grant execute on function public.mark_all_notifications_read() to authenticated;
