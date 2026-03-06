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
  const DEFAULT_AVATAR = "/images/default_pfp.jpg";
  let friendsDropdownOpen = false;

  function setStatus(message, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.style.color = isError ? "#a10000" : "rgba(17,17,17,0.78)";
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

  function escapeHTML(str) {
    return String(str || "").replace(/[&<>"']/g, (s) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[s] || s));
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

  async function loadFriends() {
    if (!window.PaidenAuth || typeof window.PaidenAuth.getClient !== "function") return;
    const client = window.PaidenAuth.getClient();
    const { data, error } = await client.rpc("get_my_friends");
    if (error) {
      setFriendsCount(0);
      renderFriendsDropdown([]);
      return;
    }
    const rows = (Array.isArray(data) ? data : [])
      .filter((row) => row && String(row.username || "").trim())
      .sort((a, b) => String(a.username || "").localeCompare(String(b.username || ""), undefined, { sensitivity: "base" }));
    setFriendsCount(rows.length);
    renderFriendsDropdown(rows);
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
    await loadFriends();
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
        setStatus("Profile saved.");
        if (avatarInputEl) avatarInputEl.value = "";
      } catch (err) {
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

  loadProfile();
})();
