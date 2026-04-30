drop function if exists public.admin_set_profile_avatar(uuid, text);

create or replace function public.admin_set_profile_avatar(target_profile_id uuid, next_avatar_url text)
returns table (
  profile_id uuid,
  username text,
  avatar_url text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  me uuid := auth.uid();
  requester_username text;
  normalized_avatar_url text := coalesce(nullif(trim(coalesce(next_avatar_url, '')), ''), '/images/default_pfp.jpg');
begin
  if me is null then
    raise exception 'Not signed in.';
  end if;

  select lower(trim(p.username))
    into requester_username
  from public.profiles p
  where p.id = me
  limit 1;

  if requester_username is distinct from 'paiden' then
    raise exception 'Only paiden can manage account avatars.';
  end if;

  if target_profile_id is null then
    raise exception 'Choose an account first.';
  end if;

  update public.profiles p
  set avatar_url = normalized_avatar_url,
      updated_at = now()
  where p.id = target_profile_id
  returning p.id, p.username, p.avatar_url
    into profile_id, username, avatar_url;

  if profile_id is null then
    raise exception 'Account not found.';
  end if;

  update auth.users u
  set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('avatar_url', normalized_avatar_url)
  where u.id = target_profile_id;

  return next;
end;
$$;

grant execute on function public.admin_set_profile_avatar(uuid, text) to authenticated;
