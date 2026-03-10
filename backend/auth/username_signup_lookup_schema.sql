create or replace function public.is_signup_username_taken(target_username text)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select
    lower(trim(coalesce(target_username, ''))) in (
      'resume',
      'photos',
      'blog',
      'contactme',
      'contact_me',
      'profile',
      'profile-view',
      'accounts',
      'signin',
      'create-account',
      'forgot-password',
      'reset-password',
      'notifications',
      'news',
      'images',
      'backend',
      'calendar',
      'cdn-cgi',
      'robots.txt',
      'sitemap.xml',
      'favicon.ico',
      'manifest.webmanifest'
    )
    or exists (
    select 1
    from auth.users u
    left join public.profiles p on p.id = u.id
    where lower(
      coalesce(
        nullif(trim(p.username), ''),
        nullif(trim(u.raw_user_meta_data ->> 'username'), '')
      )
    ) = lower(trim(coalesce(target_username, '')))
  );
$$;

grant execute on function public.is_signup_username_taken(text) to anon, authenticated;
