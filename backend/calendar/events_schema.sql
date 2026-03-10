create extension if not exists pgcrypto;

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_title_len check (char_length(title) between 1 and 140),
  constraint calendar_events_description_len check (description is null or char_length(description) <= 2000),
  constraint calendar_events_location_len check (location is null or char_length(location) <= 240),
  constraint calendar_events_time_order check (ends_at > starts_at)
);

create index if not exists calendar_events_owner_starts_idx
  on public.calendar_events (owner_id, starts_at);

create table if not exists public.event_invites (
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  invitee_id uuid not null references auth.users(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (event_id, invitee_id),
  constraint event_invites_no_self check (invitee_id <> inviter_id)
);

create index if not exists event_invites_invitee_status_idx
  on public.event_invites (invitee_id, status, created_at desc);

alter table public.calendar_events enable row level security;
alter table public.event_invites enable row level security;

drop policy if exists "calendar_events_select_owner" on public.calendar_events;
create policy "calendar_events_select_owner"
on public.calendar_events
for select
to authenticated
using (auth.uid() = owner_id);

drop policy if exists "event_invites_select_party" on public.event_invites;
create policy "event_invites_select_party"
on public.event_invites
for select
to authenticated
using (auth.uid() = invitee_id or auth.uid() = inviter_id);

create or replace function public.set_calendar_events_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_calendar_events_updated_at on public.calendar_events;
create trigger trg_calendar_events_updated_at
before update on public.calendar_events
for each row
execute function public.set_calendar_events_updated_at();

create or replace function public.create_event_with_invites(
  event_title text,
  event_description text,
  event_location text,
  event_starts_at timestamptz,
  event_ends_at timestamptz,
  invite_usernames text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  new_event_id uuid;
begin
  if me is null then
    return null;
  end if;

  insert into public.calendar_events (
    owner_id,
    title,
    description,
    location,
    starts_at,
    ends_at
  )
  values (
    me,
    trim(coalesce(event_title, '')),
    nullif(trim(coalesce(event_description, '')), ''),
    nullif(trim(coalesce(event_location, '')), ''),
    event_starts_at,
    event_ends_at
  )
  returning id into new_event_id;

  if invite_usernames is not null and array_length(invite_usernames, 1) is not null then
    insert into public.event_invites (event_id, invitee_id, inviter_id, status)
    select
      new_event_id,
      p.id,
      me,
      'pending'
    from public.profiles p
    where lower(p.username) = any(
      select lower(trim(u))
      from unnest(invite_usernames) as u
      where trim(coalesce(u, '')) <> ''
    )
    and p.id <> me
    and exists (
      select 1
      from public.friendships f
      where f.user_id = me
        and f.friend_id = p.id
    )
    on conflict (event_id, invitee_id) do nothing;
  end if;

  return new_event_id;
end;
$$;

grant execute on function public.create_event_with_invites(text, text, text, timestamptz, timestamptz, text[]) to authenticated;

create or replace function public.update_event_with_invites(
  target_event_id uuid,
  event_title text,
  event_description text,
  event_location text,
  event_starts_at timestamptz,
  event_ends_at timestamptz,
  invite_usernames text[]
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

  update public.calendar_events
  set
    title = trim(coalesce(event_title, '')),
    description = nullif(trim(coalesce(event_description, '')), ''),
    location = nullif(trim(coalesce(event_location, '')), ''),
    starts_at = event_starts_at,
    ends_at = event_ends_at
  where id = target_event_id
    and owner_id = me;

  if not found then
    return false;
  end if;

  with desired_invitees as (
    select distinct p.id
    from public.profiles p
    where invite_usernames is not null
      and lower(p.username) = any(
        select lower(trim(u))
        from unnest(invite_usernames) as u
        where trim(coalesce(u, '')) <> ''
      )
      and p.id <> me
      and exists (
        select 1
        from public.friendships f
        where f.user_id = me
          and f.friend_id = p.id
      )
  )
  delete from public.event_invites i
  where i.event_id = target_event_id
    and not exists (
      select 1
      from desired_invitees d
      where d.id = i.invitee_id
    );

  insert into public.event_invites (event_id, invitee_id, inviter_id, status)
  select
    target_event_id,
    d.id,
    me,
    'pending'
  from (
    select distinct p.id
    from public.profiles p
    where invite_usernames is not null
      and lower(p.username) = any(
        select lower(trim(u))
        from unnest(invite_usernames) as u
        where trim(coalesce(u, '')) <> ''
      )
      and p.id <> me
      and exists (
        select 1
        from public.friendships f
        where f.user_id = me
          and f.friend_id = p.id
      )
  ) d
  on conflict (event_id, invitee_id) do nothing;

  return true;
end;
$$;

grant execute on function public.update_event_with_invites(uuid, text, text, text, timestamptz, timestamptz, text[]) to authenticated;

create or replace function public.delete_event(target_event_id uuid)
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

  delete from public.calendar_events
  where id = target_event_id
    and owner_id = me;

  return found;
end;
$$;

grant execute on function public.delete_event(uuid) to authenticated;

create or replace function public.get_my_calendar_events(start_at timestamptz, end_at timestamptz)
returns table (
  event_id uuid,
  owner_id uuid,
  owner_username text,
  title text,
  description text,
  location text,
  starts_at timestamptz,
  ends_at timestamptz,
  invite_status text
)
language sql
security definer
set search_path = public
as $$
  with owned as (
    select
      e.id as event_id,
      e.owner_id,
      p.username as owner_username,
      e.title,
      e.description,
      e.location,
      e.starts_at,
      e.ends_at,
      'owner'::text as invite_status
    from public.calendar_events e
    join public.profiles p on p.id = e.owner_id
    where e.owner_id = auth.uid()
      and e.starts_at >= start_at
      and e.starts_at < end_at
  ),
  invited as (
    select
      e.id as event_id,
      e.owner_id,
      p.username as owner_username,
      e.title,
      e.description,
      e.location,
      e.starts_at,
      e.ends_at,
      i.status::text as invite_status
    from public.event_invites i
    join public.calendar_events e on e.id = i.event_id
    join public.profiles p on p.id = e.owner_id
    where i.invitee_id = auth.uid()
      and i.status in ('pending', 'accepted')
      and e.starts_at >= start_at
      and e.starts_at < end_at
  )
  select * from owned
  union all
  select * from invited
  order by starts_at, event_id;
$$;

grant execute on function public.get_my_calendar_events(timestamptz, timestamptz) to authenticated;

create or replace function public.get_my_calendar_events_detail(start_at timestamptz, end_at timestamptz)
returns table (
  event_id uuid,
  owner_id uuid,
  owner_username text,
  title text,
  description text,
  location text,
  starts_at timestamptz,
  ends_at timestamptz,
  invite_status text,
  invite_usernames text[],
  can_edit boolean
)
language sql
security definer
set search_path = public
as $$
  with owned as (
    select
      e.id as event_id,
      e.owner_id,
      p.username as owner_username,
      e.title,
      e.description,
      e.location,
      e.starts_at,
      e.ends_at,
      'owner'::text as invite_status,
      coalesce(
        array_agg(inv_p.username order by lower(inv_p.username), inv_p.username)
          filter (where inv_p.username is not null),
        '{}'::text[]
      ) as invite_usernames,
      true as can_edit
    from public.calendar_events e
    join public.profiles p on p.id = e.owner_id
    left join public.event_invites i on i.event_id = e.id
    left join public.profiles inv_p on inv_p.id = i.invitee_id
    where e.owner_id = auth.uid()
      and e.starts_at >= start_at
      and e.starts_at < end_at
    group by e.id, e.owner_id, p.username, e.title, e.description, e.location, e.starts_at, e.ends_at
  ),
  invited as (
    select
      e.id as event_id,
      e.owner_id,
      p.username as owner_username,
      e.title,
      e.description,
      e.location,
      e.starts_at,
      e.ends_at,
      i.status::text as invite_status,
      '{}'::text[] as invite_usernames,
      false as can_edit
    from public.event_invites i
    join public.calendar_events e on e.id = i.event_id
    join public.profiles p on p.id = e.owner_id
    where i.invitee_id = auth.uid()
      and i.status in ('pending', 'accepted')
      and e.starts_at >= start_at
      and e.starts_at < end_at
  )
  select * from owned
  union all
  select * from invited
  order by starts_at, event_id;
$$;

grant execute on function public.get_my_calendar_events_detail(timestamptz, timestamptz) to authenticated;

create or replace function public.get_my_pending_event_invites()
returns table (
  event_id uuid,
  inviter_id uuid,
  inviter_username text,
  title text,
  starts_at timestamptz,
  location text
)
language sql
security definer
set search_path = public
as $$
  select
    e.id as event_id,
    i.inviter_id,
    p.username as inviter_username,
    e.title,
    e.starts_at,
    e.location
  from public.event_invites i
  join public.calendar_events e on e.id = i.event_id
  join public.profiles p on p.id = i.inviter_id
  where i.invitee_id = auth.uid()
    and i.status = 'pending'
  order by e.starts_at;
$$;

grant execute on function public.get_my_pending_event_invites() to authenticated;

create or replace function public.respond_to_event_invite(event_id uuid, accept_invite boolean)
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

  update public.event_invites
  set
    status = case when accept_invite then 'accepted' else 'declined' end,
    responded_at = now()
  where event_invites.event_id = respond_to_event_invite.event_id
    and event_invites.invitee_id = me
    and event_invites.status = 'pending';

  return found;
end;
$$;

grant execute on function public.respond_to_event_invite(uuid, boolean) to authenticated;

create or replace function public.get_friend_calendar_events(
  target_username text,
  start_at timestamptz,
  end_at timestamptz
)
returns table (
  event_id uuid,
  title text,
  description text,
  location text,
  starts_at timestamptz,
  ends_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with target as (
    select p.id, p.username
    from public.profiles p
    where lower(p.username) = lower(trim(coalesce(target_username, '')))
    limit 1
  )
  select
    e.id as event_id,
    e.title,
    e.description,
    e.location,
    e.starts_at,
    e.ends_at
  from target t
  join public.calendar_events e on e.owner_id = t.id
  where e.starts_at >= start_at
    and e.starts_at < end_at
    and (
      t.id = auth.uid()
      or exists (
        select 1
        from public.friendships f
        where (f.user_id = auth.uid() and f.friend_id = t.id)
           or (f.friend_id = auth.uid() and f.user_id = t.id)
      )
    )
  order by e.starts_at, e.id;
$$;

grant execute on function public.get_friend_calendar_events(text, timestamptz, timestamptz) to authenticated;
