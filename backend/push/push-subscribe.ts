import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function extractBearerToken(authorizationHeader: string) {
  if (!authorizationHeader) return "";
  const trimmed = String(authorizationHeader).trim();
  if (!trimmed.toLowerCase().startsWith("bearer ")) return "";
  return trimmed.slice(7).trim();
}

function normalizeSubscription(input: any) {
  const endpoint = input && typeof input.endpoint === "string" ? input.endpoint.trim() : "";
  const p256dh = input && input.keys && typeof input.keys.p256dh === "string"
    ? input.keys.p256dh.trim()
    : "";
  const auth = input && input.keys && typeof input.keys.auth === "string"
    ? input.keys.auth.trim()
    : "";

  if (!endpoint || !p256dh || !auth) return null;
  return { endpoint, p256dh, auth };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Server is missing Supabase service configuration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const subscription = normalizeSubscription(body && body.subscription ? body.subscription : body);
    if (!subscription) {
      return new Response(JSON.stringify({ error: "Invalid push subscription payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const bearerToken = extractBearerToken(authHeader);
    let authUserId = null;
    if (bearerToken && bearerToken !== SERVICE_ROLE_KEY) {
      const { data: userData, error: userError } = await admin.auth.getUser(bearerToken);
      if (!userError && userData?.user?.id) {
        authUserId = userData.user.id;
      }
    }

    const upsertPayload: Record<string, unknown> = {
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      user_agent: req.headers.get("user-agent") || null,
      is_active: true,
      updated_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    };

    // Preserve any existing account linkage when a device sync occurs without a live auth session.
    if (authUserId) {
      upsertPayload.user_id = authUserId;
    }

    const { error } = await admin.from("push_subscriptions").upsert(upsertPayload, { onConflict: "endpoint" });

    if (error) {
      console.error("push_subscriptions upsert failed:", error);
      return new Response(JSON.stringify({ error: "Could not save subscription" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method === "DELETE") {
    const body = await req.json().catch(() => ({}));
    const endpoint = body && typeof body.endpoint === "string" ? body.endpoint.trim() : "";
    if (!endpoint) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error } = await admin
      .from("push_subscriptions")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("endpoint", endpoint);

    if (error) {
      console.error("push_subscriptions deactivate failed:", error);
      return new Response(JSON.stringify({ error: "Could not disable subscription" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
