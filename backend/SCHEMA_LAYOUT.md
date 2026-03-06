# Schema Layout

This folder is split by feature so SQL changes are easier to maintain.

## `backend/blog`
- `posts_schema.sql`: `posts` table + public read policy.
- `post_rate_limits_schema.sql`: `post_rate_limits` table.
- `comments_schema.sql`: `comments` table + read policy.
- `comment_rate_limits_schema.sql`: `comment_rate_limits` table.
- `blocked_hashes_schema.sql`: `blocked_ip_hashes` table.

## `backend/auth`
- `profiles_schema.sql`: `profiles` table, indexes, trigger, RLS, and profile RPCs:
  - `get_public_profiles`
  - `get_public_profiles_by_ids`
  - `get_public_profile_by_username`
- `public_profiles_directory_schema.sql`: public directory RPC:
  - `get_all_public_profiles` (drops/recreates function to avoid return-type conflicts)
- `posts_account_link_schema.sql`: adds `posts.user_id`.
- `friendships_schema.sql`: `friendships` table + RLS + RPCs:
  - `get_my_friends`
  - `add_friend_by_username`
  - `get_my_pending_request_count`
  - `get_my_friend_requests`
  - `get_my_outgoing_friend_requests`
  - `respond_to_friend_request`
  - `get_friend_public_profile`
- `email_signup_lookup_schema.sql`: signup helper RPC:
  - `is_signup_email_taken`
- `username_signin_lookup_schema.sql`: login helper RPC:
  - `get_signin_email_by_username`

## `backend/push`
- `push_subscriptions_schema.sql`: `push_subscriptions` table + trigger.

## `backend/calendar`
- `events_schema.sql`: calendar + invites:
  - `calendar_events` table
  - `event_invites` table
  - `create_event_with_invites`
  - `get_my_calendar_events`
  - `get_my_pending_event_invites`
  - `respond_to_event_invite`
  - `get_friend_calendar_events`

## Suggested Run Order (fresh setup)
1. `backend/blog/posts_schema.sql`
2. `backend/blog/post_rate_limits_schema.sql`
3. `backend/blog/comments_schema.sql`
4. `backend/blog/comment_rate_limits_schema.sql`
5. `backend/blog/blocked_hashes_schema.sql`
6. `backend/auth/profiles_schema.sql`
7. `backend/auth/public_profiles_directory_schema.sql`
8. `backend/auth/posts_account_link_schema.sql`
9. `backend/auth/friendships_schema.sql`
10. `backend/auth/email_signup_lookup_schema.sql`
11. `backend/auth/username_signin_lookup_schema.sql`
12. `backend/push/push_subscriptions_schema.sql`
13. `backend/calendar/events_schema.sql`
