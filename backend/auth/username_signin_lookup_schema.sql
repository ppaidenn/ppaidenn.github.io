create or replace function public.get_signin_email_by_username(target_username text)
returns text
language sql
security definer
set search_path = public, auth
as $$
  select lower(trim(u.email))
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(p.username) = lower(trim(coalesce(target_username, '')))
  limit 1;
$$;

grant execute on function public.get_signin_email_by_username(text) to anon, authenticated;
