create extension if not exists pgcrypto;

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  share_token uuid not null default gen_random_uuid(),
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

alter table public.calendar_events add column if not exists share_token uuid;
update public.calendar_events
set share_token = gen_random_uuid()
where share_token is null;

alter table public.calendar_events
  alter column share_token set default gen_random_uuid();

alter table public.calendar_events
  alter column share_token set not null;

create index if not exists calendar_events_owner_starts_idx
  on public.calendar_events (owner_id, starts_at);

create unique index if not exists calendar_events_share_token_key
  on public.calendar_events (share_token);

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

create table if not exists public.event_reminder_deliveries (
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  reminder_type text not null check (reminder_type in ('one_hour')),
  scheduled_for timestamptz not null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (event_id, recipient_id, reminder_type)
);

create index if not exists event_reminder_deliveries_schedule_idx
  on public.event_reminder_deliveries (scheduled_for, sent_at desc);

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

  delete from public.event_reminder_deliveries
  where event_id = target_event_id;

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

drop function if exists public.get_my_calendar_events_detail(timestamptz, timestamptz);
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
  share_token uuid,
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
      e.share_token,
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
      null::uuid as share_token,
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

drop function if exists public.claim_shared_event_invite(uuid);
create or replace function public.claim_shared_event_invite(target_share_token uuid)
returns table (
  event_id uuid,
  owner_username text,
  title text,
  invite_status text,
  action_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  target_event public.calendar_events%rowtype;
  owner_name text;
begin
  if me is null or target_share_token is null then
    return;
  end if;

  select *
    into target_event
  from public.calendar_events e
  where e.share_token = target_share_token
  limit 1;

  if target_event.id is null then
    return;
  end if;

  select p.username
    into owner_name
  from public.profiles p
  where p.id = target_event.owner_id
  limit 1;

  if target_event.owner_id = me then
    return query
    select target_event.id, coalesce(owner_name, ''), target_event.title, 'owner'::text, 'owner'::text;
    return;
  end if;

  if not exists (
    select 1
    from public.friendships f
    where (f.user_id = target_event.owner_id and f.friend_id = me)
       or (f.user_id = me and f.friend_id = target_event.owner_id)
  ) then
    insert into public.friend_requests (requester_id, receiver_id, status, responded_at, created_at)
    values (target_event.owner_id, me, 'pending', null, now())
    on conflict (requester_id, receiver_id)
    do update set
      status = case
        when friend_requests.status = 'accepted' then friend_requests.status
        else 'pending'
      end,
      responded_at = case
        when friend_requests.status = 'accepted' then friend_requests.responded_at
        else null
      end,
      created_at = case
        when friend_requests.status = 'accepted' then friend_requests.created_at
        else now()
      end;

    return query
    select target_event.id, coalesce(owner_name, ''), target_event.title, null::text, 'friend_request_created'::text;
    return;
  end if;

  insert into public.event_invites (event_id, invitee_id, inviter_id, status, created_at, responded_at)
  values (target_event.id, me, target_event.owner_id, 'pending', now(), null)
  on conflict (event_id, invitee_id)
  do update set
    status = case
      when event_invites.status = 'accepted' then event_invites.status
      else 'pending'
    end,
    responded_at = case
      when event_invites.status = 'accepted' then event_invites.responded_at
      else null
    end,
    created_at = case
      when event_invites.status = 'accepted' then event_invites.created_at
      else now()
    end;

  return query
  select
    target_event.id,
    coalesce(owner_name, ''),
    target_event.title,
    coalesce((
      select i.status::text
      from public.event_invites i
      where i.event_id = target_event.id
        and i.invitee_id = me
      limit 1
    ), 'pending'::text),
    'event_invite_created'::text;
end;
$$;

grant execute on function public.claim_shared_event_invite(uuid) to authenticated;

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

create or replace function public.claim_due_event_one_hour_reminders(run_at timestamptz default now())
returns table (
  event_id uuid,
  recipient_id uuid,
  owner_username text,
  title text,
  location text,
  starts_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with owner_targets as (
    select
      e.id as event_id,
      e.owner_id as recipient_id,
      owner_profile.username as owner_username,
      e.title,
      e.location,
      e.starts_at,
      (e.starts_at - interval '1 hour') as scheduled_for,
      greatest(e.created_at, e.updated_at) as schedule_origin_at
    from public.calendar_events e
    join public.profiles owner_profile on owner_profile.id = e.owner_id
    left join public.notification_preferences np on np.user_id = e.owner_id
    where e.starts_at > run_at
      and (e.starts_at - interval '1 hour') <= run_at
      and (e.starts_at - interval '1 hour') > (run_at - interval '15 minutes')
      and greatest(e.created_at, e.updated_at) <= (e.starts_at - interval '1 hour')
      and coalesce(np.notify_event_one_hour, true)
  ),
  invite_targets as (
    select
      e.id as event_id,
      i.invitee_id as recipient_id,
      owner_profile.username as owner_username,
      e.title,
      e.location,
      e.starts_at,
      (e.starts_at - interval '1 hour') as scheduled_for,
      greatest(e.created_at, e.updated_at, i.created_at, coalesce(i.responded_at, i.created_at)) as schedule_origin_at
    from public.calendar_events e
    join public.event_invites i
      on i.event_id = e.id
     and i.status = 'accepted'
    join public.profiles owner_profile on owner_profile.id = e.owner_id
    left join public.notification_preferences np on np.user_id = i.invitee_id
    where e.starts_at > run_at
      and (e.starts_at - interval '1 hour') <= run_at
      and (e.starts_at - interval '1 hour') > (run_at - interval '15 minutes')
      and greatest(e.created_at, e.updated_at, i.created_at, coalesce(i.responded_at, i.created_at)) <= (e.starts_at - interval '1 hour')
      and coalesce(np.notify_event_one_hour, true)
  ),
  candidates as (
    select * from owner_targets
    union all
    select * from invite_targets
  ),
  inserted as (
    insert into public.event_reminder_deliveries (
      event_id,
      recipient_id,
      reminder_type,
      scheduled_for,
      sent_at
    )
    select
      c.event_id,
      c.recipient_id,
      'one_hour',
      c.scheduled_for,
      run_at
    from candidates c
    on conflict (event_id, recipient_id, reminder_type) do nothing
    returning event_id, recipient_id
  )
  select
    c.event_id,
    c.recipient_id,
    c.owner_username,
    c.title,
    c.location,
    c.starts_at
  from candidates c
  join inserted i
    on i.event_id = c.event_id
   and i.recipient_id = c.recipient_id;
$$;

grant execute on function public.claim_due_event_one_hour_reminders(timestamptz) to service_role;

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

  if found then
    delete from public.event_reminder_deliveries
    where event_reminder_deliveries.event_id = respond_to_event_invite.event_id
      and event_reminder_deliveries.recipient_id = me;
    return true;
  end if;

  return false;
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
