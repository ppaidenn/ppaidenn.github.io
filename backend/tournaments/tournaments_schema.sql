create extension if not exists pgcrypto;

create table if not exists public.music_tournaments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  playlist_id text not null,
  playlist_name text not null,
  playlist_cover_url text,
  spotify_playlist_url text,
  playlist_owner_name text,
  entrants jsonb not null default '[]'::jsonb,
  rounds jsonb not null default '[]'::jsonb,
  picks jsonb not null default '{}'::jsonb,
  main_draw_size integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.music_tournaments
  add column if not exists owner_id uuid references auth.users(id) on delete cascade,
  add column if not exists name text,
  add column if not exists slug text,
  add column if not exists visibility text,
  add column if not exists playlist_id text,
  add column if not exists playlist_name text,
  add column if not exists playlist_cover_url text,
  add column if not exists spotify_playlist_url text,
  add column if not exists playlist_owner_name text,
  add column if not exists entrants jsonb default '[]'::jsonb,
  add column if not exists rounds jsonb default '[]'::jsonb,
  add column if not exists picks jsonb default '{}'::jsonb,
  add column if not exists main_draw_size integer default 0,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.music_tournaments
set visibility = 'private'
where visibility is null;

alter table public.music_tournaments
  alter column visibility set default 'private';

create unique index if not exists music_tournaments_slug_key
  on public.music_tournaments (slug);

create index if not exists music_tournaments_owner_idx
  on public.music_tournaments (owner_id, updated_at desc);

create index if not exists music_tournaments_visibility_idx
  on public.music_tournaments (visibility, updated_at desc);

create table if not exists public.music_tournament_members (
  tournament_id uuid not null references public.music_tournaments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'participant' check (role in ('owner', 'participant')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (tournament_id, user_id)
);

create index if not exists music_tournament_members_user_idx
  on public.music_tournament_members (user_id, created_at desc);

create table if not exists public.music_tournament_invites (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.music_tournaments(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  invited_user_id uuid references auth.users(id) on delete cascade,
  accepted_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create index if not exists music_tournament_invites_tournament_idx
  on public.music_tournament_invites (tournament_id, status, created_at desc);

create index if not exists music_tournament_invites_code_status_idx
  on public.music_tournament_invites (code, status);

create or replace function public.set_music_tournaments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_music_tournaments_updated_at on public.music_tournaments;
create trigger trg_music_tournaments_updated_at
before update on public.music_tournaments
for each row
execute function public.set_music_tournaments_updated_at();

create or replace function public.normalize_music_tournament_slug(value text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(
      trim(both '-' from regexp_replace(lower(trim(coalesce(value, ''))), '[^a-z0-9]+', '-', 'g')),
      ''
    ),
    'tournament'
  );
$$;

alter table public.music_tournaments enable row level security;
alter table public.music_tournament_members enable row level security;
alter table public.music_tournament_invites enable row level security;

drop policy if exists "music_tournaments_select_accessible" on public.music_tournaments;
create policy "music_tournaments_select_accessible"
on public.music_tournaments
for select
to anon, authenticated
using (
  visibility = 'public'
  or auth.uid() = owner_id
  or exists (
    select 1
    from public.music_tournament_members m
    where m.tournament_id = id
      and m.user_id = auth.uid()
  )
);

drop policy if exists "music_tournaments_insert_owner" on public.music_tournaments;
create policy "music_tournaments_insert_owner"
on public.music_tournaments
for insert
to authenticated
with check (auth.uid() = owner_id);

drop policy if exists "music_tournaments_update_owner" on public.music_tournaments;
create policy "music_tournaments_update_owner"
on public.music_tournaments
for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "music_tournaments_delete_owner" on public.music_tournaments;
create policy "music_tournaments_delete_owner"
on public.music_tournaments
for delete
to authenticated
using (auth.uid() = owner_id);

drop policy if exists "music_tournament_members_select_accessible" on public.music_tournament_members;
create policy "music_tournament_members_select_accessible"
on public.music_tournament_members
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.music_tournaments t
    where t.id = music_tournament_members.tournament_id
      and (
        t.visibility = 'public'
        or t.owner_id = auth.uid()
      )
  )
);

drop policy if exists "music_tournament_invites_select_owner_or_invited" on public.music_tournament_invites;
create policy "music_tournament_invites_select_owner_or_invited"
on public.music_tournament_invites
for select
to authenticated
using (
  created_by = auth.uid()
  or invited_user_id = auth.uid()
  or exists (
    select 1
    from public.music_tournaments t
    where t.id = music_tournament_invites.tournament_id
      and t.owner_id = auth.uid()
  )
);

create or replace function public.upsert_my_music_tournament(
  target_tournament_id uuid default null,
  target_name text default null,
  target_visibility text default 'private',
  target_playlist_id text default null,
  target_playlist_name text default null,
  target_playlist_cover_url text default null,
  target_spotify_playlist_url text default null,
  target_playlist_owner_name text default null,
  target_entrants jsonb default '[]'::jsonb,
  target_rounds jsonb default '[]'::jsonb,
  target_picks jsonb default '{}'::jsonb,
  target_main_draw_size integer default 0
)
returns table (
  tournament_id uuid,
  tournament_slug text,
  created_new boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  requested_name text := trim(coalesce(target_name, ''));
  normalized_visibility text := case when lower(coalesce(target_visibility, 'private')) = 'public' then 'public' else 'private' end;
  existing_row public.music_tournaments%rowtype;
  chosen_slug text;
  base_slug text;
  slug_counter integer := 2;
begin
  if me is null then
    raise exception 'Not signed in.';
  end if;

  if requested_name = '' then
    raise exception 'Bracket name is required.';
  end if;
  if trim(coalesce(target_playlist_id, '')) = '' then
    raise exception 'Playlist ID is required.';
  end if;
  if trim(coalesce(target_playlist_name, '')) = '' then
    raise exception 'Playlist name is required.';
  end if;

  if target_tournament_id is not null then
    select *
      into existing_row
    from public.music_tournaments
    where id = target_tournament_id
      and owner_id = me
    limit 1;
  end if;

  base_slug := public.normalize_music_tournament_slug(requested_name);
  chosen_slug := coalesce(existing_row.slug, base_slug);

  if existing_row.id is null or existing_row.name is distinct from requested_name then
    chosen_slug := base_slug;
    loop
      exit when not exists (
        select 1
        from public.music_tournaments t
        where t.slug = chosen_slug
          and (existing_row.id is null or t.id <> existing_row.id)
      );
      chosen_slug := base_slug || '-' || slug_counter::text;
      slug_counter := slug_counter + 1;
    end loop;
  end if;

  if existing_row.id is null then
    insert into public.music_tournaments (
      owner_id,
      name,
      slug,
      visibility,
      playlist_id,
      playlist_name,
      playlist_cover_url,
      spotify_playlist_url,
      playlist_owner_name,
      entrants,
      rounds,
      picks,
      main_draw_size
    )
    values (
      me,
      requested_name,
      chosen_slug,
      normalized_visibility,
      trim(coalesce(target_playlist_id, '')),
      trim(coalesce(target_playlist_name, '')),
      nullif(trim(coalesce(target_playlist_cover_url, '')), ''),
      nullif(trim(coalesce(target_spotify_playlist_url, '')), ''),
      nullif(trim(coalesce(target_playlist_owner_name, '')), ''),
      coalesce(target_entrants, '[]'::jsonb),
      coalesce(target_rounds, '[]'::jsonb),
      coalesce(target_picks, '{}'::jsonb),
      greatest(coalesce(target_main_draw_size, 0), 0)
    )
    returning * into existing_row;

    insert into public.music_tournament_members (tournament_id, user_id, role, invited_by)
    values (existing_row.id, me, 'owner', me)
    on conflict on constraint music_tournament_members_pkey do update
      set role = 'owner';

    return query
    select existing_row.id as tournament_id, existing_row.slug as tournament_slug, true as created_new;
    return;
  end if;

  update public.music_tournaments
  set
    name = requested_name,
    slug = chosen_slug,
    visibility = normalized_visibility,
    playlist_id = trim(coalesce(target_playlist_id, '')),
    playlist_name = trim(coalesce(target_playlist_name, '')),
    playlist_cover_url = nullif(trim(coalesce(target_playlist_cover_url, '')), ''),
    spotify_playlist_url = nullif(trim(coalesce(target_spotify_playlist_url, '')), ''),
    playlist_owner_name = nullif(trim(coalesce(target_playlist_owner_name, '')), ''),
    entrants = coalesce(target_entrants, '[]'::jsonb),
    rounds = coalesce(target_rounds, '[]'::jsonb),
    picks = coalesce(target_picks, '{}'::jsonb),
    main_draw_size = greatest(coalesce(target_main_draw_size, 0), 0),
    updated_at = now()
  where id = existing_row.id
  returning * into existing_row;

  insert into public.music_tournament_members (tournament_id, user_id, role, invited_by)
  values (existing_row.id, me, 'owner', me)
  on conflict on constraint music_tournament_members_pkey do update
    set role = 'owner';

  return query
  select existing_row.id as tournament_id, existing_row.slug as tournament_slug, false as created_new;
end;
$$;

grant execute on function public.upsert_my_music_tournament(uuid, text, text, text, text, text, text, text, jsonb, jsonb, jsonb, integer) to authenticated;

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
    where t.visibility = 'public'
       or auth.uid() = t.owner_id
       or exists (
         select 1
         from public.music_tournament_members m
         where m.tournament_id = t.id
           and m.user_id = auth.uid()
       )
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
  picks jsonb,
  main_draw_size integer,
  created_at timestamptz,
  updated_at timestamptz,
  is_owner boolean,
  is_member boolean,
  can_vote boolean,
  participants jsonb
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
    limit 1
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
    target.picks,
    target.main_draw_size,
    target.created_at,
    target.updated_at,
    target.is_owner,
    target.is_member,
    target.can_vote,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'user_id', m.user_id,
          'username', p.username,
          'avatar_url', p.avatar_url,
          'role', m.role
        )
        order by case when m.role = 'owner' then 0 else 1 end, lower(p.username), p.username
      )
      from public.music_tournament_members m
      join public.profiles p on p.id = m.user_id
      where m.tournament_id = target.id
    ), '[]'::jsonb) as participants
  from target
  join public.profiles owner_profile on owner_profile.id = target.owner_id;
$$;

grant execute on function public.get_music_tournament_detail_by_slug(text) to anon, authenticated;

create or replace function public.set_music_tournament_picks(target_tournament_id uuid, next_picks jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  allowed boolean := false;
begin
  if me is null then
    return false;
  end if;

  select (
    t.visibility = 'public'
    or t.owner_id = me
    or exists (
      select 1
      from public.music_tournament_members m
      where m.tournament_id = t.id
        and m.user_id = me
    )
  )
    into allowed
  from public.music_tournaments t
  where t.id = target_tournament_id
  limit 1;

  if coalesce(allowed, false) is not true then
    return false;
  end if;

  update public.music_tournaments
  set picks = coalesce(next_picks, '{}'::jsonb),
      updated_at = now()
  where id = target_tournament_id;

  return found;
end;
$$;

grant execute on function public.set_music_tournament_picks(uuid, jsonb) to authenticated;

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

  return query
  select friend_target, friend_name;
end;
$$;

grant execute on function public.invite_friend_to_music_tournament(uuid, text) to authenticated;

create or replace function public.create_music_tournament_invite(target_tournament_id uuid)
returns table (
  invite_code text,
  invite_url text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  target_slug text;
  target_owner uuid;
  generated_code text;
begin
  if me is null then
    raise exception 'Not signed in.';
  end if;

  select t.slug, t.owner_id
    into target_slug, target_owner
  from public.music_tournaments t
  where t.id = target_tournament_id
  limit 1;

  if target_slug is null then
    raise exception 'Tournament not found.';
  end if;
  if target_owner <> me then
    raise exception 'Only the tournament owner can create invite links.';
  end if;

  loop
    generated_code := lower(encode(gen_random_bytes(12), 'hex'));
    exit when not exists (
      select 1
      from public.music_tournament_invites i
      where i.code = generated_code
    );
  end loop;

  insert into public.music_tournament_invites (tournament_id, code, created_by)
  values (target_tournament_id, generated_code, me);

  return query
  select generated_code, format('https://paiden.com/all-tournaments/%s?invite=%s', target_slug, generated_code);
end;
$$;

grant execute on function public.create_music_tournament_invite(uuid) to authenticated;

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
