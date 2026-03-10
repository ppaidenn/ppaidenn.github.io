(() => {
  const LS_ENABLED = "paiden_notifications_enabled";
  const SUPABASE_URL = "https://irauuqhqqkctcwulqzsw.supabase.co";
  const SUPABASE_KEY = "sb_publishable_93dGo8oZILIYg9NSotz9MQ_T8v22oXR";
  const PUSH_SUBSCRIBE_FN = "push-subscribe";
  const PUSH_CONFIG_FN = "push-config";

  let cachedPublicKey = "";

  async function getAuthBearer() {
    try {
      if (window.PaidenAuth && typeof window.PaidenAuth.getAccessToken === "function") {
        const token = await window.PaidenAuth.getAccessToken();
        if (token) return token;
      }
    } catch (_) {
      // Fall back to anon key.
    }
    return SUPABASE_KEY;
  }

  function isEnabled() {
    return localStorage.getItem(LS_ENABLED) === "1";
  }

  function setEnabled(v) {
    localStorage.setItem(LS_ENABLED, v ? "1" : "0");
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  async function ensureSw() {
    if (!("serviceWorker" in navigator)) {
      throw new Error("Service workers are not supported in this browser.");
    }
    await navigator.serviceWorker.register("/notifications-sw.js", { scope: "/" });
    return navigator.serviceWorker.ready;
  }

  async function getVapidPublicKey() {
    if (cachedPublicKey) return cachedPublicKey;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/${PUSH_CONFIG_FN}`, {
      method: "GET",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(msg || "Could not load push configuration.");
    }

    const json = await res.json().catch(() => ({}));
    const key = json && typeof json.publicKey === "string" ? json.publicKey.trim() : "";
    if (!key) {
      throw new Error("Push public key is missing on server.");
    }

    cachedPublicKey = key;
    return key;
  }

  async function syncSubscriptionToServer(subscription) {
    const bearer = await getAuthBearer();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${PUSH_SUBSCRIBE_FN}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify({ subscription }),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(msg || "Could not save push subscription.");
    }
  }

  async function removeSubscriptionFromServer(endpoint) {
    if (!endpoint) return;
    const bearer = await getAuthBearer();
    await fetch(`${SUPABASE_URL}/functions/v1/${PUSH_SUBSCRIBE_FN}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify({ endpoint }),
    }).catch(() => {
      // Best-effort cleanup on server.
    });
  }

  async function enableNotifications() {
    if (!window.isSecureContext) {
      return { ok: false, message: "Notifications require HTTPS." };
    }
    if (!("Notification" in window)) {
      return { ok: false, message: "This browser does not support notifications." };
    }
    if (!("PushManager" in window)) {
      return { ok: false, message: "Push notifications are not supported on this device/browser." };
    }

    try {
      const reg = await ensureSw();
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setEnabled(false);
        return { ok: false, message: "Permission was not granted." };
      }

      let subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        const publicKey = await getVapidPublicKey();
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      await syncSubscriptionToServer(subscription.toJSON());
      setEnabled(true);
      return { ok: true, message: "Background push notifications enabled." };
    } catch (err) {
      console.error("Enable notifications failed:", err);
      setEnabled(false);
      return { ok: false, message: "Could not enable push notifications." };
    }
  }

  async function disableNotifications() {
    try {
      const reg = await ensureSw();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe().catch(() => {
          // Continue to backend cleanup.
        });
        await removeSubscriptionFromServer(endpoint);
      }
      setEnabled(false);
      return { ok: true, message: "Notifications disabled." };
    } catch (err) {
      console.error("Disable notifications failed:", err);
      setEnabled(false);
      return { ok: false, message: "Could not fully disable notifications." };
    }
  }

  async function syncCurrentSubscription() {
    try {
      const reg = await ensureSw();
      const subscription = await reg.pushManager.getSubscription();
      if (!subscription) return { ok: false, message: "No active subscription to sync." };
      await syncSubscriptionToServer(subscription.toJSON());
      return { ok: true, message: "Push subscription synced." };
    } catch (err) {
      console.error("Sync subscription failed:", err);
      return { ok: false, message: "Could not sync push subscription." };
    }
  }

  function getStatus() {
    const supported = "Notification" in window;
    return {
      enabled: isEnabled(),
      permission: supported ? Notification.permission : "unsupported",
      supported,
      pushSupported: "PushManager" in window && "serviceWorker" in navigator,
    };
  }

  window.PaidenNotify = {
    enableNotifications,
    disableNotifications,
    syncCurrentSubscription,
    getStatus,
  };

  if ("serviceWorker" in navigator) {
    ensureSw().catch(() => {
      // Non-fatal.
    });
  }

  window.addEventListener("focus", () => {
    if (isEnabled()) {
      syncCurrentSubscription().catch(() => {});
    }
  });
})();
