insert into public.profiles (
  id,
  full_name,
  username,
  email,
  avatar_url,
  bio,
  silly_question,
  silly_answer,
  security_question,
  security_answer
)
select
  u.id,
  coalesce(
    nullif(trim(p.full_name), ''),
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), '')
  ) as full_name,
  left(
    coalesce(
      nullif(regexp_replace(lower(trim(p.username)), '[^a-z0-9_-]+', '', 'g'), ''),
      nullif(regexp_replace(lower(trim(u.raw_user_meta_data ->> 'username')), '[^a-z0-9_-]+', '', 'g'), ''),
      nullif(regexp_replace(lower(split_part(coalesce(u.email, ''), '@', 1)), '[^a-z0-9_-]+', '', 'g'), ''),
      'user'
    ),
    80
  ) as username,
  lower(trim(u.email)) as email,
  coalesce(
    nullif(trim(p.avatar_url), ''),
    nullif(trim(u.raw_user_meta_data ->> 'avatar_url'), ''),
    '/images/default_pfp.jpg'
  ) as avatar_url,
  coalesce(
    nullif(trim(p.bio), ''),
    nullif(trim(u.raw_user_meta_data ->> 'bio'), '')
  ) as bio,
  coalesce(
    nullif(trim(p.silly_question), ''),
    nullif(trim(u.raw_user_meta_data ->> 'silly_question'), '')
  ) as silly_question,
  coalesce(
    nullif(trim(p.silly_answer), ''),
    nullif(trim(u.raw_user_meta_data ->> 'silly_answer'), '')
  ) as silly_answer,
  coalesce(
    nullif(trim(p.security_question), ''),
    nullif(trim(u.raw_user_meta_data ->> 'security_question'), '')
  ) as security_question,
  coalesce(
    nullif(trim(p.security_answer), ''),
    nullif(trim(u.raw_user_meta_data ->> 'security_answer'), '')
  ) as security_answer
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
