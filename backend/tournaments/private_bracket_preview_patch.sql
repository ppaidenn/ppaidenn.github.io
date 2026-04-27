create or replace function public.get_accessible_music_tournaments()
returns table (
  tournament_id uuid,
  tournament_slug text,
  bracket_name text,
  visibility text,
  playlist_name text,
  playlist_cover_url text,
  owner_username text,
  owner_avatar_url text,
  entrant_count integer,
  participant_count integer,
  updated_at timestamptz,
  is_owner boolean,
  is_member boolean,
  can_vote boolean
)
language sql
security definer
set search_path = public
as $$
  with accessible as (
    select
      t.*,
      auth.uid() = t.owner_id as is_owner,
      exists (
        select 1
        from public.music_tournament_members m
        where m.tournament_id = t.id
          and m.user_id = auth.uid()
      ) as is_member,
      (
        auth.uid() is not null
        and (
          t.visibility = 'public'
          or auth.uid() = t.owner_id
          or exists (
            select 1
            from public.music_tournament_members m
            where m.tournament_id = t.id
              and m.user_id = auth.uid()
          )
        )
      ) as can_vote
    from public.music_tournaments t
  )
  select
    a.id as tournament_id,
    a.slug as tournament_slug,
    a.name as bracket_name,
    a.visibility,
    a.playlist_name,
    a.playlist_cover_url,
    p.username as owner_username,
    p.avatar_url as owner_avatar_url,
    coalesce(jsonb_array_length(a.entrants), 0) as entrant_count,
    coalesce((select count(*)::integer from public.music_tournament_members m where m.tournament_id = a.id), 0) as participant_count,
    a.updated_at,
    a.is_owner,
    a.is_member,
    a.can_vote
  from accessible a
  join public.profiles p on p.id = a.owner_id
  order by a.updated_at desc;
$$;

grant execute on function public.get_accessible_music_tournaments() to anon, authenticated;

drop function if exists public.get_music_tournament_detail_by_slug(text);

create or replace function public.get_music_tournament_detail_by_slug(target_slug text)
returns table (
  tournament_id uuid,
  tournament_slug text,
  bracket_name text,
  visibility text,
  playlist_id text,
  playlist_name text,
  playlist_cover_url text,
  spotify_playlist_url text,
  playlist_owner_name text,
  owner_id uuid,
  owner_username text,
  owner_avatar_url text,
  entrants jsonb,
  rounds jsonb,
  my_picks jsonb,
  main_draw_size integer,
  created_at timestamptz,
  updated_at timestamptz,
  is_owner boolean,
  is_member boolean,
  can_vote boolean,
  participants jsonb,
  ballots jsonb
)
language sql
security definer
set search_path = public
as $$
  with target as (
    select
      t.*,
      auth.uid() = t.owner_id as is_owner,
      exists (
        select 1
        from public.music_tournament_members m
        where m.tournament_id = t.id
          and m.user_id = auth.uid()
      ) as is_member,
      (
        auth.uid() is not null
        and (
          t.visibility = 'public'
          or auth.uid() = t.owner_id
          or exists (
            select 1
            from public.music_tournament_members m
            where m.tournament_id = t.id
              and m.user_id = auth.uid()
          )
        )
      ) as can_vote
    from public.music_tournaments t
    where t.slug = trim(coalesce(target_slug, ''))
    limit 1
  ),
  member_rows as (
    select
      m.user_id,
      m.role,
      p.username,
      p.avatar_url,
      coalesce(
        b.picks,
        case
          when m.user_id = target.owner_id and target.picks <> '{}'::jsonb then target.picks
          else '{}'::jsonb
        end
      ) as picks
    from target
    join public.music_tournament_members m on m.tournament_id = target.id
    join public.profiles p on p.id = m.user_id
    left join public.music_tournament_ballots b
      on b.tournament_id = m.tournament_id
     and b.user_id = m.user_id
  ),
  ballot_rows as (
    select
      b.user_id,
      coalesce(p.username, 'user') as username,
      p.avatar_url,
      coalesce(m.role, case when b.user_id = target.owner_id then 'owner' else 'participant' end) as role,
      b.picks
    from target
    join public.music_tournament_ballots b on b.tournament_id = target.id
    join public.profiles p on p.id = b.user_id
    left join public.music_tournament_members m
      on m.tournament_id = b.tournament_id
     and m.user_id = b.user_id
    union all
    select
      target.owner_id,
      owner_profile.username,
      owner_profile.avatar_url,
      'owner',
      target.picks
    from target
    join public.profiles owner_profile on owner_profile.id = target.owner_id
    where target.picks <> '{}'::jsonb
      and not exists (
        select 1
        from public.music_tournament_ballots b
        where b.tournament_id = target.id
          and b.user_id = target.owner_id
      )
  )
  select
    target.id as tournament_id,
    target.slug as tournament_slug,
    target.name as bracket_name,
    target.visibility,
    target.playlist_id,
    target.playlist_name,
    target.playlist_cover_url,
    target.spotify_playlist_url,
    target.playlist_owner_name,
    target.owner_id,
    owner_profile.username as owner_username,
    owner_profile.avatar_url as owner_avatar_url,
    target.entrants,
    target.rounds,
    coalesce(
      (
        select br.picks
        from ballot_rows br
        where br.user_id = auth.uid()
        limit 1
      ),
      case
        when auth.uid() = target.owner_id and target.picks <> '{}'::jsonb then target.picks
        else '{}'::jsonb
      end
    ) as my_picks,
    target.main_draw_size,
    target.created_at,
    target.updated_at,
    target.is_owner,
    target.is_member,
    target.can_vote,
    case
      when target.visibility = 'private' and target.can_vote is not true and target.is_owner is not true and target.is_member is not true then '[]'::jsonb
      else coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'user_id', m.user_id,
            'username', m.username,
            'avatar_url', m.avatar_url,
            'role', m.role
          )
          order by case when m.role = 'owner' then 0 else 1 end, lower(m.username), m.username
        )
        from member_rows m
      ), '[]'::jsonb)
    end as participants,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'user_id', b.user_id,
          'username', b.username,
          'avatar_url', b.avatar_url,
          'role', b.role,
          'picks', b.picks
        )
        order by case when b.role = 'owner' then 0 else 1 end, lower(b.username), b.username
      )
      from ballot_rows b
      where b.picks <> '{}'::jsonb
    ), '[]'::jsonb) as ballots
  from target
  join public.profiles owner_profile on owner_profile.id = target.owner_id;
$$;

grant execute on function public.get_music_tournament_detail_by_slug(text) to anon, authenticated;

do $$
begin
  if to_regclass('public.notifications_inbox') is not null then
    alter table public.notifications_inbox
      drop constraint if exists notifications_inbox_type_check;

    alter table public.notifications_inbox
      add constraint notifications_inbox_type_check
      check (type in ('friend_request', 'event_invite', 'event_update', 'event_reminder', 'friend_removed', 'tournament_access_request'));
  end if;
end;
$$;

create table if not exists public.music_tournament_access_requests (
  tournament_id uuid not null references public.music_tournaments(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tournament_id, requester_id)
);

create index if not exists music_tournament_access_requests_owner_idx
  on public.music_tournament_access_requests (owner_id, status, created_at desc);

create index if not exists music_tournament_access_requests_requester_idx
  on public.music_tournament_access_requests (requester_id, updated_at desc);

create or replace function public.set_music_tournament_access_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_music_tournament_access_requests_updated_at on public.music_tournament_access_requests;
create trigger trg_music_tournament_access_requests_updated_at
before update on public.music_tournament_access_requests
for each row
execute function public.set_music_tournament_access_requests_updated_at();

alter table public.music_tournament_access_requests enable row level security;

drop policy if exists "music_tournament_access_requests_select_owner_or_requester" on public.music_tournament_access_requests;
create policy "music_tournament_access_requests_select_owner_or_requester"
on public.music_tournament_access_requests
for select
to authenticated
using (auth.uid() = owner_id or auth.uid() = requester_id);

create or replace function public.get_my_music_tournament_access_request_status(target_tournament_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select r.status
  from public.music_tournament_access_requests r
  where r.tournament_id = target_tournament_id
    and r.requester_id = auth.uid()
  limit 1;
$$;

grant execute on function public.get_my_music_tournament_access_request_status(uuid) to authenticated;

create or replace function public.request_music_tournament_access(target_tournament_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  tournament_row public.music_tournaments%rowtype;
  actor_username text;
  existing_status text;
begin
  if me is null then
    raise exception 'Not signed in.';
  end if;

  select *
    into tournament_row
  from public.music_tournaments
  where id = target_tournament_id
  limit 1;

  if tournament_row.id is null then
    raise exception 'Tournament not found.';
  end if;
  if tournament_row.visibility <> 'private' then
    raise exception 'This bracket is already public.';
  end if;
  if tournament_row.owner_id = me then
    return 'approved';
  end if;
  if exists (
    select 1
    from public.music_tournament_members m
    where m.tournament_id = tournament_row.id
      and m.user_id = me
  ) then
    return 'approved';
  end if;

  select p.username
    into actor_username
  from public.profiles p
  where p.id = me
  limit 1;

  select r.status
    into existing_status
  from public.music_tournament_access_requests r
  where r.tournament_id = tournament_row.id
    and r.requester_id = me
  limit 1;

  insert into public.music_tournament_access_requests (tournament_id, requester_id, owner_id, status)
  values (tournament_row.id, me, tournament_row.owner_id, 'pending')
  on conflict (tournament_id, requester_id)
  do update set owner_id = excluded.owner_id,
                status = 'pending',
                updated_at = now();

  if coalesce(existing_status, '') <> 'pending'
     and to_regclass('public.notifications_inbox') is not null then
    insert into public.notifications_inbox (
      user_id,
      type,
      title,
      body,
      link_url,
      actor_user_id,
      actor_username,
      entity_type,
      entity_id
    )
    values (
      tournament_row.owner_id,
      'tournament_access_request',
      'paiden.com',
      format(
        'Bracket Access Request\n%s requested voting access to your private bracket "%s".',
        coalesce(nullif(actor_username, ''), 'Someone'),
        coalesce(nullif(tournament_row.name, ''), 'Untitled Bracket')
      ),
      format('/all-tournaments/%s', tournament_row.slug),
      me,
      actor_username,
      'music_tournament',
      tournament_row.id::text
    );
  end if;

  return 'pending';
end;
$$;

grant execute on function public.request_music_tournament_access(uuid) to authenticated;

create or replace function public.invite_friend_to_music_tournament(target_tournament_id uuid, target_friend_username text)
returns table (
  participant_user_id uuid,
  participant_username text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  friend_target uuid;
  friend_name text;
  tournament_owner uuid;
begin
  if me is null then
    raise exception 'Not signed in.';
  end if;

  select owner_id
    into tournament_owner
  from public.music_tournaments
  where id = target_tournament_id
  limit 1;

  if tournament_owner is null then
    raise exception 'Tournament not found.';
  end if;
  if tournament_owner <> me then
    raise exception 'Only the tournament owner can invite friends.';
  end if;

  select p.id, p.username
    into friend_target, friend_name
  from public.profiles p
  where lower(p.username) = lower(trim(coalesce(target_friend_username, '')))
    and exists (
      select 1
      from public.friendships f
      where f.user_id = me
        and f.friend_id = p.id
    )
  limit 1;

  if friend_target is null then
    raise exception 'That account is not one of your paiden.com friends.';
  end if;

  insert into public.music_tournament_members (tournament_id, user_id, role, invited_by)
  values (target_tournament_id, friend_target, 'participant', me)
  on conflict on constraint music_tournament_members_pkey do update
    set invited_by = excluded.invited_by;

  update public.music_tournament_access_requests
  set owner_id = me,
      status = 'approved',
      updated_at = now()
  where tournament_id = target_tournament_id
    and requester_id = friend_target;

  return query
  select friend_target, friend_name;
end;
$$;

grant execute on function public.invite_friend_to_music_tournament(uuid, text) to authenticated;

create or replace function public.accept_music_tournament_invite(invite_code text)
returns table (
  tournament_id uuid,
  tournament_slug text,
  bracket_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  invite_row public.music_tournament_invites%rowtype;
  tournament_row public.music_tournaments%rowtype;
begin
  if me is null then
    raise exception 'Not signed in.';
  end if;

  select *
    into invite_row
  from public.music_tournament_invites
  where code = trim(coalesce(invite_code, ''))
  limit 1;

  if invite_row.id is null then
    raise exception 'Invite link not found.';
  end if;

  select *
    into tournament_row
  from public.music_tournaments
  where id = invite_row.tournament_id
  limit 1;

  if tournament_row.id is null then
    raise exception 'Tournament not found.';
  end if;

  if invite_row.status = 'revoked' then
    raise exception 'Invite link has been revoked.';
  end if;

  if invite_row.status = 'accepted' then
    if invite_row.accepted_by = me or exists (
      select 1
      from public.music_tournament_members m
      where m.tournament_id = tournament_row.id
        and m.user_id = me
    ) then
      return query
      select tournament_row.id as tournament_id, tournament_row.slug as tournament_slug, tournament_row.name as bracket_name;
      return;
    end if;
    raise exception 'Invite link has already been used.';
  end if;

  if invite_row.invited_user_id is not null and invite_row.invited_user_id <> me then
    raise exception 'This invite link belongs to another user.';
  end if;

  insert into public.music_tournament_members (tournament_id, user_id, role, invited_by)
  values (tournament_row.id, me, 'participant', invite_row.created_by)
  on conflict on constraint music_tournament_members_pkey do nothing;

  update public.music_tournament_access_requests
  set owner_id = tournament_row.owner_id,
      status = 'approved',
      updated_at = now()
  where tournament_id = tournament_row.id
    and requester_id = me;

  update public.music_tournament_invites
  set status = 'accepted',
      accepted_by = me,
      accepted_at = now()
  where id = invite_row.id;

  return query
  select tournament_row.id as tournament_id, tournament_row.slug as tournament_slug, tournament_row.name as bracket_name;
end;
$$;

grant execute on function public.accept_music_tournament_invite(text) to authenticated;
