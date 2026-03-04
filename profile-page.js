(() => {
  const usernameEl = document.getElementById("profileUsername");
  const emailEl = document.getElementById("profileEmail");
  const bioEl = document.getElementById("profileBio");
  const sillyQuestionEl = document.getElementById("profileSillyQuestion");
  const sillyAnswerEl = document.getElementById("profileSillyAnswer");
  const avatarImgEl = document.getElementById("profileAvatarImg");
  const avatarInputEl = document.getElementById("profileAvatarInput");
  const saveBtn = document.getElementById("profileSaveBtn");
  const statusEl = document.getElementById("profileStatus");

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
    if (sillyQuestionEl) sillyQuestionEl.textContent = profile.silly_question || "No silly question assigned yet.";
    if (sillyAnswerEl) sillyAnswerEl.value = profile.silly_answer || "";
    if (avatarImgEl) avatarImgEl.src = profile.avatar_url || "/images/favicon.png";
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
          silly_answer: sillyAnswerEl ? sillyAnswerEl.value : "",
        };
        if (avatarDataUrl) patch.avatar_url = avatarDataUrl;

        const res = await window.PaidenAuth.updateProfile(patch);
        if (!res.ok) return setStatus(res.error || "Could not save profile.", true);
        const profile = res.profile || {};
        if (avatarImgEl) avatarImgEl.src = profile.avatar_url || "/images/favicon.png";
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

  loadProfile();
})();
