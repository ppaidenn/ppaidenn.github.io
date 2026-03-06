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

  function buildMenuHtml({ signedIn, isMobile }) {
    const summaryInner = isMobile
      ? '<i class="fa-solid fa-user profile-icon" aria-hidden="true"></i><span class="profile-label">Profile</span>'
      : '<span class="profile-label">Profile</span><i class="fa-solid fa-user profile-icon" aria-hidden="true"></i>';

    const links = signedIn
      ? `<a href="/profile/?v=20260304">View Profile</a>
         <a href="/accounts">All Accounts</a>
         <button type="button" class="profile-signout">Sign Out</button>`
      : `<a href="/signin">Sign In</a>
         <a href="/accounts">All Accounts</a>
         <a href="/create-account">Create Account</a>`;

    return `
<details class="profile-menu">
  <summary class="profile-nav-link" aria-label="Profile">${summaryInner}</summary>
  <div class="profile-dropdown">
    ${links}
  </div>
</details>`;
  }

  function renderMenus(signedIn) {
    const containers = document.querySelectorAll(".nav-items, .nav-links, .mobile-fixed-nav");
    containers.forEach((container) => {
      const isMobile = container.classList.contains("mobile-fixed-nav");
      const existing = container.querySelector(".profile-menu");
      if (existing) existing.remove();
      container.insertAdjacentHTML("beforeend", buildMenuHtml({ signedIn, isMobile }));
    });
  }

  async function resolveAuthState() {
    const hasClient = await ensureAuthClient();
    if (!hasClient || !window.PaidenAuth) return { signedIn: false, profile: null };
    const res = await window.PaidenAuth.getCurrentProfile();
    if (!res || !res.ok || !res.user) return { signedIn: false, profile: null };
    return { signedIn: true, profile: res.profile || null };
  }

  async function handleSignOut() {
    if (window.PaidenAuth) {
      await window.PaidenAuth.signOut().catch(() => {});
    }
    renderMenus(false);
    window.location.href = "/";
  }

  document.addEventListener("click", (event) => {
    const signOutBtn = event.target.closest(".profile-signout");
    if (!signOutBtn) return;
    event.preventDefault();
    handleSignOut();
  });

  renderMenus(false);
  resolveAuthState().then(({ signedIn }) => {
    renderMenus(!!signedIn);
  });
})();
