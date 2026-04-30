(() => {
  const profileDisplayNameEl = document.getElementById("profileDisplayName");
  const profileDisplayUsernameEl = document.getElementById("profileDisplayUsername");
  const profileBioDisplayEl = document.getElementById("profileBioDisplay");
  const profileLinksDisplayEl = document.getElementById("profileLinksDisplay");
  const fullNameEl = document.getElementById("profileFullName");
  const usernameEl = document.getElementById("profileUsername");
  const emailEl = document.getElementById("profileEmail");
  const profileModalEmailEl = document.getElementById("profileModalEmail");
  const bioEl = document.getElementById("profileBio");
  const profileLinksInputEl = document.getElementById("profileLinksInput");
  const avatarImgEl = document.getElementById("profileAvatarImg");
  const profileModalAvatarImgEl = document.getElementById("profileModalAvatarImg");
  const avatarInputEl = document.getElementById("profileAvatarInput");
  const statusEl = document.getElementById("profileStatus");
  const profileEditBtn = document.getElementById("profileEditBtn");
  const profileModalOverlay = document.getElementById("profileModalOverlay");
  const profileModalEl = profileModalOverlay ? profileModalOverlay.querySelector(".event-modal") : null;
  const profileEditForm = document.getElementById("profileEditForm");
  const profileModalCloseBtn = document.getElementById("profileModalCloseBtn");
  const profileModalDoneBtn = document.getElementById("profileModalDoneBtn");
  const profileModalSaveBtn = document.getElementById("profileModalSaveBtn");
  const profileModalStatusEl = document.getElementById("profileModalStatus");
  const adminAvatarManagerCard = document.getElementById("adminAvatarManagerCard");
  const adminAvatarTargetSelect = document.getElementById("adminAvatarTargetSelect");
  const adminAvatarPathInput = document.getElementById("adminAvatarPathInput");
  const adminAvatarPresetGrid = document.getElementById("adminAvatarPresetGrid");
  const adminAvatarPreviewImg = document.getElementById("adminAvatarPreviewImg");
  const adminAvatarPreviewCopy = document.getElementById("adminAvatarPreviewCopy");
  const adminAvatarStatusEl = document.getElementById("adminAvatarStatus");
  const adminAvatarSaveBtn = document.getElementById("adminAvatarSaveBtn");
  const changePasswordBtn = document.getElementById("changePasswordBtn");
  const passwordModalOverlay = document.getElementById("passwordModalOverlay");
  const passwordModalEl = passwordModalOverlay ? passwordModalOverlay.querySelector(".event-modal") : null;
  const passwordModalCloseBtn = document.getElementById("passwordModalCloseBtn");
  const passwordModalCancelBtn = document.getElementById("passwordModalCancelBtn");
  const passwordModalSaveBtn = document.getElementById("passwordModalSaveBtn");
  const passwordModalStatusEl = document.getElementById("passwordModalStatus");
  const passwordChangeForm = document.getElementById("passwordChangeForm");
  const profileNewPasswordInput = document.getElementById("profileNewPassword");
  const profileConfirmPasswordInput = document.getElementById("profileConfirmPassword");
  const notificationSettingsBtn = document.getElementById("notificationSettingsBtn");
  const notificationModalOverlay = document.getElementById("notificationModalOverlay");
  const notificationModalEl = notificationModalOverlay ? notificationModalOverlay.querySelector(".event-modal") : null;
  const notificationModalCloseBtn = document.getElementById("notificationModalCloseBtn");
  const notificationModalCancelBtn = document.getElementById("notificationModalCancelBtn");
  const notificationModalSaveBtn = document.getElementById("notificationModalSaveBtn");
  const notificationModalStatusEl = document.getElementById("notificationModalStatus");
  const notificationSettingsForm = document.getElementById("notificationSettingsForm");
  const notifyFriendRequestInput = document.getElementById("notifyFriendRequestInput");
  const notifyEventInviteInput = document.getElementById("notifyEventInviteInput");
  const notifyEventOneHourInput = document.getElementById("notifyEventOneHourInput");
  const blogPostModeInputs = Array.from(document.querySelectorAll('input[name="blogPostMode"]'));
  const notificationInboxCounterText = document.getElementById("notificationInboxCounterText");
  const notificationInboxList = document.getElementById("notificationInboxList");
  const notificationInboxMarkAllBtn = document.getElementById("notificationInboxMarkAllBtn");
  const profilePostsCounterText = document.getElementById("profilePostsCounterText");
  const profilePostsList = document.getElementById("profilePostsList");

  const friendsToggleBtn = document.getElementById("friendsToggleBtn");
  const friendsCounterText = document.getElementById("friendsCounterText");
  const friendsDropdown = document.getElementById("friendsDropdown");

  const friendRequestsCounterText = document.getElementById("friendRequestsCounterText");
  const friendRequestsList = document.getElementById("friendRequestsList");

  const calendarMonthLabel = document.getElementById("calendarMonthLabel");
  const calendarMonthSelect = document.getElementById("calendarMonthSelect");
  const calendarYearSelect = document.getElementById("calendarYearSelect");
  const calendarPrevMonthBtn = document.getElementById("calendarPrevMonthBtn");
  const calendarNextMonthBtn = document.getElementById("calendarNextMonthBtn");
  const calendarWeekdays = document.getElementById("calendarWeekdays");
  const calendarGrid = document.getElementById("calendarGrid");
  const calendarEventsList = document.getElementById("calendarEventsList");
  const calendarNewEventBtn = document.getElementById("calendarNewEventBtn");

  const eventCreateForm = document.getElementById("eventCreateForm");
  const eventModalOverlay = document.getElementById("eventModalOverlay");
  const eventModalCloseBtn = document.getElementById("eventModalCloseBtn");
  const eventModalCancelBtn = document.getElementById("eventModalCancelBtn");
  const eventTitleInput = document.getElementById("eventTitleInput");
  const eventStartDateInput = document.getElementById("eventStartDateInput");
  const eventStartHourInput = document.getElementById("eventStartHourInput");
  const eventStartMinuteInput = document.getElementById("eventStartMinuteInput");
  const eventEndDateInput = document.getElementById("eventEndDateInput");
  const eventEndHourInput = document.getElementById("eventEndHourInput");
  const eventEndMinuteInput = document.getElementById("eventEndMinuteInput");
  const eventLocationInput = document.getElementById("eventLocationInput");
  const eventDescriptionInput = document.getElementById("eventDescriptionInput");
  const eventInviteFriendsBox = document.getElementById("eventInviteFriendsBox");
  const eventInviteSelected = document.getElementById("eventInviteSelected");
  const eventInviteSearchInput = document.getElementById("eventInviteSearchInput");
  const eventInviteDropdown = document.getElementById("eventInviteDropdown");
  const eventCreateBtn = document.getElementById("eventCreateBtn");
  const eventModalTitle = document.getElementById("eventModalTitle");
  const eventModalStatusEl = document.getElementById("eventModalStatus");
  const eventDeleteBtn = document.getElementById("eventDeleteBtn");
  const eventContextMenu = document.getElementById("eventContextMenu");
  const eventContextMenuCreate = document.getElementById("eventContextMenuCreate");

  const eventInvitesCounterText = document.getElementById("eventInvitesCounterText");
  const eventInvitesList = document.getElementById("eventInvitesList");

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
  let friendsDropdownOpen = false;
  let friendsCache = [];
  let currentProfile = null;
  let currentUserId = "";
  let adminAvatarProfiles = [];
  let adminAvatarSaveInFlight = false;

  let calendarMonthDate = new Date();
  calendarMonthDate = new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth(), 1);
  let selectedDayKey = toDateKey(new Date());
  let contextMenuDayKey = "";
  let calendarEvents = [];
  let selectedInviteSet = new Set();
  let profileSaveInFlight = false;
  let currentUserEmail = "";
  let profileOverlayPointerDown = false;
  let editingEventId = "";
  let notificationPreferences = {
    blog_post_mode: "all",
    notify_friend_request: true,
    notify_event_invite: true,
    notify_event_one_hour: true,
  };
  let notificationInboxRows = [];
  let accountPosts = [];

  function getEventShareFlowState() {
    try {
      const params = new URLSearchParams(window.location.search);
      return {
        token: String(params.get("eventShareToken") || "").trim(),
        state: String(params.get("eventShareState") || "").trim(),
        owner: String(params.get("eventShareOwner") || "").trim(),
        title: String(params.get("eventShareTitle") || "").trim(),
      };
    } catch (_) {
      return { token: "", state: "", owner: "", title: "" };
    }
  }

  function clearEventShareFlowState() {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("eventShareToken");
      url.searchParams.delete("eventShareState");
      url.searchParams.delete("eventShareOwner");
      url.searchParams.delete("eventShareTitle");
      const next = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState({}, "", next);
    } catch (_) {
      // no-op
    }
  }

  async function claimDeferredSharedEventInviteIfNeeded() {
    if (!window.PaidenAuth || typeof window.PaidenAuth.getClient !== "function") return false;
    const shareState = getEventShareFlowState();
    if (!shareState.token) return false;
    const client = window.PaidenAuth.getClient();
    const { data, error } = await client.rpc("claim_shared_event_invite", {
      target_share_token: shareState.token,
    });
    if (error) {
      setStatus(error.message || "Could not claim shared event invite.", true);
      return false;
    }
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) {
      setStatus("Shared event link is no longer available.", true);
      return false;
    }
    const actionStatus = String(row.action_status || "").trim();
    if (actionStatus === "friend_request_created") {
      const ownerLabel = shareState.owner ? ` from @${shareState.owner}` : "";
      setStatus(`Friend request${ownerLabel} is waiting for your response before the event can be added.`);
      return false;
    }
    await loadCalendarEventsForMonth();
    await loadPendingEventInvites();
    const title = shareState.title || String(row.title || "the shared event");
    setStatus(`Calendar invite added for ${title}.`);
    clearEventShareFlowState();
    return true;
  }

  function setProfileModalStatus(message, isError = false) {
    if (!profileModalStatusEl) return;
    profileModalStatusEl.textContent = message || "";
    profileModalStatusEl.style.color = isError ? "#a10000" : "rgba(17,17,17,0.78)";
  }

  function setAdminAvatarStatus(message, isError = false) {
    if (!adminAvatarStatusEl) return;
    adminAvatarStatusEl.textContent = message || "";
    adminAvatarStatusEl.style.color = isError ? "#a10000" : "rgba(17,17,17,0.78)";
  }

  function setStatus(message, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.style.color = isError ? "#a10000" : "rgba(17,17,17,0.78)";
  }

  function setEventModalStatus(message, isError = false) {
    if (!eventModalStatusEl) return;
    eventModalStatusEl.textContent = message || "";
    eventModalStatusEl.style.color = isError ? "#a10000" : "rgba(17,17,17,0.78)";
  }

  function setNotificationModalStatus(message, isError = false) {
    if (!notificationModalStatusEl) return;
    notificationModalStatusEl.textContent = message || "";
    notificationModalStatusEl.style.color = isError ? "#a10000" : "rgba(17,17,17,0.78)";
  }

  function setPasswordModalStatus(message, isError = false) {
    if (!passwordModalStatusEl) return;
    passwordModalStatusEl.textContent = message || "";
    passwordModalStatusEl.style.color = isError ? "#a10000" : "rgba(17,17,17,0.78)";
  }

  function normalizeLinkUrl(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed) return "";
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }

  function renderProfileLinks(links = []) {
    if (!profileLinksDisplayEl) return;
    const items = Array.isArray(links) ? links.map((link) => normalizeLinkUrl(link)).filter(Boolean) : [];
    if (!items.length) {
      profileLinksDisplayEl.innerHTML = '<div class="profile-links-empty">No links added.</div>';
      return;
    }
    profileLinksDisplayEl.innerHTML = items.map((link) => {
      const safeHref = escapeHTML(link);
      const safeLabel = escapeHTML(link.replace(/^https?:\/\//i, ""));
      return `<a class="profile-link-item" href="${safeHref}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i><span>${safeLabel}</span></a>`;
    }).join("");
  }

  function renderProfileDisplay(profile = {}, userEmail = "") {
    if (profileDisplayNameEl) profileDisplayNameEl.textContent = profile.full_name || profile.username || "Profile";
    if (profileDisplayUsernameEl) profileDisplayUsernameEl.textContent = `@${profile.username || "-"}`;
    if (emailEl) emailEl.textContent = userEmail || "-";
    if (profileModalEmailEl) profileModalEmailEl.textContent = userEmail || "-";
    if (profileBioDisplayEl) profileBioDisplayEl.textContent = profile.bio || "No bio set.";
    renderProfileLinks(profile.personal_links);
    if (avatarImgEl) avatarImgEl.src = profile.avatar_url || DEFAULT_AVATAR;
    if (profileModalAvatarImgEl) profileModalAvatarImgEl.src = profile.avatar_url || DEFAULT_AVATAR;
  }

  function canAccessAdminAvatarManager(profile = {}) {
    return String(profile.username || "").trim().toLowerCase() === ADMIN_AVATAR_MANAGER_USERNAME;
  }

  function normalizeManagedAvatarPath(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed) return DEFAULT_AVATAR;
    if (/^(https?:\/\/|data:image\/|\/)/i.test(trimmed)) return trimmed;
    if (/^images\//i.test(trimmed)) return `/${trimmed}`;
    return `/images/${trimmed.replace(/^\/+/, "")}`;
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

  function updateAdminAvatarPreview(nextPath) {
    const normalizedPath = normalizeManagedAvatarPath(nextPath);
    if (adminAvatarPreviewImg) adminAvatarPreviewImg.src = normalizedPath;
    if (adminAvatarPreviewCopy) adminAvatarPreviewCopy.textContent = `Previewing ${normalizedPath}`;
    renderAdminAvatarPresetGrid(normalizedPath);
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
    if (adminAvatarPathInput) adminAvatarPathInput.value = avatarPath;
    updateAdminAvatarPreview(avatarPath);
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

  async function initializeAdminAvatarManager(profile = {}) {
    if (!adminAvatarManagerCard) return;
    const allowed = canAccessAdminAvatarManager(profile);
    adminAvatarManagerCard.hidden = !allowed;
    if (!allowed) {
      adminAvatarProfiles = [];
      return;
    }
    setAdminAvatarStatus("");
    renderAdminAvatarPresetGrid(DEFAULT_AVATAR);
    await loadAdminAvatarProfiles(currentUserId);
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
    const normalizedAvatarPath = normalizeManagedAvatarPath(adminAvatarPathInput ? adminAvatarPathInput.value : "");
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
      if (adminAvatarPathInput) adminAvatarPathInput.value = updatedAvatarUrl;
      updateAdminAvatarPreview(updatedAvatarUrl);
      if (updatedProfileId === currentUserId) {
        currentProfile = { ...(currentProfile || {}), avatar_url: updatedAvatarUrl };
        renderProfileDisplay(currentProfile, currentUserEmail);
      }
      await loadFriends();
      await loadFriendRequests();
      setAdminAvatarStatus(`Updated @${row.username} avatar.`);
    } catch (_) {
      setAdminAvatarStatus("Could not update avatar.", true);
    } finally {
      adminAvatarSaveInFlight = false;
      adminAvatarSaveBtn.disabled = false;
      adminAvatarSaveBtn.textContent = "Update Account Avatar";
    }
  }

  function formatPostDate(iso) {
    try {
      return new Date(iso).toLocaleDateString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (_) {
      return "";
    }
  }

  function buildPostExcerpt(body) {
    const text = String(body || "").replace(/\s+/g, " ").trim();
    if (!text) return "";
    return text.length > 180 ? `${text.slice(0, 177)}...` : text;
  }

  function setProfilePostsCount(count) {
    if (!profilePostsCounterText) return;
    profilePostsCounterText.textContent = String(Math.max(0, Number(count) || 0));
  }

  function renderAccountPosts(rows = []) {
    if (!profilePostsList) return;
    const list = Array.isArray(rows) ? rows : [];
    setProfilePostsCount(list.length);
    if (!list.length) {
      profilePostsList.innerHTML = '<div class="request-empty">No account-linked blog posts yet.</div>';
      return;
    }
    profilePostsList.innerHTML = list.map((row) => {
      const title = escapeHTML(String(row.title || "Untitled"));
      const excerpt = escapeHTML(buildPostExcerpt(row.body));
      const created = escapeHTML(formatPostDate(row.created_at));
      const postId = encodeURIComponent(String(row.id || "").trim());
      return `
        <div class="profile-post-row">
          <div class="profile-post-title">${title}</div>
          <div class="profile-post-meta">${created}</div>
          <div class="profile-post-body">${excerpt || "No post preview available."}</div>
          <a class="profile-post-link" href="/blog?post=${postId}"><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i><span>Open on Blog</span></a>
        </div>
      `;
    }).join("");
  }

  async function loadAccountPosts(userId) {
    if (!profilePostsList || !window.PaidenAuth || typeof window.PaidenAuth.getClient !== "function") return;
    const cleanUserId = String(userId || "").trim();
    if (!cleanUserId) {
      accountPosts = [];
      renderAccountPosts([]);
      return;
    }
    const client = window.PaidenAuth.getClient();
    const { data, error } = await client
      .from("posts")
      .select("id, title, body, created_at")
      .eq("user_id", cleanUserId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      accountPosts = [];
      renderAccountPosts([]);
      return;
    }
    accountPosts = Array.isArray(data) ? data : [];
    renderAccountPosts(accountPosts);
  }

  function openProfileModal() {
    if (!profileModalOverlay) return;
    profileModalOverlay.classList.add("open");
    document.body.style.overflow = "hidden";
    setProfileModalStatus("");
  }

  function closeProfileModal() {
    if (!profileModalOverlay) return;
    profileModalOverlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  function renderNotificationPreferences() {
    const normalizedBlogMode = notificationPreferences.blog_post_mode === "all" ? "all" : "none";
    blogPostModeInputs.forEach((input) => {
      input.checked = input.value === normalizedBlogMode;
    });
    if (notifyFriendRequestInput) notifyFriendRequestInput.checked = notificationPreferences.notify_friend_request !== false;
    if (notifyEventInviteInput) notifyEventInviteInput.checked = notificationPreferences.notify_event_invite !== false;
    if (notifyEventOneHourInput) notifyEventOneHourInput.checked = notificationPreferences.notify_event_one_hour !== false;
  }

  function formatNotificationTimestamp(iso) {
    try {
      return new Date(iso).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch (_) {
      return "";
    }
  }

  function setNotificationInboxCount(count) {
    if (!notificationInboxCounterText) return;
    notificationInboxCounterText.textContent = String(Math.max(0, Number(count) || 0));
  }

  function renderNotificationInbox(rows = []) {
    if (!notificationInboxList) return;
    const list = Array.isArray(rows) ? rows : [];
    const unreadCount = list.filter((row) => !row.read_at).length;
    setNotificationInboxCount(unreadCount);
    if (notificationInboxMarkAllBtn) notificationInboxMarkAllBtn.disabled = unreadCount === 0;
    if (!list.length) {
      notificationInboxList.innerHTML = '<div class="request-empty">No account notifications yet.</div>';
      return;
    }
    notificationInboxList.innerHTML = list.map((row) => {
      const id = String(row.notification_id || "").trim();
      const title = escapeHTML(String(row.title || "Notification"));
      const body = escapeHTML(String(row.body || ""));
      const createdAt = formatNotificationTimestamp(row.created_at);
      const unread = !row.read_at;
      const hasLink = String(row.link_url || "").trim().length > 0;
      return `
        <div class="inbox-row ${unread ? "unread" : ""}">
          <div class="inbox-row-main">
            <div class="inbox-row-title">${title}</div>
            <div class="inbox-row-body">${body}</div>
            <div class="inbox-row-meta">${escapeHTML(createdAt || "")}${unread ? ' · Unread' : ''}</div>
          </div>
          <div class="inbox-row-actions">
            ${hasLink ? `<button class="inbox-row-btn" type="button" data-notification-open="${escapeHTML(id)}">Open</button>` : ""}
            ${unread ? `<button class="inbox-row-btn secondary" type="button" data-notification-read="${escapeHTML(id)}">Mark Read</button>` : ""}
          </div>
        </div>
      `;
    }).join("");
  }

  function openNotificationModal() {
    if (!notificationModalOverlay) return;
    renderNotificationPreferences();
    setNotificationModalStatus("");
    notificationModalOverlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeNotificationModal() {
    if (!notificationModalOverlay) return;
    notificationModalOverlay.classList.remove("open");
    document.body.style.overflow = "";
    setNotificationModalStatus("");
  }

  function openPasswordModal() {
    if (!passwordModalOverlay) return;
    if (passwordChangeForm) passwordChangeForm.reset();
    setPasswordModalStatus("");
    passwordModalOverlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closePasswordModal() {
    if (!passwordModalOverlay) return;
    passwordModalOverlay.classList.remove("open");
    document.body.style.overflow = "";
    setPasswordModalStatus("");
  }

  function buildProfilePatch(avatarDataUrl = null) {
    const patch = {
      full_name: fullNameEl ? fullNameEl.value : "",
      username: usernameEl ? usernameEl.value : "",
      bio: bioEl ? bioEl.value : "",
      personal_links: profileLinksInputEl ? profileLinksInputEl.value.split(/\r?\n/) : [],
    };
    if (avatarDataUrl) patch.avatar_url = avatarDataUrl;
    return patch;
  }

  async function saveProfileNow(avatarDataUrl = null) {
    if (!window.PaidenAuth) {
      setProfileModalStatus("Auth service unavailable.", true);
      return false;
    }
    if (profileSaveInFlight) return false;

    profileSaveInFlight = true;
    if (profileModalSaveBtn) {
      profileModalSaveBtn.disabled = true;
      profileModalSaveBtn.textContent = "Saving...";
    }
    setProfileModalStatus("Saving...");
    try {
      const res = await window.PaidenAuth.updateProfile(buildProfilePatch(avatarDataUrl));
      if (!res.ok) {
        setProfileModalStatus(res.error || "Could not save profile.", true);
        return false;
      }
      const profile = res.profile || {};
      currentProfile = profile;
      if (fullNameEl) fullNameEl.value = profile.full_name || "";
      if (usernameEl) usernameEl.value = profile.username || "";
      if (bioEl) bioEl.value = profile.bio || "";
      if (profileLinksInputEl) profileLinksInputEl.value = Array.isArray(profile.personal_links) ? profile.personal_links.join("\n") : "";
      renderProfileDisplay(profile, currentUserEmail);
      if (avatarInputEl) avatarInputEl.value = "";
      setProfileModalStatus("Profile saved.");
      setStatus("Profile saved.");
      await initializeAdminAvatarManager(profile);
      await loadFriends();
      await loadFriendRequests();
      return true;
    } catch (_) {
      setProfileModalStatus("Could not save profile.", true);
      return false;
    } finally {
      profileSaveInFlight = false;
      if (profileModalSaveBtn) {
        profileModalSaveBtn.disabled = false;
        profileModalSaveBtn.textContent = "Save Changes";
      }
    }
  }

  function escapeHTML(str) {
    return String(str || "").replace(/[&<>\"']/g, (s) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '\"': "&quot;",
      "'": "&#039;",
    }[s] || s));
  }

  function toDateKey(dateLike) {
    const d = new Date(dateLike);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function toLocalDateTimeValue(dateLike) {
    const d = new Date(dateLike);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day}T${h}:${min}`;
  }

  function toLocalDateValue(dateLike) {
    const d = new Date(dateLike);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function roundUpToQuarterHour(dateLike) {
    const d = new Date(dateLike);
    d.setSeconds(0, 0);
    const min = d.getMinutes();
    const remainder = min % 15;
    if (remainder !== 0) {
      d.setMinutes(min + (15 - remainder));
    }
    return d;
  }

  function buildHourOptions() {
    return Array.from({ length: 24 }, (_, hour) => {
      const value = String(hour).padStart(2, "0");
      const label = new Date(2000, 0, 1, hour, 0, 0, 0).toLocaleTimeString([], {
        hour: "numeric",
        hour12: true,
      });
      return { value, label };
    });
  }

  function buildMinuteOptions() {
    return ["00", "15", "30", "45"];
  }

  function populateTimeSelect(selectEl, options) {
    if (!selectEl) return;
    selectEl.innerHTML = options
      .map((option) => {
        if (typeof option === "string") {
          return `<option value="${option}">${option}</option>`;
        }
        return `<option value="${option.value}">${option.label}</option>`;
      })
      .join("");
  }

  function setDateAndTimeControls(dateInput, hourInput, minuteInput, dateLike) {
    if (!dateInput || !hourInput || !minuteInput) return;
    const d = roundUpToQuarterHour(dateLike);
    dateInput.value = toLocalDateValue(d);
    hourInput.value = String(d.getHours()).padStart(2, "0");
    minuteInput.value = String(d.getMinutes()).padStart(2, "0");
  }

  function getDateFromControls(dateInput, hourInput, minuteInput) {
    const dateValue = String(dateInput?.value || "").trim();
    const hourValue = String(hourInput?.value || "").trim();
    const minuteValue = String(minuteInput?.value || "").trim();
    if (!dateValue || hourValue === "" || minuteValue === "") return null;
    const result = new Date(`${dateValue}T${hourValue}:${minuteValue}`);
    return Number.isNaN(result.getTime()) ? null : result;
  }

  function defaultEventRangeForDay(dayKey) {
    const selectedDay = new Date(`${dayKey}T00:00:00`);
    const today = new Date();
    const todayKey = toDateKey(today);

    if (dayKey === todayKey) {
      if (today.getHours() === 23) {
        const start = new Date(today);
        start.setDate(start.getDate() + 1);
        start.setHours(12, 0, 0, 0);
        const end = new Date(start);
        end.setHours(end.getHours() + 1);
        return { start, end };
      }
      const start = roundUpToQuarterHour(today);
      const end = new Date(start);
      end.setHours(end.getHours() + 1);
      return { start, end };
    }

    if (selectedDay.getTime() > new Date(`${todayKey}T00:00:00`).getTime()) {
      const start = new Date(selectedDay);
      start.setHours(12, 0, 0, 0);
      const end = new Date(start);
      end.setHours(end.getHours() + 1);
      return { start, end };
    }

    const start = new Date(selectedDay);
    start.setHours(12, 0, 0, 0);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    return { start, end };
  }

  function syncEventEndOneHourAfterStart() {
    const start = getDateFromControls(eventStartDateInput, eventStartHourInput, eventStartMinuteInput);
    if (!start || !eventEndDateInput || !eventEndHourInput || !eventEndMinuteInput) return;
    setDateAndTimeControls(eventStartDateInput, eventStartHourInput, eventStartMinuteInput, start);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    setDateAndTimeControls(eventEndDateInput, eventEndHourInput, eventEndMinuteInput, end);
  }

  function normalizeEventDateInputs() {
    const start = getDateFromControls(eventStartDateInput, eventStartHourInput, eventStartMinuteInput);
    const end = getDateFromControls(eventEndDateInput, eventEndHourInput, eventEndMinuteInput);
    if (start) setDateAndTimeControls(eventStartDateInput, eventStartHourInput, eventStartMinuteInput, start);
    if (end) setDateAndTimeControls(eventEndDateInput, eventEndHourInput, eventEndMinuteInput, end);
  }

  function renderCalendarSelectors() {
    if (calendarMonthSelect) {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      calendarMonthSelect.innerHTML = monthNames.map((m, i) => `<option value="${i}">${m}</option>`).join("");
      calendarMonthSelect.value = String(calendarMonthDate.getMonth());
    }
    if (calendarYearSelect) {
      const currentYear = new Date().getFullYear();
      const years = [];
      for (let y = currentYear - 8; y <= currentYear + 8; y += 1) years.push(y);
      calendarYearSelect.innerHTML = years.map((y) => `<option value="${y}">${y}</option>`).join("");
      calendarYearSelect.value = String(calendarMonthDate.getFullYear());
    }
  }

  function isDayCurrentOrFuture(dayKey) {
    const compareToday = new Date();
    compareToday.setHours(0, 0, 0, 0);
    const day = new Date(`${dayKey}T00:00:00`);
    return day.getTime() >= compareToday.getTime();
  }

  function openEventModal() {
    if (!eventModalOverlay) return;
    eventModalOverlay.classList.add("open");
    document.body.style.overflow = "hidden";
    setEventModalStatus("");
  }

  function closeEventModal() {
    if (!eventModalOverlay) return;
    eventModalOverlay.classList.remove("open");
    document.body.style.overflow = "";
    editingEventId = "";
    if (eventModalTitle) eventModalTitle.textContent = "Create Event";
    if (eventCreateBtn) eventCreateBtn.textContent = "Create Event";
    if (eventDeleteBtn) eventDeleteBtn.style.display = "none";
    setEventModalStatus("");
  }

  function hideEventContextMenu() {
    if (!eventContextMenu) return;
    eventContextMenu.classList.remove("open");
  }

  function showEventContextMenu(x, y, dayKey) {
    if (!eventContextMenu) return;
    contextMenuDayKey = dayKey;
    eventContextMenu.classList.add("open");
    const menuWidth = 170;
    const menuHeight = 46;
    const left = Math.max(8, Math.min(x, window.innerWidth - menuWidth - 8));
    const top = Math.max(8, Math.min(y, window.innerHeight - menuHeight - 8));
    eventContextMenu.style.left = `${left}px`;
    eventContextMenu.style.top = `${top}px`;
  }

  function beginEventDraftForDay(dayKey) {
    if (!eventStartDateInput || !eventStartHourInput || !eventStartMinuteInput || !eventEndDateInput || !eventEndHourInput || !eventEndMinuteInput) return;
    const { start, end } = defaultEventRangeForDay(dayKey);
    editingEventId = "";
    if (eventModalTitle) eventModalTitle.textContent = "Create Event";
    if (eventCreateBtn) eventCreateBtn.textContent = "Create Event";
    if (eventDeleteBtn) eventDeleteBtn.style.display = "none";
    setDateAndTimeControls(eventStartDateInput, eventStartHourInput, eventStartMinuteInput, start);
    setDateAndTimeControls(eventEndDateInput, eventEndHourInput, eventEndMinuteInput, end);
    if (eventTitleInput) eventTitleInput.value = "";
    if (eventLocationInput) eventLocationInput.value = "";
    if (eventDescriptionInput) eventDescriptionInput.value = "";
    selectedInviteSet = new Set();
    if (eventInviteSearchInput) eventInviteSearchInput.value = "";
    renderInviteFriendOptions();
    openEventModal();
    if (eventTitleInput) {
      eventTitleInput.focus();
      eventTitleInput.select();
    }
    setStatus(`Draft started for ${dayKey}.`);
  }

  function beginEventEdit(eventRow) {
    if (!eventRow || !eventStartDateInput || !eventStartHourInput || !eventStartMinuteInput || !eventEndDateInput || !eventEndHourInput || !eventEndMinuteInput) return;
    editingEventId = String(eventRow.event_id || "").trim();
    if (!editingEventId) return;
    if (eventModalTitle) eventModalTitle.textContent = "Edit Event";
    if (eventCreateBtn) eventCreateBtn.textContent = "Save Event";
    if (eventDeleteBtn) eventDeleteBtn.style.display = "inline-flex";
    if (eventTitleInput) eventTitleInput.value = String(eventRow.title || "");
    if (eventLocationInput) eventLocationInput.value = String(eventRow.location || "");
    if (eventDescriptionInput) eventDescriptionInput.value = String(eventRow.description || "");
    setDateAndTimeControls(eventStartDateInput, eventStartHourInput, eventStartMinuteInput, eventRow.starts_at);
    setDateAndTimeControls(eventEndDateInput, eventEndHourInput, eventEndMinuteInput, eventRow.ends_at);
    selectedInviteSet = new Set(Array.isArray(eventRow.invite_usernames) ? eventRow.invite_usernames.map((name) => String(name || "").trim()).filter(Boolean) : []);
    if (eventInviteSearchInput) eventInviteSearchInput.value = "";
    selectedDayKey = toDateKey(eventRow.starts_at);
    renderInviteFriendOptions();
    renderCalendarGrid();
    openEventModal();
    if (eventTitleInput) {
      eventTitleInput.focus();
      eventTitleInput.select();
    }
    setStatus(`Editing ${String(eventRow.title || "event")}.`);
  }

  function monthRange(monthStart) {
    const start = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1, 0, 0, 0, 0);
    return { start, end };
  }

  function formatEventTime(iso) {
    try {
      return new Date(iso).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch (_) {
      return "";
    }
  }

  function notifyOnce(key, title, body) {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const storageKey = `paiden-notify-${key}`;
    if (localStorage.getItem(storageKey) === "1") return;
    try {
      new Notification(title, { body });
      localStorage.setItem(storageKey, "1");
    } catch (_) {
      // no-op
    }
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

  function renderFriendsDropdown(rows) {
    if (!friendsDropdown) return;
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) {
      friendsDropdown.innerHTML = '<div class="friend-row"><div class="friend-row-name">No friends yet.</div></div>';
      return;
    }
    friendsDropdown.innerHTML = list.map((row) => {
      const username = String(row.username || "").trim() || "User";
      const avatar = String(row.avatar_url || "").trim() || DEFAULT_AVATAR;
      return `
        <div class="friend-row">
          <img src="${escapeHTML(avatar)}" alt="${escapeHTML(username)} profile picture">
          <div class="friend-row-name">${escapeHTML(username)}</div>
        </div>
      `;
    }).join("");
  }

  function setFriendsCount(count) {
    if (!friendsCounterText) return;
    const total = Number.isFinite(count) && count > 0 ? count : 0;
    friendsCounterText.textContent = String(total);
  }

  function renderInviteSelectedChips() {
    if (!eventInviteSelected) return;
    const names = Array.from(selectedInviteSet);
    if (!names.length) {
      eventInviteSelected.innerHTML = '<span class="request-empty" style="padding:0;font-size:12px;">No friends selected.</span>';
      return;
    }
    eventInviteSelected.innerHTML = names.map((name) => `
      <span class="invite-chip">
        ${escapeHTML(name)}
        <button class="invite-chip-remove" type="button" data-remove-invite-name="${escapeHTML(name)}" aria-label="Remove ${escapeHTML(name)}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
      </span>
    `).join("");
  }

  function renderInviteDropdown() {
    if (!eventInviteDropdown) return;
    if (!friendsCache.length) {
      eventInviteDropdown.innerHTML = '<div class="request-empty">No friends to invite yet.</div>';
      return;
    }
    const query = String(eventInviteSearchInput?.value || "").trim().toLowerCase();
    const filtered = friendsCache.filter((f) => String(f.username || "").toLowerCase().includes(query));
    if (!filtered.length) {
      eventInviteDropdown.innerHTML = '<div class="request-empty">No matches found.</div>';
      return;
    }
    eventInviteDropdown.innerHTML = filtered.map((f) => {
      const username = String(f.username || "").trim();
      const isSelected = selectedInviteSet.has(username);
      return `
        <button class="invite-option ${isSelected ? "selected" : ""}" type="button" data-invite-option="${escapeHTML(username)}">
          <span>${escapeHTML(username)}</span>
          <span class="invite-check"><i class="fa-solid fa-check" aria-hidden="true"></i></span>
        </button>
      `;
    }).join("");
  }

  function renderInviteFriendOptions() {
    renderInviteSelectedChips();
    renderInviteDropdown();
  }

  async function loadFriends() {
    if (!window.PaidenAuth || typeof window.PaidenAuth.getClient !== "function") return;
    const client = window.PaidenAuth.getClient();
    const { data, error } = await client.rpc("get_my_friends");
    if (error) {
      friendsCache = [];
      setFriendsCount(0);
      renderFriendsDropdown([]);
      renderInviteFriendOptions();
      return;
    }
    const rows = (Array.isArray(data) ? data : [])
      .filter((row) => row && String(row.username || "").trim())
      .sort((a, b) => String(a.username || "").localeCompare(String(b.username || ""), undefined, { sensitivity: "base" }));
    friendsCache = rows;
    const friendNameSet = new Set(rows.map((r) => String(r.username || "").trim()).filter(Boolean));
    selectedInviteSet.forEach((name) => {
      if (!friendNameSet.has(name)) selectedInviteSet.delete(name);
    });
    setFriendsCount(rows.length);
    renderFriendsDropdown(rows);
    renderInviteFriendOptions();
  }

  function setFriendRequestsCount(count) {
    if (!friendRequestsCounterText) return;
    const total = Number.isFinite(count) && count > 0 ? count : 0;
    friendRequestsCounterText.textContent = String(total);
  }

  function renderFriendRequests(rows) {
    if (!friendRequestsList) return;
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) {
      friendRequestsList.innerHTML = '<div class="request-empty">No pending requests.</div>';
      return;
    }
    friendRequestsList.innerHTML = list.map((row) => {
      const username = String(row.username || "").trim() || "User";
      const avatar = String(row.avatar_url || "").trim() || DEFAULT_AVATAR;
      const requestId = String(row.request_id || "").trim();
      return `
        <div class="request-row">
          <img src="${escapeHTML(avatar)}" alt="${escapeHTML(username)} profile picture">
          <div class="request-name">${escapeHTML(username)}</div>
          <button class="request-action accept" data-request-action="accept" data-request-id="${escapeHTML(requestId)}" type="button">Accept</button>
          <button class="request-action reject" data-request-action="reject" data-request-id="${escapeHTML(requestId)}" type="button">Reject</button>
        </div>
      `;
    }).join("");
  }

  async function loadFriendRequests() {
    if (!window.PaidenAuth || typeof window.PaidenAuth.getClient !== "function") return;
    const client = window.PaidenAuth.getClient();
    const { data, error } = await client.rpc("get_my_friend_requests");
    if (error) {
      setFriendRequestsCount(0);
      renderFriendRequests([]);
      return;
    }
    const rows = Array.isArray(data) ? data : [];
    setFriendRequestsCount(rows.length);
    renderFriendRequests(rows);
  }

  async function loadNotificationPreferences() {
    if (!window.PaidenAuth || typeof window.PaidenAuth.getClient !== "function") return;
    const client = window.PaidenAuth.getClient();
    const { data, error } = await client.rpc("get_my_notification_preferences");
    if (error) {
      renderNotificationPreferences();
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      notificationPreferences = {
        blog_post_mode: String(row.blog_post_mode || "all") === "all" ? "all" : "none",
        notify_friend_request: row.notify_friend_request !== false,
        notify_event_invite: row.notify_event_invite !== false,
        notify_event_one_hour: row.notify_event_one_hour !== false,
      };
    }
    renderNotificationPreferences();
  }

  async function loadNotificationInbox() {
    if (!window.PaidenAuth || typeof window.PaidenAuth.getClient !== "function") return;
    const client = window.PaidenAuth.getClient();
    const { data, error } = await client.rpc("get_my_notifications", { p_limit: 30 });
    if (error) {
      notificationInboxRows = [];
      renderNotificationInbox([]);
      return;
    }
    notificationInboxRows = Array.isArray(data) ? data : [];
    renderNotificationInbox(notificationInboxRows);
  }

  function isSameProfileNotificationLink(linkUrl) {
    const raw = String(linkUrl || "").trim();
    if (!raw) return false;
    try {
      const parsed = new URL(raw, window.location.origin);
      return parsed.origin === window.location.origin && parsed.pathname === "/profile";
    } catch (_) {
      return raw === "/profile" || raw.startsWith("/profile?");
    }
  }

  function focusNotificationTarget(row) {
    const type = String(row?.type || "").trim();
    let target = null;
    let message = "";
    if (type === "friend_request") {
      target = friendRequestsList;
      message = "Opened friend request section.";
    } else if (type === "event_invite") {
      target = eventInvitesList;
      message = "Opened event invites section.";
    } else if (type === "event_update" || type === "event_reminder") {
      target = calendarEventsList || calendarGrid;
      message = "Opened calendar activity section.";
    }
    if (!target || typeof target.scrollIntoView !== "function") return false;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    if (message) setStatus(message);
    return true;
  }

  async function markNotificationRead(notificationId, { navigate = false } = {}) {
    const id = String(notificationId || "").trim();
    if (!id || !window.PaidenAuth || typeof window.PaidenAuth.getClient !== "function") return false;
    const row = notificationInboxRows.find((item) => String(item.notification_id || "") === id) || null;
    const client = window.PaidenAuth.getClient();
    const { data, error } = await client.rpc("mark_notification_read", { target_notification_id: id });
    if (error || data === false) {
      setStatus((error && error.message) || "Could not mark notification read.", true);
      return false;
    }
    if (row) {
      row.read_at = row.read_at || new Date().toISOString();
    }
    renderNotificationInbox(notificationInboxRows);
    if (navigate && row) {
      const linkUrl = String(row.link_url || "").trim();
      if (linkUrl) {
        if (isSameProfileNotificationLink(linkUrl) && focusNotificationTarget(row)) {
          await loadNotificationInbox();
          return true;
        }
        window.location.href = linkUrl;
        return true;
      }
    }
    await loadNotificationInbox();
    return true;
  }

  async function markAllNotificationsRead() {
    if (!window.PaidenAuth || typeof window.PaidenAuth.getClient !== "function") return;
    const client = window.PaidenAuth.getClient();
    const { error } = await client.rpc("mark_all_notifications_read");
    if (error) {
      setStatus(error.message || "Could not mark notifications read.", true);
      return;
    }
    notificationInboxRows = notificationInboxRows.map((row) => ({
      ...row,
      read_at: row.read_at || new Date().toISOString(),
    }));
    renderNotificationInbox(notificationInboxRows);
    setStatus("Notification inbox marked read.");
  }

  async function saveNotificationPreferences() {
    if (!window.PaidenAuth || typeof window.PaidenAuth.getClient !== "function") return false;
    const selectedModeInput = blogPostModeInputs.find((input) => input.checked);
    const nextPrefs = {
      blog_post_mode: selectedModeInput ? selectedModeInput.value : "all",
      notify_friend_request: Boolean(notifyFriendRequestInput?.checked),
      notify_event_invite: Boolean(notifyEventInviteInput?.checked),
      notify_event_one_hour: Boolean(notifyEventOneHourInput?.checked),
    };
    if (notificationModalSaveBtn) {
      notificationModalSaveBtn.disabled = true;
      notificationModalSaveBtn.textContent = "Saving...";
    }
    setNotificationModalStatus("Saving...");
    try {
      const client = window.PaidenAuth.getClient();
      const { data, error } = await client.rpc("save_my_notification_preferences", {
        p_blog_post_mode: nextPrefs.blog_post_mode,
        p_notify_friend_request: nextPrefs.notify_friend_request,
        p_notify_friend_removed: false,
        p_notify_event_invite: nextPrefs.notify_event_invite,
        p_notify_event_one_hour: nextPrefs.notify_event_one_hour,
      });
      if (error) {
        setNotificationModalStatus(error.message || "Could not save preferences.", true);
        return false;
      }
      notificationPreferences = { ...nextPrefs };
      renderNotificationPreferences();
      setNotificationModalStatus("Preferences saved.");
      setStatus("Notification preferences saved.");
      return true;
    } catch (_) {
      setNotificationModalStatus("Could not save preferences.", true);
      return false;
    } finally {
      if (notificationModalSaveBtn) {
        notificationModalSaveBtn.disabled = false;
        notificationModalSaveBtn.textContent = "Save Preferences";
      }
    }
  }

  function renderWeekdays() {
    if (!calendarWeekdays) return;
    if (calendarWeekdays.dataset.ready === "1") return;
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    calendarWeekdays.innerHTML = labels.map((l) => `<div class="calendar-weekday">${l}</div>`).join("");
    calendarWeekdays.dataset.ready = "1";
  }

  function renderSelectedDayEvents() {
    if (!calendarEventsList) return;
    const rows = calendarEvents
      .filter((e) => toDateKey(e.starts_at) === selectedDayKey)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

    if (!rows.length) {
      calendarEventsList.innerHTML = '<div class="request-empty">No events for selected day.</div>';
      return;
    }

    calendarEventsList.innerHTML = rows.map((e) => {
      const owner = e.owner_username ? `By ${escapeHTML(e.owner_username)} - ` : "";
      const when = formatEventTime(e.starts_at);
      const status = e.invite_status === "pending" ? " (Invite Pending)" : "";
      const rowClass = e.invite_status === "pending" ? "calendar-event-row pending" : "calendar-event-row";
      const actions = [];
      if (e.can_edit) {
        actions.push(`<button class="calendar-event-edit-btn" data-edit-event-id="${escapeHTML(String(e.event_id || ""))}" type="button">Edit</button>`);
        if (e.share_token) {
          actions.push(`<button class="calendar-event-edit-btn" data-share-event-token="${escapeHTML(String(e.share_token || ""))}" type="button">Share Link</button>`);
        }
      }
      return `
        <div class="${rowClass}">
          <div class="calendar-event-row-head">
            <strong>${escapeHTML(e.title || "Untitled")}</strong>
            ${actions.length ? `<div class="calendar-event-actions">${actions.join("")}</div>` : ""}
          </div>
          <div class="calendar-event-row-body">${status ? `<div>${status.trim()}</div>` : ""}<div>${owner}${escapeHTML(when)}</div>${e.location ? `<div>${escapeHTML(e.location)}</div>` : ""}</div>
        </div>
      `;
    }).join("");
  }

  async function shareEventInviteLink(shareToken) {
    const token = String(shareToken || "").trim();
    if (!token) {
      setStatus("This event does not have a share link yet.", true);
      return;
    }
    const shareUrl = `${window.location.origin}/event-invite/?token=${encodeURIComponent(token)}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "paiden.com event invite",
          text: "Open this link to add the event invite to your account.",
          url: shareUrl,
        });
        setStatus("Event link ready to share.");
        return;
      }
    } catch (_) {
      // Fall back to clipboard.
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setStatus("Event invite link copied.");
        return;
      }
    } catch (_) {
      // Fall back to prompt.
    }
    window.prompt("Copy this event invite link:", shareUrl);
  }

  function renderCalendarGrid() {
    if (!calendarGrid || !calendarMonthLabel) return;
    const monthStart = new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth(), 1);

    calendarMonthLabel.textContent = monthStart.toLocaleDateString([], { month: "long", year: "numeric" });
    if (calendarMonthSelect) calendarMonthSelect.value = String(monthStart.getMonth());
    if (calendarYearSelect) calendarYearSelect.value = String(monthStart.getFullYear());

    const gridStart = new Date(monthStart);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());

    const cells = [];
    for (let i = 0; i < 42; i += 1) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const key = toDateKey(d);
      const isMuted = d.getMonth() !== monthStart.getMonth();
      const isSelected = key === selectedDayKey;
      const count = calendarEvents.filter((e) => toDateKey(e.starts_at) === key).length;
      const dots = count > 0 ? `<div class="calendar-day-dots">${Array.from({ length: Math.min(count, 5) }).map(() => '<span class="calendar-dot"></span>').join("")}</div>` : "";
      cells.push(`
        <button class="calendar-day ${isMuted ? "muted" : ""} ${isSelected ? "selected" : ""}" data-day-key="${key}" type="button">
          <div class="calendar-day-num">${d.getDate()}</div>
          ${dots}
        </button>
      `);
    }
    calendarGrid.innerHTML = cells.join("");
    renderSelectedDayEvents();
  }

  async function loadCalendarEventsForMonth() {
    if (!window.PaidenAuth || typeof window.PaidenAuth.getClient !== "function") return;
    const client = window.PaidenAuth.getClient();
    const { start, end } = monthRange(calendarMonthDate);
    const { data, error } = await client.rpc("get_my_calendar_events_detail", {
      start_at: start.toISOString(),
      end_at: end.toISOString(),
    });
    if (error) {
      calendarEvents = [];
      renderCalendarGrid();
      return;
    }
    calendarEvents = Array.isArray(data) ? data : [];
    renderCalendarGrid();
  }

  function setEventInvitesCount(count) {
    if (!eventInvitesCounterText) return;
    eventInvitesCounterText.textContent = String(Math.max(0, Number(count) || 0));
  }

  function renderEventInvites(rows) {
    if (!eventInvitesList) return;
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) {
      eventInvitesList.innerHTML = '<div class="request-empty">No pending event invites.</div>';
      return;
    }

    eventInvitesList.innerHTML = list.map((row) => {
      const eventId = String(row.event_id || "");
      const inviter = String(row.inviter_username || "Friend");
      const title = String(row.title || "Untitled");
      const when = formatEventTime(row.starts_at);
      const where = row.location ? ` - ${escapeHTML(String(row.location))}` : "";
      return `
        <div class="event-invite-row">
          <div><strong>${escapeHTML(title)}</strong><br>${escapeHTML(inviter)} - ${escapeHTML(when)}${where}</div>
          <button class="request-action accept" data-event-invite-action="accept" data-event-id="${escapeHTML(eventId)}" type="button">Accept</button>
          <button class="request-action reject" data-event-invite-action="decline" data-event-id="${escapeHTML(eventId)}" type="button">Decline</button>
        </div>
      `;
    }).join("");
  }

  async function loadPendingEventInvites() {
    if (!window.PaidenAuth || typeof window.PaidenAuth.getClient !== "function") return;
    const client = window.PaidenAuth.getClient();
    const { data, error } = await client.rpc("get_my_pending_event_invites");
    if (error) {
      setEventInvitesCount(0);
      renderEventInvites([]);
      return;
    }
    const rows = Array.isArray(data) ? data : [];
    setEventInvitesCount(rows.length);
    renderEventInvites(rows);
  }

  function selectedInviteUsernames() {
    return Array.from(selectedInviteSet);
  }

  async function loadProfile() {
    if (!window.PaidenAuth) {
      setStatus("Auth service unavailable.", true);
      return;
    }
    const res = await window.PaidenAuth.getCurrentProfile();
    if (!res.ok || !res.user) {
      setStatus("Not signed in. Redirecting to sign in...");
      const nextPath = `${window.location.pathname}${window.location.search}${window.location.hash || ""}`;
      window.setTimeout(() => { window.location.href = `/signin?next=${encodeURIComponent(nextPath)}`; }, 900);
      return;
    }
    const profile = res.profile || {};
    currentProfile = profile;
    currentUserId = String(res.user.id || "").trim();
    currentUserEmail = res.user.email || "";
    if (fullNameEl) fullNameEl.value = profile.full_name || "";
    if (usernameEl) usernameEl.value = profile.username || "";
    if (bioEl) bioEl.value = profile.bio || "";
    if (profileLinksInputEl) profileLinksInputEl.value = Array.isArray(profile.personal_links) ? profile.personal_links.join("\n") : "";
    renderProfileDisplay(profile, currentUserEmail);
    await initializeAdminAvatarManager(profile);

    renderCalendarSelectors();
    renderWeekdays();
    await loadFriends();
    await loadFriendRequests();
    await loadNotificationInbox();
    await loadNotificationPreferences();
    await loadAccountPosts(currentUserId);
    await loadCalendarEventsForMonth();
    await loadPendingEventInvites();
    const shareState = getEventShareFlowState();
    const claimedSharedInvite = shareState.state === "friend-request"
      ? false
      : await claimDeferredSharedEventInviteIfNeeded();

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    if (shareState.token && shareState.state === "friend-request") {
      const ownerLabel = shareState.owner ? ` from @${shareState.owner}` : "";
      setStatus(`Accept the friend request${ownerLabel} to unlock the shared calendar invite.`);
      return;
    }
    if (claimedSharedInvite) {
      return;
    }
    setStatus("Profile loaded.");
  }

  if (avatarInputEl && avatarImgEl) {
    avatarInputEl.addEventListener("change", async () => {
      const file = avatarInputEl.files && avatarInputEl.files[0] ? avatarInputEl.files[0] : null;
      if (!file) return;
      try {
        const previewDataUrl = await downscaleImageToJpegDataUrl(file);
        if (previewDataUrl.length > 1024 * 1024 * 1.2) {
          return setProfileModalStatus("Profile image is too large after compression.", true);
        }
        avatarImgEl.src = previewDataUrl || DEFAULT_AVATAR;
        if (profileModalAvatarImgEl) profileModalAvatarImgEl.src = previewDataUrl || DEFAULT_AVATAR;
        setProfileModalStatus("Photo ready to save.");
      } catch (_) {
        setProfileModalStatus("Could not preview selected image.", true);
      }
    });
  }

  if (profileEditBtn) {
    profileEditBtn.addEventListener("click", () => {
      openProfileModal();
    });
  }

  if (adminAvatarTargetSelect) {
    adminAvatarTargetSelect.addEventListener("change", () => {
      syncAdminAvatarControlsFromSelection();
    });
  }

  if (adminAvatarPathInput) {
    adminAvatarPathInput.addEventListener("input", () => {
      updateAdminAvatarPreview(adminAvatarPathInput.value);
      setAdminAvatarStatus("");
    });
  }

  if (adminAvatarPresetGrid) {
    adminAvatarPresetGrid.addEventListener("click", (event) => {
      const button = event.target instanceof Element ? event.target.closest("[data-admin-avatar-path]") : null;
      if (!button) return;
      const nextPath = String(button.getAttribute("data-admin-avatar-path") || "").trim();
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

  if (notificationSettingsBtn) {
    notificationSettingsBtn.addEventListener("click", () => {
      openNotificationModal();
    });
  }

  if (notificationInboxMarkAllBtn) {
    notificationInboxMarkAllBtn.addEventListener("click", async () => {
      await markAllNotificationsRead();
    });
  }

  if (notificationInboxList) {
    notificationInboxList.addEventListener("click", async (event) => {
      const clickTarget = event.target instanceof Element ? event.target : null;
      if (!clickTarget) return;
      const openNotificationBtn = clickTarget.closest("[data-notification-open]");
      if (openNotificationBtn) {
        event.preventDefault();
        await markNotificationRead(String(openNotificationBtn.getAttribute("data-notification-open") || "").trim(), { navigate: true });
        return;
      }

      const markNotificationBtn = clickTarget.closest("[data-notification-read]");
      if (markNotificationBtn) {
        event.preventDefault();
        await markNotificationRead(String(markNotificationBtn.getAttribute("data-notification-read") || "").trim(), { navigate: false });
      }
    });
  }

  if (changePasswordBtn) {
    changePasswordBtn.addEventListener("click", () => {
      openPasswordModal();
      if (profileNewPasswordInput) profileNewPasswordInput.focus();
    });
  }

  if (profileModalCloseBtn) {
    profileModalCloseBtn.addEventListener("click", () => closeProfileModal());
  }

  if (profileModalDoneBtn) {
    profileModalDoneBtn.addEventListener("click", () => closeProfileModal());
  }

  if (profileEditForm) {
    profileEditForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      let avatarDataUrl = null;
      const file = avatarInputEl && avatarInputEl.files && avatarInputEl.files[0] ? avatarInputEl.files[0] : null;
      if (file) {
        avatarDataUrl = await downscaleImageToJpegDataUrl(file);
        if (avatarDataUrl.length > 1024 * 1024 * 1.2) {
          return setProfileModalStatus("Profile image is too large after compression.", true);
        }
      }
      const ok = await saveProfileNow(avatarDataUrl);
      if (ok) closeProfileModal();
    });
  }

  if (profileModalOverlay) {
    profileModalOverlay.addEventListener("pointerdown", (event) => {
      profileOverlayPointerDown = event.target === profileModalOverlay;
    });
    profileModalOverlay.addEventListener("click", (event) => {
      if (profileOverlayPointerDown && event.target === profileModalOverlay) closeProfileModal();
      profileOverlayPointerDown = false;
    });
  }

  if (profileModalEl) {
    profileModalEl.addEventListener("click", (event) => event.stopPropagation());
    profileModalEl.addEventListener("pointerdown", (event) => event.stopPropagation());
  }

  if (notificationModalCloseBtn) {
    notificationModalCloseBtn.addEventListener("click", () => closeNotificationModal());
  }

  if (notificationModalCancelBtn) {
    notificationModalCancelBtn.addEventListener("click", () => closeNotificationModal());
  }

  if (notificationSettingsForm) {
    notificationSettingsForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const ok = await saveNotificationPreferences();
      if (ok) closeNotificationModal();
    });
  }

  if (notificationModalOverlay) {
    notificationModalOverlay.addEventListener("click", (event) => {
      if (event.target === notificationModalOverlay) closeNotificationModal();
    });
  }

  if (notificationModalEl) {
    notificationModalEl.addEventListener("click", (event) => event.stopPropagation());
  }

  if (passwordModalCloseBtn) {
    passwordModalCloseBtn.addEventListener("click", () => closePasswordModal());
  }

  if (passwordModalCancelBtn) {
    passwordModalCancelBtn.addEventListener("click", () => closePasswordModal());
  }

  if (passwordChangeForm) {
    passwordChangeForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!window.PaidenAuth) return setPasswordModalStatus("Auth service unavailable.", true);
      const password = String(profileNewPasswordInput?.value || "");
      const confirmPassword = String(profileConfirmPasswordInput?.value || "");
      if (!password || !confirmPassword) {
        return setPasswordModalStatus("Please complete both password fields.", true);
      }
      if (password !== confirmPassword) {
        return setPasswordModalStatus("Passwords do not match.", true);
      }
      if (password.length < 8) {
        return setPasswordModalStatus("Password must be at least 8 characters.", true);
      }
      if (passwordModalSaveBtn) {
        passwordModalSaveBtn.disabled = true;
        passwordModalSaveBtn.textContent = "Saving...";
      }
      setPasswordModalStatus("Saving...");
      try {
        const res = await window.PaidenAuth.updatePassword(password);
        if (!res.ok) {
          setPasswordModalStatus(res.error || "Could not update password.", true);
          return;
        }
        setPasswordModalStatus("Password updated.");
        setStatus("Password updated.");
        window.setTimeout(() => closePasswordModal(), 600);
      } finally {
        if (passwordModalSaveBtn) {
          passwordModalSaveBtn.disabled = false;
          passwordModalSaveBtn.textContent = "Save Password";
        }
      }
    });
  }

  if (passwordModalOverlay) {
    passwordModalOverlay.addEventListener("click", (event) => {
      if (event.target === passwordModalOverlay) closePasswordModal();
    });
  }

  if (passwordModalEl) {
    passwordModalEl.addEventListener("click", (event) => event.stopPropagation());
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && profileModalOverlay && profileModalOverlay.classList.contains("open")) {
      closeProfileModal();
    }
    if (event.key === "Escape" && notificationModalOverlay && notificationModalOverlay.classList.contains("open")) {
      closeNotificationModal();
    }
    if (event.key === "Escape" && passwordModalOverlay && passwordModalOverlay.classList.contains("open")) {
      closePasswordModal();
    }
  });

  if (friendsToggleBtn && friendsDropdown) {
    friendsToggleBtn.addEventListener("click", () => {
      friendsDropdownOpen = !friendsDropdownOpen;
      friendsDropdown.classList.toggle("open", friendsDropdownOpen);
      friendsToggleBtn.setAttribute("aria-expanded", friendsDropdownOpen ? "true" : "false");
    });
  }

  if (calendarPrevMonthBtn) {
    calendarPrevMonthBtn.addEventListener("click", async () => {
      calendarMonthDate = new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth() - 1, 1);
      selectedDayKey = toDateKey(calendarMonthDate);
      await loadCalendarEventsForMonth();
    });
  }

  if (calendarNextMonthBtn) {
    calendarNextMonthBtn.addEventListener("click", async () => {
      calendarMonthDate = new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth() + 1, 1);
      selectedDayKey = toDateKey(calendarMonthDate);
      await loadCalendarEventsForMonth();
    });
  }

  if (calendarMonthSelect) {
    calendarMonthSelect.addEventListener("change", async () => {
      const month = Number(calendarMonthSelect.value);
      if (!Number.isFinite(month)) return;
      calendarMonthDate = new Date(calendarMonthDate.getFullYear(), month, 1);
      selectedDayKey = toDateKey(calendarMonthDate);
      await loadCalendarEventsForMonth();
    });
  }

  if (calendarYearSelect) {
    calendarYearSelect.addEventListener("change", async () => {
      const year = Number(calendarYearSelect.value);
      if (!Number.isFinite(year)) return;
      calendarMonthDate = new Date(year, calendarMonthDate.getMonth(), 1);
      selectedDayKey = toDateKey(calendarMonthDate);
      await loadCalendarEventsForMonth();
    });
  }

  if (calendarGrid) {
    calendarGrid.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-day-key]");
      if (!btn) return;
      hideEventContextMenu();
      selectedDayKey = String(btn.getAttribute("data-day-key") || "");
      renderCalendarGrid();
    });

    calendarGrid.addEventListener("dblclick", (event) => {
      const btn = event.target.closest("[data-day-key]");
      if (!btn) return;
      hideEventContextMenu();
      selectedDayKey = String(btn.getAttribute("data-day-key") || "");
      renderCalendarGrid();
      if (isDayCurrentOrFuture(selectedDayKey)) {
        beginEventDraftForDay(selectedDayKey);
      } else {
        setStatus("Cannot create events on past dates.", true);
      }
    });

    calendarGrid.addEventListener("contextmenu", (event) => {
      const btn = event.target.closest("[data-day-key]");
      if (!btn) return;
      event.preventDefault();
      selectedDayKey = String(btn.getAttribute("data-day-key") || "");
      renderCalendarGrid();
      if (!isDayCurrentOrFuture(selectedDayKey)) {
        setStatus("Cannot create events on past dates.", true);
        hideEventContextMenu();
        return;
      }
      showEventContextMenu(event.clientX, event.clientY, selectedDayKey);
    });
  }

  if (calendarNewEventBtn) {
    calendarNewEventBtn.addEventListener("click", () => {
      hideEventContextMenu();
      const todayKey = toDateKey(new Date());
      selectedDayKey = todayKey;
      renderCalendarGrid();
      beginEventDraftForDay(todayKey);
    });
  }

  if (eventContextMenuCreate) {
    eventContextMenuCreate.addEventListener("click", () => {
      const draftDay = contextMenuDayKey || selectedDayKey || toDateKey(new Date());
      hideEventContextMenu();
      beginEventDraftForDay(draftDay);
    });
  }

  if (eventModalCloseBtn) {
    eventModalCloseBtn.addEventListener("click", () => {
      closeEventModal();
    });
  }

  if (eventModalCancelBtn) {
    eventModalCancelBtn.addEventListener("click", () => {
      closeEventModal();
    });
  }

  if (eventDeleteBtn) {
    eventDeleteBtn.addEventListener("click", async () => {
      if (!editingEventId) return;
      if (!window.PaidenAuth || typeof window.PaidenAuth.getClient !== "function") return;
      if (!window.confirm("Delete this event?")) return;
      eventDeleteBtn.disabled = true;
      setEventModalStatus("Deleting...");
      try {
        const client = window.PaidenAuth.getClient();
        const { data, error } = await client.rpc("delete_event", {
          target_event_id: editingEventId,
        });
        if (error || data === false) {
          setEventModalStatus((error && error.message) || "Could not delete event.", true);
          return;
        }
        closeEventModal();
        await loadCalendarEventsForMonth();
        await loadPendingEventInvites();
        setStatus("Event deleted.");
      } finally {
        eventDeleteBtn.disabled = false;
      }
    });
  }

  if (eventModalOverlay) {
    eventModalOverlay.addEventListener("click", (event) => {
      if (event.target === eventModalOverlay) {
        closeEventModal();
      }
    });
  }

  if (eventInviteSearchInput) {
    eventInviteSearchInput.addEventListener("input", () => {
      renderInviteDropdown();
    });
  }

  populateTimeSelect(eventStartHourInput, buildHourOptions());
  populateTimeSelect(eventEndHourInput, buildHourOptions());
  populateTimeSelect(eventStartMinuteInput, buildMinuteOptions());
  populateTimeSelect(eventEndMinuteInput, buildMinuteOptions());

  if (eventStartDateInput) {
    eventStartDateInput.addEventListener("change", syncEventEndOneHourAfterStart);
  }

  if (eventStartHourInput) {
    eventStartHourInput.addEventListener("change", syncEventEndOneHourAfterStart);
  }

  if (eventStartMinuteInput) {
    eventStartMinuteInput.addEventListener("change", syncEventEndOneHourAfterStart);
  }

  if (eventCreateForm) {
    eventCreateForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!window.PaidenAuth || typeof window.PaidenAuth.getClient !== "function") return;

      normalizeEventDateInputs();
      const title = String(eventTitleInput?.value || "").trim();
      const startsAt = getDateFromControls(eventStartDateInput, eventStartHourInput, eventStartMinuteInput);
      const endsAt = getDateFromControls(eventEndDateInput, eventEndHourInput, eventEndMinuteInput);
      const location = String(eventLocationInput?.value || "").trim();
      const description = String(eventDescriptionInput?.value || "").trim();

      if (!title || !startsAt || !endsAt) {
        setEventModalStatus("Event title, start, and end are required.", true);
        return;
      }
      if (!(startsAt instanceof Date) || Number.isNaN(startsAt.getTime()) || !(endsAt instanceof Date) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
        setEventModalStatus("Event date/time is invalid.", true);
        return;
      }

      const inviteNames = selectedInviteUsernames();
      const isEditingEvent = Boolean(editingEventId);
      if (eventCreateBtn) {
        eventCreateBtn.disabled = true;
        eventCreateBtn.textContent = isEditingEvent ? "Saving..." : "Creating...";
      }
      try {
        const client = window.PaidenAuth.getClient();
        let data;
        let error;
        if (isEditingEvent) {
          ({ data, error } = await client.rpc("update_event_with_invites", {
            target_event_id: editingEventId,
            event_title: title,
            event_description: description || null,
            event_location: location || null,
            event_starts_at: startsAt.toISOString(),
            event_ends_at: endsAt.toISOString(),
            invite_usernames: inviteNames,
          }));
        } else {
          ({ data, error } = await client.rpc("create_event_with_invites", {
            event_title: title,
            event_description: description || null,
            event_location: location || null,
            event_starts_at: startsAt.toISOString(),
            event_ends_at: endsAt.toISOString(),
            invite_usernames: inviteNames,
          }));
        }
        if (error || !data) {
          setEventModalStatus((error && error.message) || `Could not ${isEditingEvent ? "save" : "create"} event.`, true);
          return;
        }

        eventCreateForm.reset();
        closeEventModal();
        await loadCalendarEventsForMonth();
        await loadPendingEventInvites();
        if (inviteNames.length && window.PaidenAuth && typeof window.PaidenAuth.invokeEdgeFunction === "function") {
          const notifyRes = await window.PaidenAuth.invokeEdgeFunction("push-notify", {
            type: "event_invite",
            target_usernames: inviteNames,
            event_title: title,
            event_starts_at: startsAt.toISOString(),
            is_update: isEditingEvent,
          }).catch((err) => ({ ok: false, error: err?.message || "Could not trigger event invite notification." }));
          if (!notifyRes || notifyRes.ok === false) {
            console.error("Event invite push-notify failed:", notifyRes?.error || "Unknown error");
          }
        }
        setStatus(isEditingEvent ? "Event updated." : "Event created.");
      } finally {
        if (eventCreateBtn) {
          eventCreateBtn.disabled = false;
          eventCreateBtn.textContent = isEditingEvent ? "Save Event" : "Create Event";
        }
      }
    });
  }

  document.addEventListener("click", async (event) => {
    if (!event.target.closest("#eventContextMenu") && !event.target.closest("[data-day-key]")) {
      hideEventContextMenu();
    }

    const inviteOptionBtn = event.target.closest("[data-invite-option]");
    if (inviteOptionBtn) {
      const username = String(inviteOptionBtn.getAttribute("data-invite-option") || "").trim();
      if (username) {
        if (selectedInviteSet.has(username)) selectedInviteSet.delete(username);
        else selectedInviteSet.add(username);
        renderInviteFriendOptions();
      }
      return;
    }

    const removeInviteBtn = event.target.closest("[data-remove-invite-name]");
    if (removeInviteBtn) {
      const username = String(removeInviteBtn.getAttribute("data-remove-invite-name") || "").trim();
      if (username && selectedInviteSet.has(username)) {
        selectedInviteSet.delete(username);
        renderInviteFriendOptions();
      }
      return;
    }

    const friendReqBtn = event.target.closest("[data-request-action][data-request-id]");
    if (friendReqBtn) {
      event.preventDefault();
      if (!window.PaidenAuth || typeof window.PaidenAuth.getClient !== "function") return;
      const requestId = String(friendReqBtn.getAttribute("data-request-id") || "").trim();
      const action = String(friendReqBtn.getAttribute("data-request-action") || "").trim();
      if (!requestId || !action) return;
      const acceptRequest = action === "accept";
      friendReqBtn.disabled = true;
      const client = window.PaidenAuth.getClient();
      const { data, error } = await client.rpc("respond_to_friend_request", {
        request_id: requestId,
        accept_request: acceptRequest,
      });
      if (error || data === false) {
        friendReqBtn.disabled = false;
        setStatus((error && error.message) || "Could not process friend request.", true);
        return;
      }
      await loadFriends();
      await loadFriendRequests();
      await loadNotificationInbox();
      if (acceptRequest) {
        await loadPendingEventInvites();
        const shareState = getEventShareFlowState();
        if (shareState.token) {
          clearEventShareFlowState();
          setStatus("Friend request accepted. Calendar invite added.");
        } else {
          setStatus("Friend request accepted.");
        }
      } else {
        clearEventShareFlowState();
        setStatus("Friend request rejected.");
      }
      return;
    }

    const editEventBtn = event.target.closest("[data-edit-event-id]");
    if (editEventBtn) {
      const eventId = String(editEventBtn.getAttribute("data-edit-event-id") || "").trim();
      if (!eventId) return;
      const eventRow = calendarEvents.find((row) => String(row.event_id || "") === eventId && row.can_edit);
      if (eventRow) beginEventEdit(eventRow);
      return;
    }

    const shareEventBtn = event.target.closest("[data-share-event-token]");
    if (shareEventBtn) {
      const shareToken = String(shareEventBtn.getAttribute("data-share-event-token") || "").trim();
      if (!shareToken) return;
      await shareEventInviteLink(shareToken).catch(() => {
        setStatus("Could not share event link.", true);
      });
      return;
    }

    const eventInviteBtn = event.target.closest("[data-event-invite-action][data-event-id]");
    if (eventInviteBtn) {
      event.preventDefault();
      if (!window.PaidenAuth || typeof window.PaidenAuth.getClient !== "function") return;
      const eventId = String(eventInviteBtn.getAttribute("data-event-id") || "").trim();
      const action = String(eventInviteBtn.getAttribute("data-event-invite-action") || "").trim();
      if (!eventId || !action) return;
      const acceptInvite = action === "accept";
      eventInviteBtn.disabled = true;
      const client = window.PaidenAuth.getClient();
      const { data, error } = await client.rpc("respond_to_event_invite", {
        event_id: eventId,
        accept_invite: acceptInvite,
      });
      if (error || data === false) {
        eventInviteBtn.disabled = false;
        setStatus((error && error.message) || "Could not process event invite.", true);
        return;
      }
      await loadCalendarEventsForMonth();
      await loadPendingEventInvites();
      setStatus(acceptInvite ? "Event invite accepted." : "Event invite declined.");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideEventContextMenu();
      closeEventModal();
    }
  });
  window.addEventListener("resize", hideEventContextMenu);
  window.addEventListener("scroll", hideEventContextMenu, { passive: true });

  loadProfile();
})();
