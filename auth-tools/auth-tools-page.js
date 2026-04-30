(() => {
  const pageStatusEl = document.getElementById("pageStatus");
  const currentUserEl = document.getElementById("authToolsCurrentUser");
  const adminAvatarManagerCard = document.getElementById("adminAvatarManagerCard");
  const adminAvatarBlockedCard = document.getElementById("adminAvatarBlockedCard");
  const adminAvatarTargetSelect = document.getElementById("adminAvatarTargetSelect");
  const adminAvatarFileInput = document.getElementById("adminAvatarFileInput");
  const adminAvatarPathInput = document.getElementById("adminAvatarPathInput");
  const adminAvatarPresetGrid = document.getElementById("adminAvatarPresetGrid");
  const adminAvatarPreviewImg = document.getElementById("adminAvatarPreviewImg");
  const adminAvatarPreviewMirrorImg = document.getElementById("adminAvatarPreviewMirrorImg");
  const adminAvatarPreviewCopy = document.getElementById("adminAvatarPreviewCopy");
  const adminAvatarStatusEl = document.getElementById("adminAvatarStatus");
  const adminAvatarSaveBtn = document.getElementById("adminAvatarSaveBtn");

  const DEFAULT_AVATAR = "/images/default_pfp.jpg";
  const ADMIN_AVATAR_MANAGER_USERNAME = "paiden";
  const ADMIN_AVATAR_LIBRARY = [
    { label: "Default", path: "/images/default_pfp.jpg" },
    { label: "Braden", path: "/images/braden.jpg" },
    { label: "Colin Patrick", path: "/images/colinpatrick.jpg" },
    { label: "Ella Case", path: "/images/ellacase.png" },
    { label: "Hailey Face", path: "/images/haileyface.png" },
    { label: "Duck", path: "/images/duck.png" },
    { label: "Duck WebP", path: "/images/duck.webp" },
  ];

  let currentUserId = "";
  let currentProfile = null;
  let adminAvatarProfiles = [];
  let adminAvatarPendingDataUrl = "";
  let adminAvatarSaveInFlight = false;

  function setPageStatus(message, isError = false) {
    if (!pageStatusEl) return;
    pageStatusEl.textContent = message || "";
    pageStatusEl.style.color = isError ? "#a10000" : "rgba(17,17,17,0.78)";
  }

  function setAdminAvatarStatus(message, isError = false) {
    if (!adminAvatarStatusEl) return;
    adminAvatarStatusEl.textContent = message || "";
    adminAvatarStatusEl.style.color = isError ? "#a10000" : "rgba(17,17,17,0.78)";
  }

  function escapeHTML(str) {
    return String(str || "").replace(/[&<>\"']/g, (s) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[s] || s));
  }

  function canAccessAdminAvatarManager(profile = {}) {
    return String(profile.username || "").trim().toLowerCase() === ADMIN_AVATAR_MANAGER_USERNAME;
  }

  function updateCurrentUserBadge(profile = {}) {
    if (!currentUserEl) return;
    const username = String(profile.username || "").trim();
    currentUserEl.innerHTML = username
      ? `<i class="fa-solid fa-user-shield" aria-hidden="true"></i> Signed in as @${escapeHTML(username)}`
      : `<i class="fa-solid fa-user-shield" aria-hidden="true"></i> Signed in`;
  }

  function normalizeManagedAvatarPath(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed) return DEFAULT_AVATAR;
    if (/^(https?:\/\/|data:image\/|\/)/i.test(trimmed)) return trimmed;
    if (/^images\//i.test(trimmed)) return `/${trimmed}`;
    return `/images/${trimmed.replace(/^\/+/, "")}`;
  }

  function isManagedAvatarDataUrl(value) {
    return /^data:image\//i.test(String(value || "").trim());
  }

  function describeManagedAvatar(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed) return "default avatar";
    if (isManagedAvatarDataUrl(trimmed)) return "uploaded photo";
    return normalizeManagedAvatarPath(trimmed);
  }

  async function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function downscaleImageToJpegDataUrl(file, maxDim = 640, quality = 0.78) {
    const dataUrl = await fileToDataUrl(file);
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });
    const w = image.width || 0;
    const h = image.height || 0;
    if (!w || !h) return dataUrl;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(image, 0, 0, cw, ch);
    return canvas.toDataURL("image/jpeg", quality);
  }

  function getAdminAvatarSelectedProfile() {
    if (!adminAvatarTargetSelect) return null;
    const targetId = String(adminAvatarTargetSelect.value || "").trim();
    if (!targetId) return null;
    return adminAvatarProfiles.find((row) => String(row.id || "").trim() === targetId) || null;
  }

  function renderAdminAvatarPresetGrid(selectedPath = DEFAULT_AVATAR) {
    if (!adminAvatarPresetGrid) return;
    const normalizedSelectedPath = normalizeManagedAvatarPath(selectedPath);
    adminAvatarPresetGrid.innerHTML = ADMIN_AVATAR_LIBRARY.map((avatar) => {
      const normalizedPath = normalizeManagedAvatarPath(avatar.path);
      const activeClass = normalizedPath === normalizedSelectedPath ? " active" : "";
      return `
        <button class="admin-avatar-preset${activeClass}" type="button" data-admin-avatar-path="${escapeHTML(normalizedPath)}">
          <img src="${escapeHTML(normalizedPath)}" alt="${escapeHTML(avatar.label)} avatar option">
          <span class="admin-avatar-preset-label">${escapeHTML(avatar.label)}</span>
        </button>
      `;
    }).join("");
  }

  function updateAdminAvatarPreview(nextPath, customMessage = "") {
    const normalizedPath = normalizeManagedAvatarPath(nextPath);
    if (adminAvatarPreviewImg) adminAvatarPreviewImg.src = normalizedPath;
    if (adminAvatarPreviewMirrorImg) adminAvatarPreviewMirrorImg.src = normalizedPath;
    if (adminAvatarPreviewCopy) {
      adminAvatarPreviewCopy.textContent = customMessage || `Previewing ${describeManagedAvatar(nextPath)}.`;
    }
    renderAdminAvatarPresetGrid(isManagedAvatarDataUrl(nextPath) ? "" : normalizedPath);
  }

  function renderAdminAvatarTargetOptions(selectedId = "") {
    if (!adminAvatarTargetSelect) return;
    const normalizedSelectedId = String(selectedId || "").trim();
    const options = ['<option value="">Choose an account</option>'];
    adminAvatarProfiles.forEach((row) => {
      const profileId = String(row.id || "").trim();
      const username = String(row.username || "").trim();
      if (!profileId || !username) return;
      const fullName = String(row.full_name || "").trim();
      const label = fullName ? `${fullName} (@${username})` : `@${username}`;
      const selected = profileId === normalizedSelectedId ? " selected" : "";
      options.push(`<option value="${escapeHTML(profileId)}"${selected}>${escapeHTML(label)}</option>`);
    });
    adminAvatarTargetSelect.innerHTML = options.join("");
  }

  function syncAdminAvatarControlsFromSelection() {
    const selectedProfile = getAdminAvatarSelectedProfile();
    const avatarPath = selectedProfile ? (String(selectedProfile.avatar_url || "").trim() || DEFAULT_AVATAR) : DEFAULT_AVATAR;
    adminAvatarPendingDataUrl = "";
    if (adminAvatarFileInput) adminAvatarFileInput.value = "";
    if (adminAvatarPathInput) adminAvatarPathInput.value = isManagedAvatarDataUrl(avatarPath) ? "" : avatarPath;
    const previewMessage = selectedProfile
      ? (isManagedAvatarDataUrl(avatarPath)
        ? `Loaded @${selectedProfile.username}. Current avatar is an uploaded photo.`
        : `Loaded @${selectedProfile.username}.`)
      : "Choose an account to load its current avatar, then save a new one.";
    updateAdminAvatarPreview(avatarPath, previewMessage);
    setAdminAvatarStatus(selectedProfile ? `Loaded @${selectedProfile.username}.` : "");
  }

  async function loadAdminAvatarProfiles(selectedId = "") {
    if (!window.PaidenAuth || typeof window.PaidenAuth.getClient !== "function") return false;
    const client = window.PaidenAuth.getClient();
    const { data, error } = await client.rpc("get_all_public_profiles");
    if (error) {
      setAdminAvatarStatus(error.message || "Could not load account list.", true);
      return false;
    }
    adminAvatarProfiles = Array.isArray(data) ? data : [];
    renderAdminAvatarTargetOptions(String(selectedId || "").trim() || currentUserId);
    syncAdminAvatarControlsFromSelection();
    return true;
  }

  async function saveAdminAvatarSelection() {
    if (!adminAvatarSaveBtn || adminAvatarSaveInFlight) return;
    if (!window.PaidenAuth || typeof window.PaidenAuth.getClient !== "function") {
      setAdminAvatarStatus("Auth service unavailable.", true);
      return;
    }
    const selectedProfile = getAdminAvatarSelectedProfile();
    if (!selectedProfile) {
      setAdminAvatarStatus("Choose an account first.", true);
      return;
    }
    const normalizedAvatarPath = adminAvatarPendingDataUrl || normalizeManagedAvatarPath(adminAvatarPathInput ? adminAvatarPathInput.value : "");
    adminAvatarSaveInFlight = true;
    adminAvatarSaveBtn.disabled = true;
    adminAvatarSaveBtn.textContent = "Saving...";
    setAdminAvatarStatus("Saving...");
    try {
      const client = window.PaidenAuth.getClient();
      const { data, error } = await client.rpc("admin_set_profile_avatar", {
        target_profile_id: selectedProfile.id,
        next_avatar_url: normalizedAvatarPath,
      });
      if (error) {
        setAdminAvatarStatus(error.message || "Could not update avatar.", true);
        return;
      }
      const row = Array.isArray(data) ? data[0] : null;
      if (!row) {
        setAdminAvatarStatus("Could not update avatar.", true);
        return;
      }
      const updatedProfileId = String(row.profile_id || "").trim();
      const updatedAvatarUrl = String(row.avatar_url || "").trim() || DEFAULT_AVATAR;
      adminAvatarProfiles = adminAvatarProfiles.map((entry) => (
        String(entry.id || "").trim() === updatedProfileId
          ? { ...entry, avatar_url: updatedAvatarUrl }
          : entry
      ));
      renderAdminAvatarTargetOptions(updatedProfileId);
      adminAvatarPendingDataUrl = "";
      if (adminAvatarFileInput) adminAvatarFileInput.value = "";
      if (adminAvatarPathInput) adminAvatarPathInput.value = isManagedAvatarDataUrl(updatedAvatarUrl) ? "" : updatedAvatarUrl;
      updateAdminAvatarPreview(
        updatedAvatarUrl,
        isManagedAvatarDataUrl(updatedAvatarUrl)
          ? `Previewing uploaded photo for @${row.username}.`
          : `Previewing ${describeManagedAvatar(updatedAvatarUrl)} for @${row.username}.`
      );
      setAdminAvatarStatus(`Updated @${row.username} avatar.`);
      setPageStatus("PFP manager ready.");
    } catch (_) {
      setAdminAvatarStatus("Could not update avatar.", true);
    } finally {
      adminAvatarSaveInFlight = false;
      adminAvatarSaveBtn.disabled = false;
      adminAvatarSaveBtn.textContent = "Update Account Avatar";
    }
  }

  async function loadPage() {
    if (!window.PaidenAuth) {
      setPageStatus("Auth service unavailable.", true);
      return;
    }
    const res = await window.PaidenAuth.getCurrentProfile();
    if (!res.ok || !res.user) {
      setPageStatus("Not signed in. Redirecting to sign in...");
      const nextPath = `${window.location.pathname}${window.location.search}${window.location.hash || ""}`;
      window.setTimeout(() => { window.location.href = `/signin?next=${encodeURIComponent(nextPath)}`; }, 900);
      return;
    }

    currentProfile = res.profile || {};
    currentUserId = String(res.user.id || "").trim();
    updateCurrentUserBadge(currentProfile);

    const allowed = canAccessAdminAvatarManager(currentProfile);
    if (adminAvatarManagerCard) adminAvatarManagerCard.hidden = !allowed;
    if (adminAvatarBlockedCard) adminAvatarBlockedCard.hidden = allowed;

    if (!allowed) {
      setPageStatus("This page is reserved for @paiden. Redirecting to your profile...", true);
      window.setTimeout(() => { window.location.href = "/profile/"; }, 1100);
      return;
    }

    renderAdminAvatarPresetGrid(DEFAULT_AVATAR);
    await loadAdminAvatarProfiles(currentUserId);
    setPageStatus("PFP manager ready.");
  }

  if (adminAvatarTargetSelect) {
    adminAvatarTargetSelect.addEventListener("change", () => {
      syncAdminAvatarControlsFromSelection();
    });
  }

  if (adminAvatarFileInput) {
    adminAvatarFileInput.addEventListener("change", async () => {
      const file = adminAvatarFileInput.files && adminAvatarFileInput.files[0] ? adminAvatarFileInput.files[0] : null;
      if (!file) return;
      try {
        const previewDataUrl = await downscaleImageToJpegDataUrl(file);
        if (previewDataUrl.length > 1024 * 1024 * 1.2) {
          adminAvatarPendingDataUrl = "";
          return setAdminAvatarStatus("Profile image is too large after compression.", true);
        }
        adminAvatarPendingDataUrl = previewDataUrl;
        if (adminAvatarPathInput) adminAvatarPathInput.value = "";
        updateAdminAvatarPreview(previewDataUrl, "Uploaded photo ready to save.");
        setAdminAvatarStatus("Photo ready to save.");
      } catch (_) {
        adminAvatarPendingDataUrl = "";
        setAdminAvatarStatus("Could not preview selected image.", true);
      }
    });
  }

  if (adminAvatarPathInput) {
    adminAvatarPathInput.addEventListener("input", () => {
      adminAvatarPendingDataUrl = "";
      if (adminAvatarFileInput) adminAvatarFileInput.value = "";
      updateAdminAvatarPreview(adminAvatarPathInput.value);
      setAdminAvatarStatus("");
    });
  }

  if (adminAvatarPresetGrid) {
    adminAvatarPresetGrid.addEventListener("click", (event) => {
      const button = event.target instanceof Element ? event.target.closest("[data-admin-avatar-path]") : null;
      if (!button) return;
      const nextPath = String(button.getAttribute("data-admin-avatar-path") || "").trim();
      adminAvatarPendingDataUrl = "";
      if (adminAvatarFileInput) adminAvatarFileInput.value = "";
      if (adminAvatarPathInput) adminAvatarPathInput.value = nextPath;
      updateAdminAvatarPreview(nextPath);
      setAdminAvatarStatus("");
    });
  }

  if (adminAvatarSaveBtn) {
    adminAvatarSaveBtn.addEventListener("click", async () => {
      await saveAdminAvatarSelection();
    });
  }

  loadPage();
})();
