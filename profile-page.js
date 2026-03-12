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
  const notifyFriendRemovedInput = document.getElementById("notifyFriendRemovedInput");
  const notifyEventInviteInput = document.getElementById("notifyEventInviteInput");
  const notifyEventOneHourInput = document.getElementById("notifyEventOneHourInput");
  const blogPostModeInputs = Array.from(document.querySelectorAll('input[name="blogPostMode"]'));

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
  const eventStartInput = document.getElementById("eventStartInput");
  const eventEndInput = document.getElementById("eventEndInput");
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
  let friendsDropdownOpen = false;
  let friendsCache = [];

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
    notify_friend_removed: true,
    notify_event_invite: true,
    notify_event_one_hour: true,
  };

  function setProfileModalStatus(message, isError = false) {
    if (!profileModalStatusEl) return;
    profileModalStatusEl.textContent = message || "";
    profileModalStatusEl.style.color = isError ? "#a10000" : "rgba(17,17,17,0.78)";
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
    blogPostModeInputs.forEach((input) => {
      input.checked = input.value === notificationPreferences.blog_post_mode;
    });
    if (notifyFriendRequestInput) notifyFriendRequestInput.checked = notificationPreferences.notify_friend_request !== false;
    if (notifyFriendRemovedInput) notifyFriendRemovedInput.checked = notificationPreferences.notify_friend_removed !== false;
    if (notifyEventInviteInput) notifyEventInviteInput.checked = notificationPreferences.notify_event_invite !== false;
    if (notifyEventOneHourInput) notifyEventOneHourInput.checked = notificationPreferences.notify_event_one_hour !== false;
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
      if (fullNameEl) fullNameEl.value = profile.full_name || "";
      if (usernameEl) usernameEl.value = profile.username || "";
      if (bioEl) bioEl.value = profile.bio || "";
      if (profileLinksInputEl) profileLinksInputEl.value = Array.isArray(profile.personal_links) ? profile.personal_links.join("\n") : "";
      renderProfileDisplay(profile, currentUserEmail);
      if (avatarInputEl) avatarInputEl.value = "";
      setProfileModalStatus("Profile saved.");
      setStatus("Profile saved.");
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

  function snapDateTimeLocalValueToQuarterHour(value) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return toLocalDateTimeValue(roundUpToQuarterHour(d));
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
    if (!eventStartInput || !eventEndInput) return;
    const snappedStartValue = snapDateTimeLocalValueToQuarterHour(String(eventStartInput.value || "").trim());
    if (!snappedStartValue) return;
    eventStartInput.value = snappedStartValue;
    const end = new Date(snappedStartValue);
    end.setHours(end.getHours() + 1);
    eventEndInput.value = toLocalDateTimeValue(end);
  }

  function normalizeEventDateInputs() {
    if (!eventStartInput || !eventEndInput) return;
    const snappedStartValue = snapDateTimeLocalValueToQuarterHour(String(eventStartInput.value || "").trim());
    const snappedEndValue = snapDateTimeLocalValueToQuarterHour(String(eventEndInput.value || "").trim());
    if (snappedStartValue) eventStartInput.value = snappedStartValue;
    if (snappedEndValue) eventEndInput.value = snappedEndValue;
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
    if (!eventStartInput || !eventEndInput) return;
    const { start, end } = defaultEventRangeForDay(dayKey);
    editingEventId = "";
    if (eventModalTitle) eventModalTitle.textContent = "Create Event";
    if (eventCreateBtn) eventCreateBtn.textContent = "Create Event";
    if (eventDeleteBtn) eventDeleteBtn.style.display = "none";
    eventStartInput.value = toLocalDateTimeValue(start);
    eventEndInput.value = toLocalDateTimeValue(end);
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
    if (!eventRow || !eventStartInput || !eventEndInput) return;
    editingEventId = String(eventRow.event_id || "").trim();
    if (!editingEventId) return;
    if (eventModalTitle) eventModalTitle.textContent = "Edit Event";
    if (eventCreateBtn) eventCreateBtn.textContent = "Save Event";
    if (eventDeleteBtn) eventDeleteBtn.style.display = "inline-flex";
    if (eventTitleInput) eventTitleInput.value = String(eventRow.title || "");
    if (eventLocationInput) eventLocationInput.value = String(eventRow.location || "");
    if (eventDescriptionInput) eventDescriptionInput.value = String(eventRow.description || "");
    eventStartInput.value = toLocalDateTimeValue(eventRow.starts_at);
    eventEndInput.value = toLocalDateTimeValue(eventRow.ends_at);
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
    friendsCounterText.textContent = `Friends: ${total}`;
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
        blog_post_mode: String(row.blog_post_mode || "all"),
        notify_friend_request: row.notify_friend_request !== false,
        notify_friend_removed: row.notify_friend_removed !== false,
        notify_event_invite: row.notify_event_invite !== false,
        notify_event_one_hour: row.notify_event_one_hour !== false,
      };
    }
    renderNotificationPreferences();
  }

  async function saveNotificationPreferences() {
    if (!window.PaidenAuth || typeof window.PaidenAuth.getClient !== "function") return false;
    const selectedModeInput = blogPostModeInputs.find((input) => input.checked);
    const nextPrefs = {
      blog_post_mode: selectedModeInput ? selectedModeInput.value : "all",
      notify_friend_request: Boolean(notifyFriendRequestInput?.checked),
      notify_friend_removed: Boolean(notifyFriendRemovedInput?.checked),
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
        p_notify_friend_removed: nextPrefs.notify_friend_removed,
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
      const where = e.location ? `<br>${escapeHTML(e.location)}` : "";
      const status = e.invite_status === "pending" ? " (Invite Pending)" : "";
      const rowClass = e.invite_status === "pending" ? "calendar-event-row pending" : "calendar-event-row";
      const editButton = e.can_edit
        ? `<button class="calendar-event-edit-btn" data-edit-event-id="${escapeHTML(String(e.event_id || ""))}" type="button">Edit</button>`
        : "";
      return `
        <div class="${rowClass}">
          <div class="calendar-event-row-head">
            <strong>${escapeHTML(e.title || "Untitled")}</strong>
            ${editButton}
          </div>
          <div class="calendar-event-row-body">${status ? `<div>${status.trim()}</div>` : ""}<div>${owner}${escapeHTML(when)}</div>${e.location ? `<div>${escapeHTML(e.location)}</div>` : ""}</div>
        </div>
      `;
    }).join("");
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
      window.setTimeout(() => { window.location.href = "/signin"; }, 900);
      return;
    }
    const profile = res.profile || {};
    currentUserEmail = res.user.email || "";
    if (fullNameEl) fullNameEl.value = profile.full_name || "";
    if (usernameEl) usernameEl.value = profile.username || "";
    if (bioEl) bioEl.value = profile.bio || "";
    if (profileLinksInputEl) profileLinksInputEl.value = Array.isArray(profile.personal_links) ? profile.personal_links.join("\n") : "";
    renderProfileDisplay(profile, currentUserEmail);

    renderCalendarSelectors();
    renderWeekdays();
    await loadFriends();
    await loadFriendRequests();
    await loadNotificationPreferences();
    await loadCalendarEventsForMonth();
    await loadPendingEventInvites();

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
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

  if (notificationSettingsBtn) {
    notificationSettingsBtn.addEventListener("click", () => {
      openNotificationModal();
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

  if (eventStartInput) {
    eventStartInput.addEventListener("change", syncEventEndOneHourAfterStart);
  }

  if (eventEndInput) {
    eventEndInput.addEventListener("change", () => {
      const snappedEndValue = snapDateTimeLocalValueToQuarterHour(String(eventEndInput.value || "").trim());
      if (snappedEndValue) {
        eventEndInput.value = snappedEndValue;
      }
    });
  }

  if (eventCreateForm) {
    eventCreateForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!window.PaidenAuth || typeof window.PaidenAuth.getClient !== "function") return;

      normalizeEventDateInputs();
      const title = String(eventTitleInput?.value || "").trim();
      const startsLocal = String(eventStartInput?.value || "").trim();
      const endsLocal = String(eventEndInput?.value || "").trim();
      const location = String(eventLocationInput?.value || "").trim();
      const description = String(eventDescriptionInput?.value || "").trim();

      if (!title || !startsLocal || !endsLocal) {
        setEventModalStatus("Event title, start, and end are required.", true);
        return;
      }

      const startsAt = new Date(startsLocal);
      const endsAt = new Date(endsLocal);
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
      setStatus(acceptRequest ? "Friend request accepted." : "Friend request rejected.");
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
