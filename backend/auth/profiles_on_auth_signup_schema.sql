create or replace function public.handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    username,
    email,
    avatar_url,
    bio,
    silly_question,
    silly_answer,
    security_question,
    security_answer
  )
  values (
    new.id,
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
        split_part(coalesce(new.email, ''), '@', 1),
        'User'
      ),
      80
    ),
    lower(trim(new.email)),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), ''), '/images/default_pfp.jpg'),
    nullif(trim(new.raw_user_meta_data ->> 'bio'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'silly_question'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'silly_answer'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'security_question'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'security_answer'), '')
  )
  on conflict (id) do update
  set
    username = excluded.username,
    email = excluded.email,
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    silly_question = coalesce(public.profiles.silly_question, excluded.silly_question),
    security_question = coalesce(public.profiles.security_question, excluded.security_question),
    security_answer = coalesce(public.profiles.security_answer, excluded.security_answer),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created_profile on auth.users;
create trigger trg_on_auth_user_created_profile
after insert on auth.users
for each row
execute function public.handle_new_auth_user_profile();
