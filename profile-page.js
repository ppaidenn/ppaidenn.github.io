(() => {
  const usernameEl = document.getElementById("profileUsername");
  const emailEl = document.getElementById("profileEmail");
  const bioEl = document.getElementById("profileBio");
  const avatarImgEl = document.getElementById("profileAvatarImg");
  const avatarInputEl = document.getElementById("profileAvatarInput");
  const saveBtn = document.getElementById("profileSaveBtn");
  const statusEl = document.getElementById("profileStatus");

  const friendsToggleBtn = document.getElementById("friendsToggleBtn");
  const friendsCounterText = document.getElementById("friendsCounterText");
  const friendsDropdown = document.getElementById("friendsDropdown");

  const friendRequestsCounterText = document.getElementById("friendRequestsCounterText");
  const friendRequestsList = document.getElementById("friendRequestsList");

  const calendarMonthLabel = document.getElementById("calendarMonthLabel");
  const calendarPrevMonthBtn = document.getElementById("calendarPrevMonthBtn");
  const calendarNextMonthBtn = document.getElementById("calendarNextMonthBtn");
  const calendarWeekdays = document.getElementById("calendarWeekdays");
  const calendarGrid = document.getElementById("calendarGrid");
  const calendarEventsList = document.getElementById("calendarEventsList");

  const eventCreateForm = document.getElementById("eventCreateForm");
  const eventTitleInput = document.getElementById("eventTitleInput");
  const eventStartInput = document.getElementById("eventStartInput");
  const eventEndInput = document.getElementById("eventEndInput");
  const eventLocationInput = document.getElementById("eventLocationInput");
  const eventDescriptionInput = document.getElementById("eventDescriptionInput");
  const eventInviteFriendsBox = document.getElementById("eventInviteFriendsBox");
  const eventCreateBtn = document.getElementById("eventCreateBtn");

  const eventInvitesCounterText = document.getElementById("eventInvitesCounterText");
  const eventInvitesList = document.getElementById("eventInvitesList");

  const DEFAULT_AVATAR = "/images/default_pfp.jpg";
  let friendsDropdownOpen = false;
  let friendsCache = [];

  let calendarMonthDate = new Date();
  calendarMonthDate = new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth(), 1);
  let selectedDayKey = toDateKey(new Date());
  let calendarEvents = [];

  function setStatus(message, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.style.color = isError ? "#a10000" : "rgba(17,17,17,0.78)";
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

  function renderInviteFriendOptions() {
    if (!eventInviteFriendsBox) return;
    if (!friendsCache.length) {
      eventInviteFriendsBox.innerHTML = '<div class="request-empty">No friends to invite yet.</div>';
      return;
    }
    eventInviteFriendsBox.innerHTML = friendsCache.map((f) => {
      const username = String(f.username || "").trim();
      return `
        <label class="invite-option">
          <input type="checkbox" data-invite-username="${escapeHTML(username)}">
          <span>${escapeHTML(username)}</span>
        </label>
      `;
    }).join("");
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
    rows.forEach((r) => {
      const id = String(r.request_id || "");
      const from = String(r.username || "Someone");
      if (id) notifyOnce(`friend-request-${id}`, "New Friend Request", `${from} sent you a friend request.`);
    });
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
      return `<div class="${rowClass}"><strong>${escapeHTML(e.title || "Untitled")}</strong>${status}<br>${owner}${escapeHTML(when)}${where}</div>`;
    }).join("");
  }

  function renderCalendarGrid() {
    if (!calendarGrid || !calendarMonthLabel) return;
    const monthStart = new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth(), 1);
    const monthEnd = new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth() + 1, 0);

    calendarMonthLabel.textContent = monthStart.toLocaleDateString([], { month: "long", year: "numeric" });

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
    const { data, error } = await client.rpc("get_my_calendar_events", {
      start_at: start.toISOString(),
      end_at: end.toISOString(),
    });
    if (error) {
      calendarEvents = [];
      renderCalendarGrid();
      return;
    }
    calendarEvents = Array.isArray(data) ? data : [];

    const now = Date.now();
    calendarEvents.forEach((e) => {
      const startAt = new Date(e.starts_at).getTime();
      const hoursAway = (startAt - now) / (1000 * 60 * 60);
      if (hoursAway > 0 && hoursAway <= 24) {
        notifyOnce(`event-upcoming-${e.event_id}`, "Upcoming Event", `${e.title} starts at ${formatEventTime(e.starts_at)}.`);
      }
    });

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
    rows.forEach((r) => {
      const key = String(r.event_id || "");
      if (key) notifyOnce(`event-invite-${key}`, "Event Invite", `${r.inviter_username} invited you to ${r.title}.`);
    });
  }

  function selectedInviteUsernames() {
    if (!eventInviteFriendsBox) return [];
    const names = [];
    eventInviteFriendsBox.querySelectorAll("input[data-invite-username]:checked").forEach((el) => {
      const username = String(el.getAttribute("data-invite-username") || "").trim();
      if (username) names.push(username);
    });
    return names;
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
    if (usernameEl) usernameEl.value = profile.username || "";
    if (emailEl) emailEl.textContent = res.user.email || "-";
    if (bioEl) bioEl.value = profile.bio || "";
    if (avatarImgEl) avatarImgEl.src = profile.avatar_url || DEFAULT_AVATAR;

    renderWeekdays();
    await loadFriends();
    await loadFriendRequests();
    await loadCalendarEventsForMonth();
    await loadPendingEventInvites();

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    setStatus("Profile loaded.");
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      if (!window.PaidenAuth) return setStatus("Auth service unavailable.", true);
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";
      try {
        let avatarDataUrl = null;
        const file = avatarInputEl && avatarInputEl.files && avatarInputEl.files[0] ? avatarInputEl.files[0] : null;
        if (file) {
          avatarDataUrl = await downscaleImageToJpegDataUrl(file);
          if (avatarDataUrl.length > 1024 * 1024 * 1.2) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Profile";
            return setStatus("Profile image is too large after compression.", true);
          }
        }
        const patch = {
          username: usernameEl ? usernameEl.value : "",
          bio: bioEl ? bioEl.value : "",
        };
        if (avatarDataUrl) patch.avatar_url = avatarDataUrl;

        const res = await window.PaidenAuth.updateProfile(patch);
        if (!res.ok) return setStatus(res.error || "Could not save profile.", true);
        const profile = res.profile || {};
        if (avatarImgEl) avatarImgEl.src = profile.avatar_url || DEFAULT_AVATAR;
        await loadFriends();
        await loadFriendRequests();
        setStatus("Profile saved.");
        if (avatarInputEl) avatarInputEl.value = "";
      } catch (_) {
        setStatus("Could not save profile.", true);
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Profile";
      }
    });
  }

  if (avatarInputEl && avatarImgEl) {
    avatarInputEl.addEventListener("change", async () => {
      const file = avatarInputEl.files && avatarInputEl.files[0] ? avatarInputEl.files[0] : null;
      if (!file) return;
      try {
        const previewDataUrl = await downscaleImageToJpegDataUrl(file);
        avatarImgEl.src = previewDataUrl || DEFAULT_AVATAR;
        setStatus("Preview updated. Save profile to keep this photo.");
      } catch (_) {
        setStatus("Could not preview selected image.", true);
      }
    });
  }

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

  if (calendarGrid) {
    calendarGrid.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-day-key]");
      if (!btn) return;
      selectedDayKey = String(btn.getAttribute("data-day-key") || "");
      renderCalendarGrid();
    });
  }

  if (eventCreateForm) {
    eventCreateForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!window.PaidenAuth || typeof window.PaidenAuth.getClient !== "function") return;

      const title = String(eventTitleInput?.value || "").trim();
      const startsLocal = String(eventStartInput?.value || "").trim();
      const endsLocal = String(eventEndInput?.value || "").trim();
      const location = String(eventLocationInput?.value || "").trim();
      const description = String(eventDescriptionInput?.value || "").trim();

      if (!title || !startsLocal || !endsLocal) {
        setStatus("Event title, start, and end are required.", true);
        return;
      }

      const startsAt = new Date(startsLocal);
      const endsAt = new Date(endsLocal);
      if (!(startsAt instanceof Date) || Number.isNaN(startsAt.getTime()) || !(endsAt instanceof Date) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
        setStatus("Event date/time is invalid.", true);
        return;
      }

      const inviteNames = selectedInviteUsernames();
      if (eventCreateBtn) {
        eventCreateBtn.disabled = true;
        eventCreateBtn.textContent = "Creating...";
      }
      try {
        const client = window.PaidenAuth.getClient();
        const { data, error } = await client.rpc("create_event_with_invites", {
          event_title: title,
          event_description: description || null,
          event_location: location || null,
          event_starts_at: startsAt.toISOString(),
          event_ends_at: endsAt.toISOString(),
          invite_usernames: inviteNames,
        });
        if (error || !data) {
          setStatus((error && error.message) || "Could not create event.", true);
          return;
        }

        eventCreateForm.reset();
        await loadCalendarEventsForMonth();
        await loadPendingEventInvites();
        setStatus("Event created.");
      } finally {
        if (eventCreateBtn) {
          eventCreateBtn.disabled = false;
          eventCreateBtn.textContent = "Create Event";
        }
      }
    });
  }

  document.addEventListener("click", async (event) => {
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

  loadProfile();
})();
