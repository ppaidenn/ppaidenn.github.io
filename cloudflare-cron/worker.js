export default {
  async scheduled(controller, env, ctx) {
    const response = await fetch(env.SUPABASE_REMINDER_URL, {
      method: "POST",
      headers: {
        "x-cron-secret": env.CRON_SECRET,
      },
    });

    const text = await response.text();
    console.log("push-event-reminders", response.status, text);
  },
};
