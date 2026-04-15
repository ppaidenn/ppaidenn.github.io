import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@paiden.com";
const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";
const SITE_URL = Deno.env.get("SITE_URL") || "https://paiden.com";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function buildReminderPayload(row: {
  title?: string;
  starts_at?: string;
}) {
  const title = String(row?.title || "Your event").trim() || "Your event";
  let startLabel = "";
  try {
    startLabel = new Date(String(row?.starts_at || "")).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch (_) {
    startLabel = "";
  }
  const body = startLabel
    ? `1-Hour Reminder\n${title} starts at ${startLabel}.`
    : `1-Hour Reminder\n${title} starts in one hour.`;
  const url = `${SITE_URL}/profile`;
  const tag = `event-reminder-${title}`;
  return {
    title: "paiden.com",
    body,
    url,
    tag,
    web_push: 8030,
    notification: {
      title: "paiden.com",
      body,
      navigate: url,
      tag,
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing Supabase configuration." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return new Response(JSON.stringify({ error: "Missing VAPID configuration." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const runAt = new Date().toISOString();
  const { data: reminders, error: remindersError } = await admin.rpc("claim_due_event_one_hour_reminders", {
    run_at: runAt,
  });

  if (remindersError) {
    console.error("Failed to claim event reminders:", remindersError);
    return new Response(JSON.stringify({ error: "Could not load reminders." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rows = Array.isArray(reminders) ? reminders : [];
  if (!rows.length) {
    return new Response(JSON.stringify({ ok: true, reminders: 0, notifications: 0 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const recipientIds = Array.from(new Set(rows.map((row) => String(row.recipient_id || "")).filter(Boolean)));
  const { data: subscriptions, error: subscriptionError } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .eq("is_active", true)
    .in("user_id", recipientIds);

  if (subscriptionError) {
    console.error("Failed to load reminder subscriptions:", subscriptionError);
    return new Response(JSON.stringify({ error: "Could not load subscriptions." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const subscriptionsByUser = new Map<string, Array<Record<string, string>>>();
  (Array.isArray(subscriptions) ? subscriptions : []).forEach((sub) => {
    const userId = String(sub.user_id || "");
    if (!userId) return;
    const list = subscriptionsByUser.get(userId) || [];
    list.push(sub);
    subscriptionsByUser.set(userId, list);
  });

  let sentCount = 0;
  const staleIds: string[] = [];

  const inboxRows = rows.map((row) => {
    const payload = buildReminderPayload(row);
    return {
      user_id: String(row.recipient_id || ""),
      type: "event_reminder",
      title: String(payload.title || "paiden.com"),
      body: String(payload.body || "Event reminder"),
      link_url: String(payload.url || `${SITE_URL}/profile`),
      actor_user_id: null,
      actor_username: String(row.owner_username || "").trim() || null,
      entity_type: "event",
      entity_id: String(row.event_id || "").trim() || null,
    };
  }).filter((row) => row.user_id);

  if (inboxRows.length) {
    const { error: inboxError } = await admin.from("notifications_inbox").insert(inboxRows);
    if (inboxError) {
      console.error("Failed to insert event reminder inbox rows:", inboxError);
    }
  }

  for (const row of rows) {
    const userId = String(row.recipient_id || "");
    const targets = subscriptionsByUser.get(userId) || [];
    if (!targets.length) continue;
    const payloadJson = JSON.stringify(buildReminderPayload(row));
    for (const sub of targets) {
      const subscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };
      try {
        await webpush.sendNotification(subscription, payloadJson, { TTL: 300 });
        sentCount += 1;
      } catch (err) {
        const statusCode = err && typeof err.statusCode === "number" ? err.statusCode : 0;
        if (statusCode === 404 || statusCode === 410) staleIds.push(String(sub.id || ""));
        console.error("Event reminder push failed:", statusCode, String(err?.body || err?.message || ""));
      }
    }
  }

  if (staleIds.length) {
    await admin
      .from("push_subscriptions")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in("id", staleIds.filter(Boolean));
  }

  return new Response(JSON.stringify({ ok: true, reminders: rows.length, notifications: sentCount }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
