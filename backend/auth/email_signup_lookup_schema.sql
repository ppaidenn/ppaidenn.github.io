create or replace function public.is_signup_email_taken(target_email text)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users u
    where lower(trim(u.email)) = lower(trim(coalesce(target_email, '')))
  );
$$;

grant execute on function public.is_signup_email_taken(text) to anon, authenticated;
