create or replace function public.get_signin_email_by_username(target_username text)
returns text
language sql
security definer
set search_path = public, auth
as $$
  select lower(trim(u.email))
  from auth.users u
  left join public.profiles p on p.id = u.id
  where lower(
    coalesce(
      nullif(trim(p.username), ''),
      nullif(trim(u.raw_user_meta_data ->> 'username'), '')
    )
  ) = lower(trim(coalesce(target_username, '')))
  limit 1;
$$;

grant execute on function public.get_signin_email_by_username(text) to anon, authenticated;
