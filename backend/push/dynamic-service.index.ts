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
const TURNSTILE_SECRET = Deno.env.get("TURNSTILE_SECRET") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const NOTIFY_EMAIL = Deno.env.get("NOTIFY_EMAIL") || "";
const RATE_LIMIT_SECONDS = Number(Deno.env.get("POST_RATE_LIMIT_SECONDS") || "300");
const ADMIN_ACTION_SECRET = Deno.env.get("ADMIN_ACTION_SECRET") || "";
const ADMIN_BLOCK_FUNCTION = Deno.env.get("ADMIN_BLOCK_FUNCTION") || "admin-block-ip";
const BLOG_PUBLIC_URL = Deno.env.get("BLOG_PUBLIC_URL") || "https://paiden.com/blog";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || (NOTIFY_EMAIL ? `mailto:${NOTIFY_EMAIL}` : "mailto:admin@paiden.com");

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function extractBearerToken(authorizationHeader: string) {
  if (!authorizationHeader) return "";
  const trimmed = String(authorizationHeader).trim();
  if (!trimmed.toLowerCase().startsWith("bearer ")) return "";
  return trimmed.slice(7).trim();
}

async function hashValue(value) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sendEmail(html) {
  if (!RESEND_API_KEY || !NOTIFY_EMAIL) return;
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "onboarding@resend.dev",
      to: [NOTIFY_EMAIL],
      subject: "New Post Alert",
      html,
    }),
  });
  if (!resp.ok) {
    const msg = await resp.text().catch(() => "");
    console.error("Resend error:", msg);
  }
}

function buildPushPayload(postId, title, author, text) {
  const safeTitle = String(title || "New blog post").trim();
  const safeAuthor = String(author || "Anonymous").trim();
  const excerpt = String(text || "").replace(/\s+/g, " ").trim();
  const body = excerpt
    ? `${safeAuthor}: ${excerpt.slice(0, 120)}${excerpt.length > 120 ? "..." : ""}`
    : `${safeAuthor} published a new post.`;
  const url = postId ? `${BLOG_PUBLIC_URL}?post=${encodeURIComponent(String(postId))}` : BLOG_PUBLIC_URL;
  const tag = "new-post";

  return JSON.stringify({
    title: safeTitle,
    body,
    url,
    tag,
    web_push: 8030,
    notification: {
      title: safeTitle,
      body,
      navigate: url,
      tag,
    },
  });
}

async function sendPostPushNotifications(postId, title, author, text, authorUserId = "") {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("Push skipped: missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY.");
    return;
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const { data: subscriptions, error } = await admin
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth,user_id")
    .eq("is_active", true);

  if (error) {
    console.error("Failed to load push_subscriptions:", error);
    return;
  }

  if (!Array.isArray(subscriptions) || !subscriptions.length) return;

  const subscriptionUserIds = subscriptions.map((sub) => String(sub.user_id || "")).filter(Boolean);
  let allowedUserIdSet = new Set(subscriptionUserIds);
  if (subscriptionUserIds.length) {
    const { data: preferenceRows } = await admin
      .from("notification_preferences")
      .select("user_id, blog_post_mode")
      .in("user_id", subscriptionUserIds);

    const prefMap = new Map(
      (Array.isArray(preferenceRows) ? preferenceRows : []).map((row) => [String(row.user_id), String(row.blog_post_mode || "all")]),
    );

    allowedUserIdSet = new Set(subscriptionUserIds.filter((userId) => {
      const mode = prefMap.get(userId) || "all";
      return mode === "all";
    }));
  }

  const payload = buildPushPayload(postId, title, author, text);
  const staleIds = [];

  for (const sub of subscriptions) {
    if (sub.user_id && !allowedUserIdSet.has(String(sub.user_id))) continue;
    const subscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };
    try {
      await webpush.sendNotification(subscription, payload, { TTL: 120 });
    } catch (err) {
      const statusCode = err && typeof err.statusCode === "number" ? err.statusCode : 0;
      const bodyText = err && err.body ? String(err.body) : "";
      console.error("Push send failed:", statusCode, bodyText);
      if (statusCode === 404 || statusCode === 410) {
        staleIds.push(sub.id);
      }
    }
  }

  if (staleIds.length) {
    const { error: deactivateError } = await admin
      .from("push_subscriptions")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in("id", staleIds);
    if (deactivateError) {
      console.error("Failed to deactivate stale push subscriptions:", deactivateError);
    }
  }
}

function base64UrlEncode(input) {
  const b64 = btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return b64;
}

async function hmacHex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function makeBlockLink(hash, kind, source) {
  if (!ADMIN_ACTION_SECRET || !SUPABASE_URL) return "";
  const payload = {
    hash,
    kind,
    source,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 14,
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const sig = await hmacHex(ADMIN_ACTION_SECRET, payloadB64);
  const token = `${payloadB64}.${sig}`;
  return `${SUPABASE_URL}/functions/v1/${ADMIN_BLOCK_FUNCTION}?token=${encodeURIComponent(token)}`;
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

  const body = await req.json();
  const { title, author, body: text, images, turnstile_token, fingerprint } = body || {};
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const bearerToken = extractBearerToken(authHeader);
  let accountUserId = "";
  if (bearerToken) {
    const { data: userData, error: userError } = await admin.auth.getUser(bearerToken);
    if (!userError && userData?.user?.id) {
      accountUserId = userData.user.id;
    } else {
      console.warn("Auth token present but invalid for post link:", userError?.message || "Unknown auth error");
    }
  }
  const ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "0.0.0.0";
  const ip_hash = await hashValue(ip);
  const fingerprintRaw = typeof fingerprint === "string" ? fingerprint.trim() : "";
  const fingerprint_hash = fingerprintRaw ? await hashValue(fingerprintRaw.slice(0, 256)) : "";

  const { data: blocked } = await admin
    .from("blocked_ip_hashes")
    .select("ip_hash")
    .eq("ip_hash", ip_hash)
    .maybeSingle();
  if (blocked?.ip_hash) {
    return new Response(JSON.stringify({ error: "Blocked", message: "You're blocked pal \uD83D\uDE08, reach out to Paiden to appeal" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (fingerprint_hash) {
    const { data: blockedFingerprint } = await admin
      .from("blocked_fingerprint_hashes")
      .select("fingerprint_hash")
      .eq("fingerprint_hash", fingerprint_hash)
      .maybeSingle();
    if (blockedFingerprint?.fingerprint_hash) {
      return new Response(JSON.stringify({ error: "Blocked", message: "You're blocked pal \uD83D\uDE08, reach out to Paiden to appeal" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  if (!turnstile_token) {
    return new Response(JSON.stringify({ error: "Missing Turnstile token" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const form = new FormData();
  form.append("secret", TURNSTILE_SECRET);
  form.append("response", turnstile_token);

  const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  const verifyJson = await verify.json();

  if (!verifyJson.success) {
    return new Response(JSON.stringify({ error: "Turnstile failed" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!title || !text) {
    return new Response(JSON.stringify({ error: "Title and body required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: rl } = await admin
    .from("post_rate_limits")
    .select("last_post_at")
    .eq("ip_hash", ip_hash)
    .maybeSingle();

  if (rl?.last_post_at) {
    const last = new Date(rl.last_post_at).getTime();
    const elapsedMs = Date.now() - last;
    if (elapsedMs < RATE_LIMIT_SECONDS * 1000) {
      const waitSeconds = Math.max(1, Math.ceil((RATE_LIMIT_SECONDS * 1000 - elapsedMs) / 1000));
      return new Response(JSON.stringify({
        error: "Rate limit",
        wait_seconds: waitSeconds,
        message: `Please wait ${waitSeconds} second${waitSeconds === 1 ? "" : "s"} before sending another message.`,
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  await admin.from("post_rate_limits").upsert({
    ip_hash,
    last_post_at: new Date().toISOString(),
  });

  const { data: insertedPost, error } = await admin
    .from("posts")
    .insert([{
      title,
      author,
      body: text,
      images: Array.isArray(images) ? images : [],
      user_id: accountUserId || null,
    }])
    .select("id")
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: "Insert failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const blockIpLink = await makeBlockLink(ip_hash, "ip", "post");
  const blockFingerprintLink = fingerprint_hash ? await makeBlockLink(fingerprint_hash, "fingerprint", "post") : "";
  const postUrl = insertedPost?.id
    ? `${BLOG_PUBLIC_URL}?post=${encodeURIComponent(String(insertedPost.id))}`
    : BLOG_PUBLIC_URL;
  await sendEmail(
    `<p><strong>Title:</strong> ${title}</p>
       <p><strong>Author:</strong> ${author || "Anonymous"}</p>
       <p>${String(text).replace(/\n/g, "<br>")}</p>
       ${(postUrl || blockIpLink || blockFingerprintLink) ? `<p style="margin-top:14px;">` : ""}
       ${postUrl ? `<a href="${postUrl}" style="display:inline-block;padding:10px 14px;background:#d8dde6;color:#111;border-radius:8px;text-decoration:none;font-weight:700;margin-right:8px;">View Post</a>` : ""}
       ${blockIpLink ? `<a href="${blockIpLink}" style="display:inline-block;padding:10px 14px;background:#20242b;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;margin-right:8px;">Block This IP</a>` : ""}
       ${blockFingerprintLink ? `<a href="${blockFingerprintLink}" style="display:inline-block;padding:10px 14px;background:#4a5160;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;margin-right:8px;">Block This Device</a>` : ""}
       ${(postUrl || blockIpLink || blockFingerprintLink) ? `</p>` : ""}`,
  );

  await sendPostPushNotifications(insertedPost?.id, title, author, text, accountUserId);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
