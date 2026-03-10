create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  blog_post_mode text not null default 'all' check (blog_post_mode in ('all', 'friends', 'none')),
  notify_friend_request boolean not null default true,
  notify_friend_removed boolean not null default true,
  notify_event_invite boolean not null default true,
  notify_event_one_hour boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_notification_preferences_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_notification_preferences_updated_at on public.notification_preferences;
create trigger trg_notification_preferences_updated_at
before update on public.notification_preferences
for each row
execute function public.set_notification_preferences_updated_at();

alter table public.notification_preferences enable row level security;

drop policy if exists "notification_preferences_select_own" on public.notification_preferences;
create policy "notification_preferences_select_own"
on public.notification_preferences
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "notification_preferences_insert_own" on public.notification_preferences;
create policy "notification_preferences_insert_own"
on public.notification_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "notification_preferences_update_own" on public.notification_preferences;
create policy "notification_preferences_update_own"
on public.notification_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.get_my_notification_preferences()
returns table (
  blog_post_mode text,
  notify_friend_request boolean,
  notify_friend_removed boolean,
  notify_event_invite boolean,
  notify_event_one_hour boolean
)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(np.blog_post_mode, 'all') as blog_post_mode,
    coalesce(np.notify_friend_request, true) as notify_friend_request,
    coalesce(np.notify_friend_removed, true) as notify_friend_removed,
    coalesce(np.notify_event_invite, true) as notify_event_invite,
    coalesce(np.notify_event_one_hour, true) as notify_event_one_hour
  from (select auth.uid() as user_id) me
  left join public.notification_preferences np on np.user_id = me.user_id;
$$;

grant execute on function public.get_my_notification_preferences() to authenticated;

create or replace function public.save_my_notification_preferences(
  p_blog_post_mode text,
  p_notify_friend_request boolean,
  p_notify_friend_removed boolean,
  p_notify_event_invite boolean,
  p_notify_event_one_hour boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    return false;
  end if;

  insert into public.notification_preferences (
    user_id,
    blog_post_mode,
    notify_friend_request,
    notify_friend_removed,
    notify_event_invite,
    notify_event_one_hour
  )
  values (
    me,
    case when p_blog_post_mode in ('all', 'friends', 'none') then p_blog_post_mode else 'all' end,
    coalesce(p_notify_friend_request, true),
    coalesce(p_notify_friend_removed, true),
    coalesce(p_notify_event_invite, true),
    coalesce(p_notify_event_one_hour, true)
  )
  on conflict (user_id) do update
  set
    blog_post_mode = excluded.blog_post_mode,
    notify_friend_request = excluded.notify_friend_request,
    notify_friend_removed = excluded.notify_friend_removed,
    notify_event_invite = excluded.notify_event_invite,
    notify_event_one_hour = excluded.notify_event_one_hour,
    updated_at = now();

  return true;
end;
$$;

grant execute on function public.save_my_notification_preferences(text, boolean, boolean, boolean, boolean) to authenticated;
