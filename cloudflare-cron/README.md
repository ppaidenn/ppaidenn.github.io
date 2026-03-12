Cloudflare cron worker for paiden.com event reminders.

Deploy this folder as its own Worker project.

Required Cloudflare variables/secrets:
- SUPABASE_REMINDER_URL
- CRON_SECRET

Recommended cron:
- */15 * * * *
