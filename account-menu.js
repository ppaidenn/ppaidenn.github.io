(() => {
  const SUPABASE_UMD = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts).find((s) => s.src === src);
      if (existing) {
        if (existing.dataset.loaded === "1") return resolve();
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.addEventListener("load", () => {
        s.dataset.loaded = "1";
        resolve();
      }, { once: true });
      s.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      document.head.appendChild(s);
    });
  }

  async function ensureAuthClient() {
    if (window.PaidenAuth) return true;
    try {
      if (!window.supabase) {
        await loadScript(SUPABASE_UMD);
      }
      if (!window.PaidenAuth) {
        await loadScript("/auth-client.js");
      }
      return !!window.PaidenAuth;
    } catch (_) {
      return false;
    }
  }

  function buildMenuHtml({ signedIn, isMobile, pendingCount }) {
    const count = Number.isFinite(pendingCount) ? pendingCount : 0;
    const badge = count > 0 ? `<span class="profile-request-badge">${count}</span>` : "";
    const triggerHref = signedIn ? "/profile/?v=20260304" : "/signin";
    const triggerInner = isMobile
      ? `<i class="fa-solid fa-user profile-icon" aria-hidden="true"></i>${badge}<span class="profile-label">Profile</span>`
      : `<span class="profile-label">Profile</span>${badge}<i class="fa-solid fa-user profile-icon" aria-hidden="true"></i>`;

    const links = signedIn
      ? `<a href="/profile/?v=20260304">View Profile${count > 0 ? ` <span class="profile-request-badge in-link">${count}</span>` : ""}</a>
         <a href="/accounts">All Accounts</a>
         <button type="button" class="profile-signout">Sign Out</button>`
      : `<a href="/signin">Sign In</a>
         <a href="/accounts">All Accounts</a>
         <a href="/create-account">Create Account</a>`;

    return `
<div class="profile-menu">
  <a href="${triggerHref}" class="profile-nav-link" aria-label="Profile" aria-expanded="false" aria-haspopup="menu">${triggerInner}</a>
  <div class="profile-dropdown" role="menu">
    ${links}
  </div>
</div>`;
  }

  function renderMenus(signedIn, pendingCount = 0) {
    const containers = document.querySelectorAll(".nav-items, .nav-links, .mobile-fixed-nav");
    containers.forEach((container) => {
      const isMobile = container.classList.contains("mobile-fixed-nav");
      const existing = container.querySelector(".profile-menu");
      if (existing) existing.remove();
      container.insertAdjacentHTML("beforeend", buildMenuHtml({ signedIn, isMobile, pendingCount }));
    });
    bindMenuInteractions();
  }

  function bindMenuInteractions() {
    document.querySelectorAll(".profile-menu").forEach((menu) => {
      if (menu.dataset.bound === "1") return;
      menu.dataset.bound = "1";

      const trigger = menu.querySelector(".profile-nav-link");
      if (trigger) {
        trigger.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const willOpen = !menu.classList.contains("is-open");
          closeAllProfileMenus(menu);
          menu.classList.toggle("is-open", willOpen);
          trigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
        });
      }

      const signOutBtn = menu.querySelector(".profile-signout");
      if (signOutBtn) {
        signOutBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          handleSignOut();
        });
      }
    });
  }

  async function resolveAuthState() {
    const hasClient = await ensureAuthClient();
    if (!hasClient || !window.PaidenAuth) return { signedIn: false, profile: null, pendingCount: 0 };
    const res = await window.PaidenAuth.getCurrentProfile();
    if (!res || !res.ok || !res.user) return { signedIn: false, profile: null, pendingCount: 0 };
    let pendingCount = 0;
    let pendingEventInvites = 0;
    let unreadInboxCount = 0;
    try {
      const client = window.PaidenAuth.getClient();
      const { data } = await client.rpc("get_my_pending_request_count");
      pendingCount = Number.isFinite(Number(data)) ? Number(data) : 0;
      const { data: inviteData } = await client.rpc("get_my_pending_event_invites");
      pendingEventInvites = Array.isArray(inviteData) ? inviteData.length : 0;
      const { data: inboxUnread } = await client.rpc("get_my_unread_notification_count");
      unreadInboxCount = Number.isFinite(Number(inboxUnread)) ? Number(inboxUnread) : 0;
    } catch (_) {
      pendingCount = 0;
      pendingEventInvites = 0;
      unreadInboxCount = 0;
    }
    return { signedIn: true, profile: res.profile || null, pendingCount: Math.max(pendingCount + pendingEventInvites, unreadInboxCount) };
  }

  async function handleSignOut() {
    if (window.PaidenAuth) {
      await window.PaidenAuth.signOut().catch(() => {});
    }
    renderMenus(false, 0);
    window.location.href = "/";
  }

  function closeAllProfileMenus(exceptMenu = null) {
    document.querySelectorAll(".profile-menu.is-open").forEach((menu) => {
      if (exceptMenu && menu === exceptMenu) return;
      menu.classList.remove("is-open");
      const trigger = menu.querySelector(".profile-nav-link");
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    });
  }

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".profile-menu")) {
      closeAllProfileMenus();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeAllProfileMenus();
  });

  renderMenus(false, 0);
  resolveAuthState().then(({ signedIn, pendingCount }) => {
    renderMenus(!!signedIn, pendingCount || 0);
  });
})();
