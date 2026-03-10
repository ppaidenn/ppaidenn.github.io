import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@paiden.com";
const SITE_URL = Deno.env.get("SITE_URL") || "https://paiden.com";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function extractBearerToken(authorizationHeader: string) {
  if (!authorizationHeader) return "";
  const trimmed = String(authorizationHeader).trim();
  if (!trimmed.toLowerCase().startsWith("bearer ")) return "";
  return trimmed.slice(7).trim();
}

function buildPayload(type: string, actorUsername: string, body: any) {
  const safeActor = String(actorUsername || "Someone").trim() || "Someone";

  if (type === "friend_request") {
    return {
      title: "paiden.com",
      body: `New Friend Request\n${safeActor} sent you a friend request.`,
      url: `${SITE_URL}/profile`,
      tag: "friend-request",
    };
  }

  if (type === "event_invite") {
    const eventTitle = String(body?.event_title || "an event").trim() || "an event";
    const isUpdate = body?.is_update === true;
    return {
      title: "paiden.com",
      body: `${isUpdate ? "Event Updated" : "Event Invite"}\n${safeActor} ${isUpdate ? "updated" : "invited you to"} ${eventTitle}.`,
      url: `${SITE_URL}/profile`,
      tag: isUpdate ? `event-update-${eventTitle}` : `event-invite-${eventTitle}`,
    };
  }

  if (type === "friend_removed") {
    return {
      title: "paiden.com",
      body: `${safeActor} removed you as a friend.`,
      url: `${SITE_URL}/profile`,
      tag: "friend-removed",
    };
  }

  if (type === "event_reminder") {
    const eventTitle = String(body?.event_title || "an event").trim() || "an event";
    const startLabel = String(body?.starts_at_label || "").trim();
    return {
      title: "paiden.com",
      body: startLabel
        ? `1-Hour Reminder\n${eventTitle} starts at ${startLabel}.`
        : `1-Hour Reminder\n${eventTitle} starts in one hour.`,
      url: `${SITE_URL}/profile`,
      tag: `event-reminder-${eventTitle}`,
    };
  }

  return {
    title: "paiden.com",
    body: "New activity on paiden.com.",
    url: `${SITE_URL}/profile`,
    tag: "paiden-activity",
  };
}

async function sendPushToUserIds(userIds: string[], payload: Record<string, string>) {
  if (!Array.isArray(userIds) || !userIds.length) return;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("Push skipped: missing VAPID keys.");
    return;
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const { data: subscriptions, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("is_active", true)
    .in("user_id", userIds);

  if (error) {
    console.error("Failed to load targeted push subscriptions:", error);
    return;
  }

  console.log("push-notify targeted subscriptions", {
    requestedUserIds: userIds,
    matchedSubscriptions: Array.isArray(subscriptions) ? subscriptions.length : 0,
  });

  if (!Array.isArray(subscriptions) || !subscriptions.length) return;

  const staleIds: string[] = [];
  const payloadJson = JSON.stringify(payload);

  for (const sub of subscriptions) {
    const subscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };
    try {
      await webpush.sendNotification(subscription, payloadJson, { TTL: 120 });
    } catch (err) {
      const statusCode = err && typeof err.statusCode === "number" ? err.statusCode : 0;
      if (statusCode === 404 || statusCode === 410) staleIds.push(sub.id);
    }
  }

  if (staleIds.length) {
    await admin
      .from("push_subscriptions")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in("id", staleIds);
  }
}

async function filterRecipientUserIdsByPreference(type: string, userIds: string[]) {
  if (!Array.isArray(userIds) || !userIds.length) return [];
  const { data, error } = await admin
    .from("notification_preferences")
    .select("user_id, notify_friend_request, notify_friend_removed, notify_event_invite, notify_event_one_hour")
    .in("user_id", userIds);

  if (error) {
    console.error("Failed to load notification preferences:", error);
    return userIds;
  }

  const prefMap = new Map(
    (Array.isArray(data) ? data : []).map((row) => [String(row.user_id), row]),
  );

  return userIds.filter((userId) => {
    const pref = prefMap.get(String(userId));
    if (!pref) return true;
    if (type === "friend_request") return pref.notify_friend_request !== false;
    if (type === "friend_removed") return pref.notify_friend_removed !== false;
    if (type === "event_invite") return pref.notify_event_invite !== false;
    if (type === "event_reminder") return pref.notify_event_one_hour !== false;
    return true;
  });
}

async function resolveRecipientUserIds(type: string, body: any) {
  if (type === "friend_request") {
    const targetUsername = String(body?.target_username || "").trim();
    if (!targetUsername) return [];
    const { data } = await admin
      .from("profiles")
      .select("id")
      .ilike("username", targetUsername)
      .limit(1);
    return Array.isArray(data) && data[0]?.id ? [String(data[0].id)] : [];
  }

  if (type === "event_invite") {
    const usernames = Array.isArray(body?.target_usernames) ? body.target_usernames : [];
    const cleanUsernames = usernames.map((name: unknown) => String(name || "").trim()).filter(Boolean);
    if (!cleanUsernames.length) return [];
    const { data, error } = await admin
      .from("profiles")
      .select("id, username");
    if (error) {
      console.error("Failed to resolve event invite recipients:", error);
      return [];
    }
    const lowered = cleanUsernames.map((name) => name.toLowerCase());
    return Array.isArray(data)
      ? data
        .filter((row) => lowered.includes(String(row.username || "").trim().toLowerCase()))
        .map((row) => String(row.id))
        .filter(Boolean)
      : [];
  }

  return [];
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

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const bearerToken = extractBearerToken(authHeader);
  if (!bearerToken) {
    return new Response(JSON.stringify({ error: "Missing auth token." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: userData, error: userError } = await admin.auth.getUser(bearerToken);
  if (userError || !userData?.user?.id) {
    return new Response(JSON.stringify({ error: "Invalid auth token." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: actorProfile } = await admin
    .from("profiles")
    .select("username")
    .eq("id", userData.user.id)
    .maybeSingle();

  const body = await req.json().catch(() => ({}));
  const type = String(body?.type || "").trim();
  if (!type) {
    return new Response(JSON.stringify({ error: "Missing notification type." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const recipientUserIds = await resolveRecipientUserIds(type, body);
  const filteredRecipientUserIds = await filterRecipientUserIdsByPreference(type, recipientUserIds);
  console.log("push-notify resolved recipients", {
    type,
    actorUserId: userData.user.id,
    targetUsername: body?.target_username || null,
    targetUsernames: Array.isArray(body?.target_usernames) ? body.target_usernames : [],
    recipientUserIds,
    filteredRecipientUserIds,
  });
  if (!filteredRecipientUserIds.length) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const payload = buildPayload(type, String(actorProfile?.username || userData.user.email || "Someone"), body);
  await sendPushToUserIds(filteredRecipientUserIds, payload);

  return new Response(JSON.stringify({ ok: true, sent_to: filteredRecipientUserIds.length }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
