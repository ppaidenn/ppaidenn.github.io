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
select
  u.id,
  left(
    coalesce(
      nullif(trim(p.username), ''),
      nullif(trim(u.raw_user_meta_data ->> 'username'), ''),
      split_part(coalesce(u.email, ''), '@', 1),
      'User'
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
