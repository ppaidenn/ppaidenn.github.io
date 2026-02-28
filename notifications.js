(() => {
  const LS_ENABLED = "paiden_notifications_enabled";
  const LS_LAST_TS = "paiden_notifications_last_post_ts";
  const POLL_MS = 60000;
  const SUPABASE_URL = "https://irauuqhqqkctcwulqzsw.supabase.co";
  const SUPABASE_KEY = "sb_publishable_93dGo8oZILIYg9NSotz9MQ_T8v22oXR";

  let pollTimer = null;

  function isEnabled() {
    return localStorage.getItem(LS_ENABLED) === "1";
  }

  function setEnabled(v) {
    localStorage.setItem(LS_ENABLED, v ? "1" : "0");
  }

  function getLastTs() {
    return localStorage.getItem(LS_LAST_TS) || "";
  }

  function setLastTs(ts) {
    if (ts) localStorage.setItem(LS_LAST_TS, ts);
  }

  async function getLatestPost() {
    const url =
      `${SUPABASE_URL}/rest/v1/posts` +
      `?select=id,title,created_at&order=created_at.desc&limit=1`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows) || !rows.length) return null;
    return rows[0];
  }

  async function showSiteNotification(title, body, url = "/blog") {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: "/images/favicon.png",
          badge: "/images/favicon.png",
          data: { url },
        });
      } else {
        new Notification(title, { body, icon: "/images/favicon.png" });
      }
    } catch (_) {
      // Ignore notification display failures.
    }
  }

  async function checkOnce({ seedIfEmpty = false } = {}) {
    try {
      const latest = await getLatestPost();
      if (!latest || !latest.created_at) return;
      const last = getLastTs();
      if (!last) {
        if (seedIfEmpty) setLastTs(latest.created_at);
        return;
      }
      if (Date.parse(latest.created_at) > Date.parse(last)) {
        setLastTs(latest.created_at);
        await showSiteNotification(
          "New blog post",
          latest.title ? String(latest.title) : "A new post was published.",
          "/blog"
        );
      }
    } catch (_) {
      // Keep polling even if one fetch fails.
    }
  }

  async function startPolling() {
    if (!isEnabled()) return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (!pollTimer) {
      pollTimer = setInterval(() => checkOnce(), POLL_MS);
    }
    await checkOnce({ seedIfEmpty: true });
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  async function ensureSw() {
    if (!("serviceWorker" in navigator)) return;
    try {
      await navigator.serviceWorker.register("/notifications-sw.js", { scope: "/" });
    } catch (_) {
      // Non-fatal.
    }
  }

  async function enableNotifications() {
    if (!("Notification" in window)) {
      return { ok: false, message: "This browser does not support notifications." };
    }
    await ensureSw();
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setEnabled(false);
      stopPolling();
      return { ok: false, message: "Permission was not granted." };
    }
    setEnabled(true);
    const latest = await getLatestPost();
    if (latest && latest.created_at) setLastTs(latest.created_at);
    await startPolling();
    return { ok: true, message: "Notifications enabled." };
  }

  function disableNotifications() {
    setEnabled(false);
    stopPolling();
    return { ok: true, message: "Notifications disabled." };
  }

  function getStatus() {
    const permission = ("Notification" in window) ? Notification.permission : "unsupported";
    return {
      enabled: isEnabled(),
      permission,
      supported: "Notification" in window,
    };
  }

  window.PaidenNotify = {
    enableNotifications,
    disableNotifications,
    getStatus,
    checkNow: () => checkOnce(),
  };

  if ("serviceWorker" in navigator) {
    ensureSw();
  }
  if (document.readyState === "complete" || document.readyState === "interactive") {
    startPolling();
  } else {
    document.addEventListener("DOMContentLoaded", () => startPolling(), { once: true });
  }
})();

