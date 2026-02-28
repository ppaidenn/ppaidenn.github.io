# Push Notifications (Phase 2)

This folder contains the backend pieces required for true background Web Push.

## Files

- `push_subscriptions_schema.sql`: creates `public.push_subscriptions`
- `push-config.ts`: edge function that returns the VAPID public key
- `push-subscribe.ts`: edge function to subscribe/unsubscribe devices
- `dynamic-service.index.ts`: updated post-create function that sends push on each new post

## Deploy Checklist

1. Run `push_subscriptions_schema.sql` in Supabase SQL editor.
2. Deploy edge functions:
   - `push-config.ts` as function name `push-config`
   - `push-subscribe.ts` as function name `push-subscribe`
   - `dynamic-service.index.ts` by updating your `dynamic-service` function source
3. Set env vars for `dynamic-service` and `push-config`:
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT` (optional, defaults to `mailto:admin@paiden.com`)
4. Keep existing vars already used by `dynamic-service` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc.).

## Generate VAPID Keys

Use any web-push keygen tool (for example `web-push generate-vapid-keys`) and store both keys in Supabase Edge Function secrets.
