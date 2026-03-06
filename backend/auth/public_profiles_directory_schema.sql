create or replace function public.get_all_public_profiles()
returns table (
  username text,
  avatar_url text
)
language sql
security definer
set search_path = public
as $$
  select
    p.username,
    p.avatar_url
  from public.profiles p
  where coalesce(trim(p.username), '') <> ''
  order by lower(p.username), p.username;
$$;

grant execute on function public.get_all_public_profiles() to anon, authenticated;
