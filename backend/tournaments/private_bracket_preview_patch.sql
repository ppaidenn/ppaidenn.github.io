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
