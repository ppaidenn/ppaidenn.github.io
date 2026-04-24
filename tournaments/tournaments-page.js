(() => {
  const CLIENT_ID_KEY = "paiden_spotify_client_id";
  const AUTH_KEY = "paiden_spotify_auth";
  const VERIFIER_KEY = "paiden_spotify_pkce_verifier";
  const CONTACT_ENDPOINT = "https://irauuqhqqkctcwulqzsw.supabase.co/functions/v1/contact-message";
  const SCOPES = ["playlist-read-private", "playlist-read-collaborative"].join(" ");
  const REDIRECT_URI = `${window.location.origin}/tournaments/`;
  const SPOTIFY_ACCOUNTS = "https://accounts.spotify.com";
  const SPOTIFY_API = "https://api.spotify.com/v1";

  const pageMode = document.body.dataset.tournamentView
    || (document.getElementById("tournamentDetailRoot")
      ? "detail"
      : document.getElementById("tournamentLibraryList")
        ? "library"
        : document.getElementById("buildBracketBtn")
          ? "builder"
          : /^\/tournaments\/?$/.test(window.location.pathname)
            ? "hub"
            : "unknown");

  const state = {
    auth: null,
    paidenUser: null,
    paidenProfile: null,
    library: [],
    playlist: null,
    entrants: [],
    rounds: [],
    mainDrawSize: 0,
    picks: {},
    activeRoundIndex: null,
    activeSelectionCursor: 0,
    activeTournament: null,
    friends: [],
    tournamentRequestTurnstileToken: "",
    builderMode: "",
    authRedirectProcessing: false,
    lastHandledAuthUrl: "",
  };

  const clientIdInput = document.getElementById("spotifyClientIdInput");
  const requestBracketModeBtn = document.getElementById("requestBracketModeBtn");
  const customSpotifyModeBtn = document.getElementById("customSpotifyModeBtn");
  const requestBracketPanel = document.getElementById("requestBracketPanel");
  const customSpotifySetupPanel = document.getElementById("customSpotifySetupPanel");
  const customBracketPanel = document.getElementById("customBracketPanel");
  const spotifyCustomClientWrap = document.getElementById("spotifyCustomClientWrap");
  const requestNameInput = document.getElementById("requestNameInput");
  const requestBracketNameInput = document.getElementById("requestBracketNameInput");
  const requestCollabLinkInput = document.getElementById("requestCollabLinkInput");
  const requestOtherInfoInput = document.getElementById("requestOtherInfoInput");
  const sendPaidenRequestBtn = document.getElementById("sendPaidenRequestBtn");
  const saveClientBtn = document.getElementById("saveSpotifyClientBtn");
  const connectBtn = document.getElementById("spotifyConnectBtn");
  const disconnectBtn = document.getElementById("spotifyDisconnectBtn");
  const spotifyAuthPill = document.getElementById("spotifyAuthPill");
  const paidenAuthPill = document.getElementById("paidenAuthPill");
  const bracketNameInput = document.getElementById("bracketNameInput");
  const tournamentVisibilitySelect = document.getElementById("tournamentVisibilitySelect");
  const playlistInput = document.getElementById("playlistInput");
  const buildBracketBtn = document.getElementById("buildBracketBtn");
  const resetBracketBtn = document.getElementById("resetBracketBtn");
  const statusCard = document.getElementById("statusCard");
  const statusText = document.getElementById("statusText");
  const debugCard = document.getElementById("debugCard");
  const debugOutput = document.getElementById("debugOutput");
  const savedTournamentCard = document.getElementById("savedTournamentCard");
  const savedTournamentTitle = document.getElementById("savedTournamentTitle");
  const savedTournamentCopy = document.getElementById("savedTournamentCopy");
  const savedTournamentOpenLink = document.getElementById("savedTournamentOpenLink");
  const tournamentLibraryList = document.getElementById("tournamentLibraryList");
  const libraryCount = document.getElementById("libraryCount");
  const libraryNoticeCard = document.getElementById("libraryNoticeCard");
  const libraryNoticeText = document.getElementById("libraryNoticeText");
  const detailHeroCover = document.getElementById("detailHeroCover");
  const detailHeroTitle = document.getElementById("detailHeroTitle");
  const detailHeroMeta = document.getElementById("detailHeroMeta");
  const detailHeroSubnote = document.getElementById("detailHeroSubnote");
  const detailVisibilityChip = document.getElementById("detailVisibilityChip");
  const detailPlaylistChip = document.getElementById("detailPlaylistChip");
  const detailEmptyState = document.getElementById("detailEmptyState");
  const detailEmptyStateText = document.getElementById("detailEmptyStateText");
  const detailNoticeCard = document.getElementById("detailNoticeCard");
  const detailNoticeText = document.getElementById("detailNoticeText");
  const participantsList = document.getElementById("participantsList");
  const participantSummaryText = document.getElementById("participantSummaryText");
  const friendInviteInput = document.getElementById("friendInviteInput");
  const friendInviteSuggestions = document.getElementById("friendInviteSuggestions");
  const inviteFriendBtn = document.getElementById("inviteFriendBtn");
  const createInviteLinkBtn = document.getElementById("createInviteLinkBtn");
  const inviteLinkOutput = document.getElementById("inviteLinkOutput");
  const roundStage = document.getElementById("roundStage");
  const championChip = document.getElementById("championChip");
  const voteModal = document.getElementById("voteModal");
  const voteModalKicker = document.getElementById("voteModalKicker");
  const voteModalTitle = document.getElementById("voteModalTitle");
  const voteModalSubtitle = document.getElementById("voteModalSubtitle");
  const voteProgressText = document.getElementById("voteProgressText");
  const voteCompleteNote = document.getElementById("voteCompleteNote");
  const voteMatchup = document.getElementById("voteMatchup");
  const votePrevBtn = document.getElementById("votePrevBtn");
  const voteNextBtn = document.getElementById("voteNextBtn");
  const voteModalCloseBtn = document.getElementById("voteModalCloseBtn");

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setStatus(message, kind = "info") {
    if (!statusText || !statusCard) return;
    statusText.textContent = message;
    statusCard.classList.remove("error", "success");
    if (kind === "error") statusCard.classList.add("error");
    if (kind === "success") statusCard.classList.add("success");
  }

  function setDebug(lines) {
    if (!debugOutput) return;
    debugOutput.textContent = Array.isArray(lines) ? lines.join("\n") : String(lines || "");
  }

  function setLibraryNotice(message = "", show = false) {
    if (!libraryNoticeCard || !libraryNoticeText) return;
    libraryNoticeText.textContent = message || "";
    libraryNoticeCard.hidden = !show;
  }

  function setDetailNotice(message = "", show = false) {
    if (!detailNoticeCard || !detailNoticeText) return;
    detailNoticeText.textContent = message || "";
    detailNoticeCard.hidden = !show;
  }

  function getStoredClientId() {
    return localStorage.getItem(CLIENT_ID_KEY) || "";
  }

  function saveClientId(clientId) {
    localStorage.setItem(CLIENT_ID_KEY, clientId);
  }

  function getClientMode() {
    return state.builderMode || "";
  }

  function maskClientId(value) {
    const raw = String(value || "").trim();
    if (!raw) return "(missing)";
    if (raw.length <= 6) return "••••••";
    return `${"•".repeat(Math.max(0, raw.length - 4))}${raw.slice(-4)}`;
  }

  function describeClientMode() {
    const mode = getClientMode();
    if (mode === "custom") {
      return `custom client (${maskClientId(localStorage.getItem(CLIENT_ID_KEY) || "")})`;
    }
    if (mode === "request") return "request Paiden build the bracket";
    return "not selected";
  }

  function isCustomSpotifyMode() {
    return getClientMode() === "custom";
  }

  function setBuilderMode(mode = "") {
    state.builderMode = mode === "custom" || mode === "request" ? mode : "";
    const custom = state.builderMode === "custom";
    const request = state.builderMode === "request";
    if (requestBracketModeBtn) requestBracketModeBtn.classList.toggle("selected", request);
    if (customSpotifyModeBtn) customSpotifyModeBtn.classList.toggle("selected", custom);
    if (requestBracketPanel) requestBracketPanel.hidden = !request;
    if (customSpotifySetupPanel) customSpotifySetupPanel.hidden = !custom;
    if (customBracketPanel) customBracketPanel.hidden = !custom;
    if (spotifyCustomClientWrap) spotifyCustomClientWrap.hidden = !custom;
    if (saveClientBtn) saveClientBtn.disabled = !custom;
    if (debugCard) debugCard.hidden = !custom;
    if (connectBtn) connectBtn.hidden = !custom;
    if (disconnectBtn) disconnectBtn.hidden = !custom;
    if (clientIdInput) clientIdInput.value = custom ? (localStorage.getItem(CLIENT_ID_KEY) || "") : "";
  }

  function loadAuth() {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function saveAuth(auth) {
    state.auth = auth;
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  }

  function clearAuth() {
    state.auth = null;
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(VERIFIER_KEY);
  }

  function setTournamentRequestSubmitting(submitting) {
    if (!sendPaidenRequestBtn) return;
    sendPaidenRequestBtn.disabled = !!submitting;
    sendPaidenRequestBtn.innerHTML = submitting
      ? `<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><span>Sending...</span>`
      : `<i class="fa-solid fa-paper-plane" aria-hidden="true"></i><span>Send Request</span>`;
  }

  function updateSpotifyAuthUi() {
    if (!spotifyAuthPill) return;
    const connected = !!(state.auth && state.auth.access_token);
    spotifyAuthPill.classList.toggle("offline", !connected);
    spotifyAuthPill.innerHTML = connected
      ? `<i class="fab fa-spotify" aria-hidden="true"></i><span>Spotify connected${state.auth.user_name ? ` as ${escapeHtml(state.auth.user_name)}` : ""}</span>`
      : `<i class="fa-solid fa-circle" aria-hidden="true"></i><span>Not connected</span>`;
  }

  function updatePaidenAuthUi() {
    if (!paidenAuthPill) return;
    const profile = state.paidenProfile;
    const connected = !!(state.paidenUser && profile);
    paidenAuthPill.classList.toggle("offline", !connected);
    paidenAuthPill.innerHTML = connected
      ? `<i class="fa-solid fa-user-check" aria-hidden="true"></i><span>Signed in to paiden.com as ${escapeHtml(profile.username || profile.full_name || "account")}</span>`
      : `<i class="fa-solid fa-circle" aria-hidden="true"></i><span>Not signed in to paiden.com</span>`;
  }

  function getPaidenAuth() {
    return window.PaidenAuth || null;
  }

  async function callRpc(name, params = {}) {
    const auth = getPaidenAuth();
    if (!auth || typeof auth.getClient !== "function") {
      throw new Error("Paiden auth client is not available on this page.");
    }
    const client = auth.getClient();
    const { data, error } = await client.rpc(name, params || {});
    if (error) throw new Error(error.message || `Could not call ${name}.`);
    return data;
  }

  async function loadCurrentPaidenProfile() {
    const auth = getPaidenAuth();
    if (!auth || typeof auth.getCurrentProfile !== "function") {
      state.paidenUser = null;
      state.paidenProfile = null;
      updatePaidenAuthUi();
      return;
    }
    const result = await auth.getCurrentProfile();
    if (!result.ok) {
      state.paidenUser = null;
      state.paidenProfile = null;
      updatePaidenAuthUi();
      return;
    }
    state.paidenUser = result.user || null;
    state.paidenProfile = result.profile || null;
    if (requestNameInput && !requestNameInput.value) {
      requestNameInput.value = state.paidenProfile?.username ? `@${state.paidenProfile.username}` : "";
    }
    updatePaidenAuthUi();
  }

  function normalizeLibraryEntry(row) {
    if (!row || typeof row !== "object") return null;
    return {
      id: row.tournament_id || "",
      slug: row.tournament_slug || "",
      name: row.bracket_name || "Untitled Bracket",
      visibility: row.visibility === "public" ? "public" : "private",
      playlistName: row.playlist_name || "Untitled Playlist",
      cover: row.playlist_cover_url || "",
      ownerUsername: row.owner_username || "",
      ownerAvatarUrl: row.owner_avatar_url || "",
      entrantCount: Number(row.entrant_count) || 0,
      participantCount: Number(row.participant_count) || 0,
      updatedAt: row.updated_at || "",
      isOwner: !!row.is_owner,
      isMember: !!row.is_member,
      canVote: !!row.can_vote,
    };
  }

  function normalizeTournamentDetail(row) {
    if (!row || typeof row !== "object") return null;
    const playlistCover = row.playlist_cover_url || "";
    return {
      id: row.tournament_id || "",
      slug: row.tournament_slug || "",
      name: row.bracket_name || "Untitled Bracket",
      visibility: row.visibility === "public" ? "public" : "private",
      ownerId: row.owner_id || "",
      ownerUsername: row.owner_username || "",
      ownerAvatarUrl: row.owner_avatar_url || "",
      playlist: {
        id: row.playlist_id || "",
        name: row.playlist_name || "Untitled Playlist",
        owner: { display_name: row.playlist_owner_name || row.owner_username || "" },
        images: playlistCover ? [{ url: playlistCover }] : [],
        external_urls: { spotify: row.spotify_playlist_url || "" },
      },
      entrants: Array.isArray(row.entrants) ? row.entrants : [],
      rounds: Array.isArray(row.rounds) ? row.rounds : [],
      picks: row.picks && typeof row.picks === "object" ? row.picks : {},
      mainDrawSize: Number(row.main_draw_size) || 0,
      createdAt: row.created_at || "",
      updatedAt: row.updated_at || "",
      isOwner: !!row.is_owner,
      isMember: !!row.is_member,
      canVote: !!row.can_vote,
      participants: Array.isArray(row.participants) ? row.participants : [],
    };
  }

  function applyTournamentRecord(record) {
    state.activeTournament = record || null;
    state.playlist = record?.playlist || null;
    state.entrants = record?.entrants || [];
    state.rounds = record?.rounds || [];
    state.mainDrawSize = record?.mainDrawSize || 0;
    state.picks = record?.picks || {};
    state.activeRoundIndex = null;
    state.activeSelectionCursor = 0;
  }

  function clearTournamentState() {
    applyTournamentRecord(null);
    renderApp();
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString();
  }

  function randomString(length) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => ("0" + b.toString(16)).slice(-2)).join("");
  }

  function base64UrlEncode(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    bytes.forEach((b) => { binary += String.fromCharCode(b); });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  async function createCodeChallenge(verifier) {
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return base64UrlEncode(digest);
  }

  async function beginSpotifyAuth() {
    if (!isCustomSpotifyMode()) {
      setStatus("Choose the self-serve Spotify path first, then connect your Spotify app.", "error");
      return;
    }
    const clientId = String(getStoredClientId() || "").trim();
    if (!clientId) {
      setStatus("Save a Spotify Client ID first if you are using your own Spotify app on this device.", "error");
      clientIdInput?.focus();
      return;
    }
    const verifier = randomString(64);
    localStorage.setItem(VERIFIER_KEY, verifier);
    const challenge = await createCodeChallenge(verifier);
    const authUrl = new URL(`${SPOTIFY_ACCOUNTS}/authorize`);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("scope", SCOPES);
    authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("code_challenge", challenge);
    authUrl.searchParams.set("show_dialog", "true");
    window.location.href = authUrl.toString();
  }

  async function exchangeCodeForToken(code) {
    const verifier = localStorage.getItem(VERIFIER_KEY);
    const clientId = getStoredClientId();
    if (!verifier || !clientId) throw new Error("Missing PKCE verifier or Spotify client ID.");
    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    });
    const response = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error_description || data.error || "Could not complete Spotify sign-in.");
    localStorage.removeItem(VERIFIER_KEY);
    return data;
  }

  async function refreshToken() {
    const auth = loadAuth();
    const clientId = getStoredClientId();
    if (!auth || !auth.refresh_token || !clientId) throw new Error("No refresh token available.");
    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: auth.refresh_token,
    });
    const response = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error_description || data.error || "Could not refresh Spotify session.");
    const nextAuth = {
      ...auth,
      access_token: data.access_token,
      expires_at: Date.now() + ((Number(data.expires_in) || 3600) - 45) * 1000,
      refresh_token: data.refresh_token || auth.refresh_token,
    };
    saveAuth(nextAuth);
    return nextAuth.access_token;
  }

  async function getValidAccessToken() {
    const auth = state.auth || loadAuth();
    if (!auth) throw new Error("Connect Spotify first.");
    if (auth.access_token && Number(auth.expires_at || 0) > Date.now()) {
      state.auth = auth;
      return auth.access_token;
    }
    return refreshToken();
  }

  async function spotifyFetch(path, accessToken, searchParams = null) {
    const url = new URL(`${SPOTIFY_API}${path}`);
    if (searchParams) {
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.set(key, value);
        }
      });
    }
    return spotifyFetchUrl(url.toString(), accessToken);
  }

  async function spotifyFetchUrl(url, accessToken) {
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error?.message || data.error_description || "Spotify request failed.");
      error.spotifyStatus = response.status;
      error.spotifyPayload = data;
      error.spotifyUrl = url.toString();
      throw error;
    }
    return data;
  }

  async function fetchCurrentUserProfile(accessToken) {
    return spotifyFetch("/me", accessToken);
  }

  async function handleSpotifyRedirect() {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    if (!code && !error) return;
    const redirectKey = `${url.pathname}${url.search}`;
    if (state.authRedirectProcessing || state.lastHandledAuthUrl === redirectKey) return;
    state.authRedirectProcessing = true;
    state.lastHandledAuthUrl = redirectKey;

    if (error) {
      setStatus(`Spotify sign-in was not completed: ${error}`, "error");
      url.searchParams.delete("error");
      history.replaceState({}, "", url.pathname);
      state.authRedirectProcessing = false;
      return;
    }

    try {
      setStatus("Finishing Spotify sign-in...");
      const tokenData = await exchangeCodeForToken(code);
      saveAuth({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: Date.now() + ((Number(tokenData.expires_in) || 3600) - 45) * 1000,
      });
      const accessToken = await getValidAccessToken();
      const profile = await fetchCurrentUserProfile(accessToken).catch(() => null);
      const userName = profile?.display_name || profile?.id || "";
      saveAuth({ ...state.auth, user_name: userName, user_country: profile?.country || "" });
      setStatus(userName ? `Spotify connected as ${userName}.` : "Spotify connected.", "success");
      if (pageMode === "hub") {
        window.location.replace("/bracket-builder/");
        return;
      }
    } catch (errorObj) {
      clearAuth();
      setStatus(errorObj.message || "Could not complete Spotify sign-in.", "error");
    } finally {
      url.searchParams.delete("code");
      url.searchParams.delete("state");
      history.replaceState({}, "", url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ""));
      state.authRedirectProcessing = false;
    }
  }

  async function syncSpotifyAuthState() {
    await handleSpotifyRedirect();
    state.auth = loadAuth();
    updateSpotifyAuthUi();
  }

  function parsePlaylistId(input) {
    const value = String(input || "").trim();
    if (!value) return null;
    if (/^[A-Za-z0-9]{22}$/.test(value)) return value;
    const uriMatch = value.match(/^spotify:playlist:([A-Za-z0-9]{22})$/i);
    if (uriMatch) return uriMatch[1];
    try {
      const url = new URL(value);
      const match = url.pathname.match(/\/playlist\/([A-Za-z0-9]{22})/i);
      return match ? match[1] : null;
    } catch (_) {
      return null;
    }
  }

  async function runPlaylistDiagnostics(playlistId, accessToken) {
    const lines = [
      `Spotify App Mode: ${describeClientMode()}`,
      `Redirect URI: ${REDIRECT_URI}`,
      `Playlist ID: ${playlistId || "(missing)"}`,
      `Scopes requested: ${SCOPES}`,
      "",
    ];
    try {
      const me = await spotifyFetch("/me", accessToken);
      lines.push("[OK] /me");
      lines.push(`Spotify account: ${me.display_name || "(no display name)"}`);
      lines.push(`Spotify user id: ${me.id || "(missing)"}`);
    } catch (errorObj) {
      lines.push(`[FAIL ${errorObj?.spotifyStatus || "?"}] /me`);
      lines.push(`Message: ${errorObj?.message || "Unknown Spotify error"}`);
      setDebug(lines);
      return;
    }

    try {
      const playlist = await spotifyFetch(`/playlists/${playlistId}`, accessToken, {
        fields: "id,name,public,collaborative,owner(display_name,id),images(url),items(total)",
      });
      lines.push("");
      lines.push(`[OK] /playlists/${playlistId}`);
      lines.push(`Playlist name: ${playlist.name || "(unknown)"}`);
      lines.push(`Playlist owner: ${playlist.owner?.display_name || playlist.owner?.id || "(unknown)"}`);
      lines.push(`Playlist owner id: ${playlist.owner?.id || "(missing)"}`);
      lines.push(`Public: ${String(playlist.public)}`);
      lines.push(`Collaborative: ${String(playlist.collaborative)}`);
      lines.push(`Track count: ${playlist.items?.total ?? "(unknown)"}`);
      lines.push("");
      await spotifyFetch(`/playlists/${playlistId}/items`, accessToken, {
        additional_types: "track",
        limit: 1,
        offset: 0,
        fields: "items(item(id,name)),next,total",
      });
      lines.push(`[OK] /playlists/${playlistId}/items`);
    } catch (errorObj) {
      lines.push("");
      lines.push(`[FAIL ${errorObj?.spotifyStatus || "?"}] ${errorObj?.spotifyUrl || `/playlists/${playlistId}`}`);
      lines.push(`Message: ${errorObj?.message || "Unknown Spotify error"}`);
    }
    setDebug(lines);
  }

  async function fetchPlaylistItems(playlistId, accessToken) {
    const playlist = await spotifyFetch(`/playlists/${playlistId}`, accessToken, {
      fields: "id,name,description,owner(display_name,id),images(url),external_urls.spotify,items(total)",
    });
    const tracks = [];
    let nextUrl = `${SPOTIFY_API}/playlists/${playlistId}/items?limit=100&offset=0&additional_types=track&fields=items(item(id,name,artists(name),album(images,release_date),external_urls.spotify,is_local,type)),next,total`;

    while (nextUrl) {
      const data = await spotifyFetchUrl(nextUrl, accessToken);
      const items = Array.isArray(data.items) ? data.items : [];
      items.forEach((item) => {
        const track = item?.item || item?.track;
        if (!track || track.is_local || track.type !== "track" || !track.id) return;
        tracks.push({
          id: track.id,
          seed: tracks.length + 1,
          playlistOrder: tracks.length,
          name: track.name || "Untitled track",
          artists: Array.isArray(track.artists) ? track.artists.map((artist) => artist?.name).filter(Boolean) : [],
          image: track.album?.images?.[0]?.url || "",
          year: String(track.album?.release_date || "").slice(0, 4) || "Unknown year",
          spotifyUrl: track.external_urls?.spotify || "",
        });
      });
      nextUrl = data.next || null;
    }
    return { playlist, tracks };
  }

  function powerOfTwoAtOrBelow(value) {
    let size = 1;
    while (size * 2 <= value) size *= 2;
    return size;
  }

  function buildSeedOrder(size) {
    if (size <= 1) return [1];
    let order = [1, 2];
    let current = 2;
    while (current < size) {
      const nextSize = current * 2;
      const nextOrder = [];
      order.forEach((seed) => {
        nextOrder.push(seed);
        nextOrder.push(nextSize + 1 - seed);
      });
      order = nextOrder;
      current = nextSize;
    }
    return order;
  }

  function roundLabelForSize(size) {
    if (size <= 1) return "Champion";
    if (size === 2) return "Final";
    return `Round of ${size}`;
  }

  function buildTournamentRounds(entries) {
    const total = entries.length;
    const mainDrawSize = powerOfTwoAtOrBelow(total);
    const overflow = total - mainDrawSize;
    const rounds = [];
    const seedRefs = new Map();

    if (overflow > 0) {
      const autoCount = total - overflow * 2;
      const prelimMatches = [];
      for (let index = 0; index < overflow; index += 1) {
        const higherSeed = entries[autoCount + index];
        const lowerSeed = entries[total - 1 - index];
        prelimMatches.push({
          sides: [
            { type: "entrant", entry: higherSeed },
            { type: "entrant", entry: lowerSeed },
          ],
        });
        seedRefs.set(higherSeed.seed, { type: "winner", roundIndex: 0, matchIndex: index });
      }
      for (let index = 0; index < autoCount; index += 1) {
        seedRefs.set(entries[index].seed, { type: "entrant", entry: entries[index] });
      }
      rounds.push({
        id: "preliminary-round",
        label: "Preliminary Round",
        description: `Play ${overflow} elimination matchup${overflow === 1 ? "" : "s"} to trim this field into the ${roundLabelForSize(mainDrawSize).toLowerCase()}.`,
        matches: prelimMatches,
      });
    } else {
      entries.forEach((entry) => {
        seedRefs.set(entry.seed, { type: "entrant", entry });
      });
    }

    const firstRoundMatches = [];
    const seedOrder = buildSeedOrder(mainDrawSize);
    for (let index = 0; index < seedOrder.length; index += 2) {
      firstRoundMatches.push({
        sides: [
          seedRefs.get(seedOrder[index]) || null,
          seedRefs.get(seedOrder[index + 1]) || null,
        ],
      });
    }

    rounds.push({
      id: `round-${mainDrawSize}`,
      label: roundLabelForSize(mainDrawSize),
      description: `The main draw starts here with ${mainDrawSize} total slots.`,
      matches: firstRoundMatches,
    });

    while (rounds[rounds.length - 1].matches.length > 1) {
      const previousRoundIndex = rounds.length - 1;
      const previousRound = rounds[previousRoundIndex];
      const size = previousRound.matches.length;
      const matches = [];
      for (let index = 0; index < previousRound.matches.length; index += 2) {
        matches.push({
          sides: [
            { type: "winner", roundIndex: previousRoundIndex, matchIndex: index },
            { type: "winner", roundIndex: previousRoundIndex, matchIndex: index + 1 },
          ],
        });
      }
      rounds.push({
        id: `round-${size}`,
        label: roundLabelForSize(size),
        description: size === 2 ? "One final decision crowns the champion." : `Winners move forward into the ${roundLabelForSize(size).toLowerCase()}.`,
        matches,
      });
    }

    return { rounds, mainDrawSize };
  }

  function getRoundKey(roundIndex, matchIndex) {
    return `${roundIndex}:${matchIndex}`;
  }

  function getRoundByIndex(roundIndex) {
    return state.rounds[roundIndex] || null;
  }

  function resolveReference(reference) {
    if (!reference) return null;
    if (reference.type === "entrant") return reference.entry || null;
    if (reference.type === "winner") return getMatchWinner(reference.roundIndex, reference.matchIndex);
    return null;
  }

  function getMatchWinner(roundIndex, matchIndex) {
    const round = getRoundByIndex(roundIndex);
    const match = round?.matches?.[matchIndex];
    if (!match) return null;
    const leftRef = match.sides?.[0] || null;
    const rightRef = match.sides?.[1] || null;
    const left = resolveReference(leftRef);
    const right = resolveReference(rightRef);
    if (leftRef && !rightRef && left) return left;
    if (rightRef && !leftRef && right) return right;
    const pick = state.picks[getRoundKey(roundIndex, matchIndex)];
    if (pick === "left") return left || null;
    if (pick === "right") return right || null;
    return null;
  }

  function getMatchCompetitor(roundIndex, matchIndex, sideIndex) {
    const round = getRoundByIndex(roundIndex);
    const match = round?.matches?.[matchIndex];
    if (!match) return null;
    return resolveReference(match.sides?.[sideIndex] || null);
  }

  function clearLaterRounds(startRound) {
    Object.keys(state.picks).forEach((key) => {
      const roundIndex = Number(String(key).split(":")[0]);
      if (roundIndex >= startRound) delete state.picks[key];
    });
  }

  function getRoundInfo(roundIndex) {
    const round = getRoundByIndex(roundIndex);
    if (!round) return null;
    const ready = roundIndex === 0 || isRoundComplete(roundIndex - 1);
    const matchInfos = round.matches.map((_, matchIndex) => {
      const left = getMatchCompetitor(roundIndex, matchIndex, 0);
      const right = getMatchCompetitor(roundIndex, matchIndex, 1);
      const pick = state.picks[getRoundKey(roundIndex, matchIndex)] || "";
      const winner = getMatchWinner(roundIndex, matchIndex);
      const requiresVote = !!(left && right);
      const autoAdvance = !!((left && !right) || (right && !left));
      return { matchIndex, left, right, pick, winner, requiresVote, autoAdvance };
    });
    const selectionMatchIndexes = matchInfos.filter((info) => info.requiresVote).map((info) => info.matchIndex);
    const completedSelections = matchInfos.filter((info) => info.requiresVote && info.winner).length;
    const selectionTotal = selectionMatchIndexes.length;
    const completed = ready && completedSelections === selectionTotal;
    return { round, roundIndex, ready, completed, matchInfos, selectionMatchIndexes, completedSelections, selectionTotal };
  }

  function isRoundComplete(roundIndex) {
    const info = getRoundInfo(roundIndex);
    return !!info && info.completed;
  }

  function getFinalWinner() {
    if (!state.rounds.length) return null;
    return getMatchWinner(state.rounds.length - 1, 0);
  }

  function formatRoundSummary(info) {
    if (!info.ready) return "Complete the previous round to unlock this one.";
    if (!info.selectionTotal) return "No manual picks are needed here.";
    return `${info.completedSelections}/${info.selectionTotal} picks locked in.`;
  }

  async function persistTournamentPicks(previousPicks) {
    if (!state.activeTournament?.id) return;
    const snapshot = JSON.parse(JSON.stringify(state.picks || {}));
    try {
      const result = await callRpc("set_music_tournament_picks", {
        target_tournament_id: state.activeTournament.id,
        next_picks: snapshot,
      });
      if (result !== true) throw new Error("This account cannot update picks for this tournament.");
      if (state.activeTournament) state.activeTournament.picks = snapshot;
      setDetailNotice("Picks saved.", true);
    } catch (errorObj) {
      state.picks = previousPicks || {};
      if (state.activeTournament) state.activeTournament.picks = state.picks;
      renderApp();
      setDetailNotice(errorObj.message || "Could not save tournament picks.", true);
    }
  }

  function setMatchWinner(roundIndex, matchIndex, side) {
    if (!state.activeTournament?.canVote) {
      setDetailNotice("You need access to this tournament through a paiden.com account before you can vote.", true);
      return;
    }
    const previousPicks = JSON.parse(JSON.stringify(state.picks || {}));
    state.picks[getRoundKey(roundIndex, matchIndex)] = side;
    clearLaterRounds(roundIndex + 1);
    if (state.activeTournament) {
      state.activeTournament.picks = state.picks;
      state.activeTournament.updatedAt = new Date().toISOString();
    }
    renderApp();
    persistTournamentPicks(previousPicks);
    if (state.activeRoundIndex === roundIndex) advanceActiveSelection();
  }

  function getCurrentModalContext() {
    if (state.activeRoundIndex === null || state.activeRoundIndex === undefined) return null;
    const info = getRoundInfo(state.activeRoundIndex);
    if (!info) return null;
    const selectionTotal = info.selectionMatchIndexes.length;
    const safeCursor = Math.min(Math.max(state.activeSelectionCursor, 0), Math.max(selectionTotal - 1, 0));
    state.activeSelectionCursor = safeCursor;
    const matchIndex = info.selectionMatchIndexes[safeCursor] ?? null;
    const match = matchIndex === null ? null : info.matchInfos.find((entry) => entry.matchIndex === matchIndex) || null;
    return { info, selectionTotal, matchIndex, match };
  }

  function renderChampion() {
    if (!championChip) return;
    const champion = getFinalWinner();
    const label = champion ? `${champion.name} - ${champion.artists.join(", ")}` : "No winner selected yet";
    championChip.innerHTML = `<span>Champion</span><strong>${escapeHtml(label)}</strong>`;
  }

  function renderRoundStage() {
    if (!roundStage) return;
    if (!state.rounds.length) {
      roundStage.innerHTML = `<div class="empty-state">No bracket is loaded yet.</div>`;
      return;
    }
    roundStage.innerHTML = state.rounds.map((round, roundIndex) => {
      const info = getRoundInfo(roundIndex);
      const statusLabel = !info.ready ? "Locked" : info.completed ? "Complete" : info.selectionTotal ? "Ready" : "Auto";
      const statusClass = !info.ready ? "" : info.completed ? " complete" : " ready";
      const helper = info.selectionTotal ? `${info.selectionTotal} selections to make.` : "This round only contains automatic advancers.";
      return `
        <section class="round-card">
          <div class="round-card-head">
            <div>
              <h3 class="round-card-title">${escapeHtml(round.label)}</h3>
              <p class="round-card-copy">${escapeHtml(round.description)}</p>
            </div>
            <div class="round-card-status${statusClass}">${escapeHtml(statusLabel)}</div>
          </div>
          <div class="round-card-meta">
            <div class="round-chip">${escapeHtml(formatRoundSummary(info))}</div>
            <div class="round-chip">${escapeHtml(helper)}</div>
          </div>
          <div class="round-actions">
            <button class="btn round-open-btn" type="button" data-open-round="${roundIndex}" ${info.ready ? "" : "disabled"}>Open ${escapeHtml(round.label)}</button>
          </div>
        </section>
      `;
    }).join("");
  }

  function renderVoteChoice(entry, selected, side) {
    if (!entry) return `<div class="empty-state">No competitor is available in this slot.</div>`;
    const hotkey = side === "left" ? "1 / A / Left" : "2 / D / Right";
    const canVote = !!state.activeTournament?.canVote;
    const previewMarkup = entry.spotifyUrl
      ? `
        <div class="vote-preview">
          <div class="vote-preview-label">Full Song</div>
          <a class="vote-preview-link" href="${entry.spotifyUrl}" target="_blank" rel="noopener">
            <i class="fab fa-spotify" aria-hidden="true"></i>
            <span>Listen on Spotify</span>
          </a>
        </div>
      `
      : `
        <div class="vote-preview">
          <div class="vote-preview-label">Full Song</div>
          <div class="vote-preview-note">Spotify did not provide a direct track link for this song.</div>
        </div>
      `;
    return `
      <article class="vote-choice${selected ? " selected" : ""}${canVote ? "" : " disabled"}">
        <button class="vote-choice-select" type="button" data-vote-side="${side}" ${canVote ? "" : "disabled"}>
          <span class="vote-hotkey">${hotkey}</span>
          <div class="vote-choice-body">
            ${entry.image ? `<img class="vote-cover" src="${entry.image}" alt="">` : `<div class="vote-cover" aria-hidden="true"></div>`}
            <div class="vote-copy">
              <h4 class="vote-title">${escapeHtml(entry.name)}</h4>
              <p class="vote-artist">${escapeHtml(entry.artists.join(", "))}</p>
              <div class="vote-meta">
                <span>${escapeHtml(entry.year)}</span>
                <span>Seed ${entry.seed}</span>
              </div>
            </div>
          </div>
        </button>
        ${previewMarkup}
      </article>
    `;
  }

  function renderVoteModal() {
    if (!voteModal || !voteModalKicker || !voteModalTitle || !voteModalSubtitle || !voteProgressText || !voteCompleteNote || !voteMatchup || !votePrevBtn || !voteNextBtn) return;
    const context = getCurrentModalContext();
    const isOpen = !!context;
    voteModal.classList.toggle("open", isOpen);
    voteModal.setAttribute("aria-hidden", isOpen ? "false" : "true");
    if (!context) return;

    const { info, selectionTotal, match } = context;
    voteModalKicker.textContent = info.round.label.toUpperCase();
    voteModalTitle.textContent = info.round.label.startsWith("Round") ? `The ${info.round.label}` : info.round.label;
    const accessSentence = state.activeTournament?.canVote
      ? (info.selectionTotal ? `${info.selectionTotal} selections need to be made in this round.` : "No manual selections remain in this round.")
      : "You can view this round, but only eligible paiden.com accounts can submit picks here.";
    voteModalSubtitle.textContent = `${info.round.description} ${accessSentence}`;
    voteProgressText.textContent = `Selection ${Math.min(state.activeSelectionCursor + 1, Math.max(selectionTotal, 1))} / ${Math.max(selectionTotal, 1)}`;
    voteCompleteNote.hidden = !info.completed;

    if (!match) {
      voteMatchup.innerHTML = `<div class="empty-state">No manual matchups are left in this round.</div>`;
      votePrevBtn.disabled = true;
      voteNextBtn.disabled = true;
      return;
    }

    voteMatchup.innerHTML = `${renderVoteChoice(match.left, match.pick === "left", "left")}${renderVoteChoice(match.right, match.pick === "right", "right")}`;
    votePrevBtn.disabled = state.activeSelectionCursor <= 0;
    voteNextBtn.disabled = state.activeSelectionCursor >= selectionTotal - 1;
  }

  async function loadAccessibleTournaments() {
    const data = await callRpc("get_accessible_music_tournaments");
    state.library = (Array.isArray(data) ? data : []).map(normalizeLibraryEntry).filter(Boolean);
  }

  async function loadTournamentDetailBySlug(slug) {
    const data = await callRpc("get_music_tournament_detail_by_slug", { target_slug: slug });
    const row = Array.isArray(data) ? data[0] : null;
    const record = normalizeTournamentDetail(row);
    applyTournamentRecord(record);
    return record;
  }

  function renderSavedTournamentCard(record) {
    if (!savedTournamentCard || !savedTournamentTitle || !savedTournamentCopy || !savedTournamentOpenLink) return;
    if (!record) {
      savedTournamentCard.hidden = true;
      return;
    }
    savedTournamentTitle.textContent = `${record.name} saved`;
    savedTournamentCopy.textContent = `${record.visibility === "public" ? "Public" : "Private"} bracket saved for ${record.playlist.name}. Open it to manage invites or start voting.`;
    savedTournamentOpenLink.href = `/all-tournaments/${encodeURIComponent(record.slug)}`;
    savedTournamentCard.hidden = false;
  }

  function renderTournamentLibrary() {
    if (!tournamentLibraryList) return;
    const tournaments = [...state.library].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    if (libraryCount) {
      libraryCount.textContent = tournaments.length ? `${tournaments.length} saved tournament${tournaments.length === 1 ? "" : "s"}` : "No saved tournaments yet";
    }
    if (!tournaments.length) {
      tournamentLibraryList.innerHTML = `
        <div class="empty-state">
          No accessible tournaments are saved yet. Build one from <a href="/bracket-builder/">Bracket Builder</a> or sign in to see your private/member brackets.
        </div>
      `;
      return;
    }

    tournamentLibraryList.innerHTML = tournaments.map((entry) => {
      const href = `/all-tournaments/${encodeURIComponent(entry.slug)}`;
      const ownership = entry.isOwner ? "You own this bracket" : entry.isMember ? "You can participate" : `Owner: ${entry.ownerUsername || "paiden.com user"}`;
      return `
        <a class="tournament-list-card" href="${href}">
          ${entry.cover ? `<img class="tournament-list-cover" src="${entry.cover}" alt="">` : `<div class="tournament-list-cover" aria-hidden="true"></div>`}
          <div class="tournament-list-copy">
            <h2>${escapeHtml(entry.name)}</h2>
            <p>${escapeHtml(entry.playlistName)}</p>
            <div class="tournament-list-meta">
              <span class="meta-chip ${entry.visibility}">${escapeHtml(entry.visibility)}</span>
              <span class="meta-chip">${entry.entrantCount} songs</span>
              <span class="meta-chip">${entry.participantCount} participants</span>
              ${entry.updatedAt ? `<span class="meta-chip">Updated ${escapeHtml(formatDate(entry.updatedAt))}</span>` : ""}
            </div>
            <p>${escapeHtml(ownership)}</p>
          </div>
          <span class="tournament-list-arrow"><i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
        </a>
      `;
    }).join("");
  }

  function renderParticipants(record) {
    if (!participantsList || !participantSummaryText || !inviteLinkOutput) return;
    const participants = Array.isArray(record?.participants) ? record.participants : [];
    participantSummaryText.textContent = participants.length
      ? `${participants.length} paiden.com participant${participants.length === 1 ? "" : "s"} currently have access to this bracket.`
      : "No participants are linked to this bracket yet.";
    participantsList.innerHTML = participants.length
      ? participants.map((person) => `
          <span class="participant-pill">
            ${person.avatar_url ? `<img src="${person.avatar_url}" alt="">` : ""}
            <span>${escapeHtml(person.username || "user")}${person.role === "owner" ? " (owner)" : ""}</span>
          </span>
        `).join("")
      : `<div class="empty-state">No participants are linked to this tournament yet.</div>`;

    const ownerToolsBlock = friendInviteInput?.closest(".owner-panel-block");
    const canManageInvites = !!(record?.isOwner && record.visibility === "private");
    if (ownerToolsBlock) ownerToolsBlock.hidden = !canManageInvites;
    inviteLinkOutput.textContent = canManageInvites
      ? "Generate a private invite link here."
      : record?.visibility === "public"
        ? "This bracket is public, so invite links are not needed."
        : "Only the bracket owner can generate invite links.";
  }

  function renderFriendSuggestions() {
    if (!friendInviteSuggestions) return;
    friendInviteSuggestions.innerHTML = state.friends.map((friend) => `<option value="${escapeHtml(friend.username || "")}"></option>`).join("");
  }

  function renderDetailHeader(record) {
    if (!detailHeroTitle || !detailHeroMeta || !detailHeroSubnote || !detailHeroCover || !detailEmptyState || !detailVisibilityChip || !detailPlaylistChip) return;
    if (!record) {
      detailHeroTitle.textContent = "Tournament Not Found";
      detailHeroMeta.textContent = "This tournament is not available to this account.";
      detailHeroSubnote.textContent = "If this bracket is private, you need access before the detail page can load.";
      detailVisibilityChip.textContent = "Unavailable";
      detailPlaylistChip.textContent = "Playlist";
      detailHeroCover.hidden = true;
      detailEmptyState.hidden = false;
      roundStage?.setAttribute("hidden", "hidden");
      championChip?.setAttribute("hidden", "hidden");
      return;
    }
    detailHeroTitle.textContent = record.name || "Saved Tournament";
    detailHeroMeta.textContent = `${record.ownerUsername ? `Hosted by @${record.ownerUsername}` : "Hosted on paiden.com"}${record.entrants?.length ? ` - ${record.entrants.length} songs` : ""}`;
    detailHeroSubnote.textContent = record.canVote
      ? "Open a round to vote matchup by matchup. Every pick here updates the saved tournament page immediately."
      : record.visibility === "public"
        ? "You can view this public bracket here. Sign in to paiden.com if you want to vote on it."
        : "This private bracket is only voteable by the owner and invited participants.";
    detailVisibilityChip.textContent = record.visibility;
    detailVisibilityChip.className = `meta-chip ${record.visibility}`;
    detailPlaylistChip.textContent = record.playlist?.name || "Playlist";
    if (record.playlist?.images?.[0]?.url) {
      detailHeroCover.src = record.playlist.images[0].url;
      detailHeroCover.hidden = false;
    } else {
      detailHeroCover.hidden = true;
    }
    detailEmptyState.hidden = true;
    roundStage?.removeAttribute("hidden");
    championChip?.removeAttribute("hidden");
  }

  function renderEmptyDetailForInvite() {
    if (!detailEmptyState || !detailEmptyStateText) return;
    detailEmptyState.hidden = false;
    detailEmptyStateText.innerHTML = `This invite link needs a paiden.com account before it can join the bracket. <a href="/signin">Sign in</a> or <a href="/create-account">create an account</a>, then reopen this link.`;
    roundStage?.setAttribute("hidden", "hidden");
    championChip?.setAttribute("hidden", "hidden");
  }

  function renderApp() {
    if (pageMode === "library") {
      renderTournamentLibrary();
      return;
    }
    if (pageMode === "detail") {
      renderDetailHeader(state.activeTournament);
      renderParticipants(state.activeTournament);
      renderChampion();
      renderRoundStage();
      renderVoteModal();
      return;
    }
    renderChampion();
    renderRoundStage();
    renderVoteModal();
  }

  window.onTurnstileTournamentRequest = function onTurnstileTournamentRequest(token) {
    state.tournamentRequestTurnstileToken = String(token || "");
  };

  window.onTurnstileTournamentRequestExpired = function onTurnstileTournamentRequestExpired() {
    state.tournamentRequestTurnstileToken = "";
  };

  function openRoundModal(roundIndex) {
    const info = getRoundInfo(roundIndex);
    if (!info || !info.ready) return;
    state.activeRoundIndex = roundIndex;
    const firstIncomplete = info.selectionMatchIndexes.findIndex((matchIndex) => {
      const match = info.matchInfos.find((entry) => entry.matchIndex === matchIndex);
      return match && !match.winner;
    });
    state.activeSelectionCursor = firstIncomplete >= 0 ? firstIncomplete : 0;
    renderVoteModal();
  }

  function closeVoteModal() {
    state.activeRoundIndex = null;
    state.activeSelectionCursor = 0;
    renderVoteModal();
  }

  function advanceActiveSelection(step = 1) {
    const context = getCurrentModalContext();
    if (!context) return;
    const next = Math.min(Math.max(state.activeSelectionCursor + step, 0), Math.max(context.selectionTotal - 1, 0));
    state.activeSelectionCursor = next;
    renderVoteModal();
  }

  function getDetailSlug() {
    const url = new URL(window.location.href);
    const querySlug = url.searchParams.get("slug");
    if (querySlug) return decodeURIComponent(querySlug);
    const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
    if (parts[0] === "all-tournaments" && parts[1] && parts[1] !== "view") {
      return decodeURIComponent(parts[1]);
    }
    return "";
  }

  function getInviteCode() {
    const url = new URL(window.location.href);
    return String(url.searchParams.get("invite") || "").trim();
  }

  async function acceptInviteIfPresent() {
    const inviteCode = getInviteCode();
    if (!inviteCode) return false;
    if (!state.paidenUser) {
      renderEmptyDetailForInvite();
      setDetailNotice("Sign in or create a paiden.com account, then reopen this invite link to join the private bracket.", true);
      return false;
    }
    const accepted = await callRpc("accept_music_tournament_invite", { invite_code: inviteCode });
    const row = Array.isArray(accepted) ? accepted[0] : null;
    if (row?.tournament_slug) {
      const url = new URL(window.location.href);
      url.searchParams.delete("invite");
      history.replaceState({}, "", url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ""));
      setDetailNotice(`Invite accepted. You can now participate in ${row.bracket_name || "this bracket"}.`, true);
      return true;
    }
    return false;
  }

  async function loadFriendsForOwner() {
    if (!state.activeTournament?.isOwner || state.activeTournament.visibility !== "private") {
      state.friends = [];
      renderFriendSuggestions();
      return;
    }
    try {
      const data = await callRpc("get_my_friends");
      state.friends = Array.isArray(data) ? data : [];
      renderFriendSuggestions();
    } catch (_) {
      state.friends = [];
      renderFriendSuggestions();
    }
  }

  async function buildBracketFromPlaylist() {
    if (!isCustomSpotifyMode()) {
      setStatus("Choose the self-serve Spotify path before trying to save a bracket yourself.", "error");
      return;
    }
    const bracketName = String(bracketNameInput?.value || "").trim();
    if (!bracketName) {
      setStatus("Give the bracket a name before saving it.", "error");
      bracketNameInput?.focus();
      return;
    }
    if (!state.paidenUser || !state.paidenProfile) {
      setStatus("Sign in to paiden.com before saving a bracket. This feature now links brackets to user accounts.", "error");
      return;
    }
    const playlistId = parsePlaylistId(playlistInput?.value);
    if (!playlistId) {
      setStatus("Paste a valid Spotify playlist URL, URI, or 22-character playlist ID.", "error");
      playlistInput?.focus();
      setDebug("No diagnostics yet. Paste a valid Spotify playlist URL, URI, or 22-character playlist ID first.");
      return;
    }

    if (buildBracketBtn) {
      buildBracketBtn.disabled = true;
      buildBracketBtn.innerHTML = "Saving...";
    }

    try {
      let accessToken;
      try {
        accessToken = await getValidAccessToken();
      } catch (errorObj) {
        setStatus(errorObj.message || "Connect Spotify first.", "error");
        setDebug(`Spotify auth is not ready.\nMessage: ${errorObj.message || "Connect Spotify first."}`);
        return;
      }
      setStatus("Loading playlist from Spotify...");
      await runPlaylistDiagnostics(playlistId, accessToken);
      const { playlist, tracks } = await fetchPlaylistItems(playlistId, accessToken);
      if (tracks.length < 2) throw new Error("This playlist does not have enough Spotify tracks to build a tournament.");
      const { rounds, mainDrawSize } = buildTournamentRounds(tracks);
      const saveResult = await callRpc("upsert_my_music_tournament", {
        target_tournament_id: null,
        target_name: bracketName,
        target_visibility: String(tournamentVisibilitySelect?.value || "private"),
        target_playlist_id: playlist.id,
        target_playlist_name: playlist.name,
        target_playlist_cover_url: playlist.images?.[0]?.url || null,
        target_spotify_playlist_url: playlist.external_urls?.spotify || null,
        target_playlist_owner_name: playlist.owner?.display_name || playlist.owner?.id || null,
        target_entrants: tracks,
        target_rounds: rounds,
        target_picks: {},
        target_main_draw_size: mainDrawSize,
      });
      const saveRow = Array.isArray(saveResult) ? saveResult[0] : null;
      if (!saveRow?.tournament_slug) throw new Error("The tournament saved, but the site did not receive the saved bracket URL.");
      const detail = await loadTournamentDetailBySlug(saveRow.tournament_slug);
      await loadAccessibleTournaments();
      renderSavedTournamentCard(detail);
      const prelimRound = rounds.find((round) => round.id === "preliminary-round");
      const successText = prelimRound
        ? `${detail.name} saved. All ${tracks.length} songs are included, starting with ${prelimRound.matches.length} preliminary matchup${prelimRound.matches.length === 1 ? "" : "s"} before the ${roundLabelForSize(mainDrawSize).toLowerCase()}.`
        : `${detail.name} saved. All ${tracks.length} songs land directly in the ${roundLabelForSize(mainDrawSize).toLowerCase()}.`;
      setStatus(successText, "success");
      setDetailNotice("Bracket saved. Open it from the saved card or in All Tournaments.", true);
    } catch (errorObj) {
      clearTournamentState();
      if (errorObj?.spotifyStatus === 401) {
        clearAuth();
        updateSpotifyAuthUi();
        setStatus("Spotify session expired or was rejected. Reconnect Spotify, then try saving the bracket again.", "error");
      } else if (errorObj?.spotifyStatus === 403) {
        setStatus("Spotify denied access to that playlist. Reconnect Spotify and make sure the signed-in Spotify account can open the playlist and its tracks.", "error");
      } else {
        setStatus(errorObj.message || "Could not save the tournament.", "error");
      }
    } finally {
      if (buildBracketBtn) {
        buildBracketBtn.disabled = false;
        buildBracketBtn.innerHTML = `<i class="fa-solid fa-bracket-curly" aria-hidden="true"></i> Save Bracket`;
      }
    }
  }

  function resetBracketBuilder() {
    if (bracketNameInput) bracketNameInput.value = "";
    if (playlistInput) playlistInput.value = "";
    if (tournamentVisibilitySelect) tournamentVisibilitySelect.value = "private";
    if (requestBracketNameInput) requestBracketNameInput.value = "";
    if (requestCollabLinkInput) requestCollabLinkInput.value = "";
    if (requestOtherInfoInput) requestOtherInfoInput.value = "";
    renderSavedTournamentCard(null);
    setStatus("Builder fields cleared.", "success");
    clearTournamentState();
  }

  async function initBuilderOrHub() {
    setBuilderMode("");
    updateSpotifyAuthUi();
    if (debugOutput) {
      setDebug([
        `Spotify App Mode: ${describeClientMode()}`,
        `Redirect URI: ${REDIRECT_URI}`,
        `Scopes requested: ${SCOPES}`,
        "",
        "No diagnostics yet. Choose the self-serve Spotify path, then save a bracket to inspect the playlist access steps.",
      ]);
    }
    state.auth = loadAuth();
    updateSpotifyAuthUi();
    await syncSpotifyAuthState();
    await loadCurrentPaidenProfile();
  }

  async function initLibraryPage() {
    await loadCurrentPaidenProfile();
    await loadAccessibleTournaments();
    setLibraryNotice(
      state.paidenProfile
        ? `Showing public tournaments plus any private brackets you own or were invited into as @${state.paidenProfile.username}.`
        : "Showing public tournaments. Sign in to see your private or invited brackets too.",
      true
    );
    renderTournamentLibrary();
  }

  async function initDetailPage() {
    await loadCurrentPaidenProfile();
    const inviteAccepted = await acceptInviteIfPresent().catch((errorObj) => {
      setDetailNotice(errorObj.message || "Could not accept that invite link.", true);
      return false;
    });
    const slug = getDetailSlug();
    if (!slug) {
      applyTournamentRecord(null);
      renderApp();
      return;
    }
    try {
      await loadTournamentDetailBySlug(slug);
      if (inviteAccepted) setDetailNotice("Invite accepted. This bracket is now linked to your paiden.com account.", true);
      await loadFriendsForOwner();
      renderApp();
    } catch (errorObj) {
      applyTournamentRecord(null);
      renderApp();
      if (getInviteCode() && !state.paidenUser) {
        renderEmptyDetailForInvite();
      } else {
        setDetailNotice(errorObj.message || "Could not load this tournament.", true);
      }
    }
  }

  if (saveClientBtn) {
    saveClientBtn.addEventListener("click", () => {
      if (!isCustomSpotifyMode()) {
        setStatus("Choose the self-serve Spotify path before saving a client ID.", "error");
        return;
      }
      const clientId = String(clientIdInput?.value || "").trim();
      if (!clientId) {
        setStatus("Paste a Spotify Client ID before saving.", "error");
        return;
      }
      saveClientId(clientId);
      setStatus("Spotify Client ID saved locally in this browser.", "success");
    });
  }

  if (requestBracketModeBtn) {
    requestBracketModeBtn.addEventListener("click", () => {
      setBuilderMode("request");
      setStatus("Request mode loaded. Fill out the request form and send the playlist collaboration invite to Paiden.", "success");
    });
  }

  if (customSpotifyModeBtn) {
    customSpotifyModeBtn.addEventListener("click", () => {
      setBuilderMode("custom");
      updateSpotifyAuthUi();
      setStatus("Self-serve Spotify mode loaded. Follow the setup guide, save your Client ID, then connect Spotify.", "success");
      clientIdInput?.focus();
    });
  }

  if (sendPaidenRequestBtn) {
    sendPaidenRequestBtn.addEventListener("click", async () => {
      const requester = String(requestNameInput?.value || "").trim();
      const requestBracketName = String(requestBracketNameInput?.value || "").trim();
      const collabLink = String(requestCollabLinkInput?.value || "").trim();
      const extra = String(requestOtherInfoInput?.value || "").trim();
      if (!requester) {
        setStatus("Add your name or paiden.com account before sending the request.", "error");
        requestNameInput?.focus();
        return;
      }
      if (!requestBracketName) {
        setStatus("Add a tournament name before sending the request.", "error");
        requestBracketNameInput?.focus();
        return;
      }
      if (!collabLink) {
        setStatus("Paste the Spotify collaboration invite link so Paiden can reach the playlist.", "error");
        requestCollabLinkInput?.focus();
        return;
      }
      if (!state.tournamentRequestTurnstileToken) {
        setStatus("Please complete the anti-spam check before sending the request.", "error");
        return;
      }
      const message = [
        `Bracket request from: ${requester}`,
        `Tournament name: ${requestBracketName}`,
        `Spotify collaboration invite link: ${collabLink}`,
        "",
        "Other info:",
        extra || "(none)",
      ].join("\n");
      const payload = {
        name: requester,
        message,
        turnstile_token: state.tournamentRequestTurnstileToken,
      };
      if (state.paidenUser?.email) payload.email = state.paidenUser.email;

      setTournamentRequestSubmitting(true);
      try {
        const resp = await fetch(CONTACT_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) {
          let errJson = null;
          try {
            errJson = await resp.json();
          } catch (_) {
            // Ignore non-JSON error responses.
          }
          setStatus(errJson?.message || errJson?.error || "Could not send request. Please try again.", "error");
          return;
        }
        if (requestBracketNameInput) requestBracketNameInput.value = "";
        if (requestCollabLinkInput) requestCollabLinkInput.value = "";
        if (requestOtherInfoInput) requestOtherInfoInput.value = "";
        state.tournamentRequestTurnstileToken = "";
        if (window.turnstile && window.turnstile.reset) {
          window.turnstile.reset();
        }
        setStatus("Bracket request sent to Paiden.", "success");
      } catch (errorObj) {
        setStatus(errorObj.message || "Could not send request. Please try again.", "error");
      } finally {
        setTournamentRequestSubmitting(false);
      }
    });
  }

  if (connectBtn) {
    connectBtn.addEventListener("click", () => {
      beginSpotifyAuth().catch((errorObj) => {
        setStatus(errorObj.message || "Could not start Spotify sign-in.", "error");
      });
    });
  }

  if (disconnectBtn) {
    disconnectBtn.addEventListener("click", () => {
      clearAuth();
      updateSpotifyAuthUi();
      setStatus("Spotify connection cleared from this device.", "success");
    });
  }

  if (buildBracketBtn) {
    buildBracketBtn.addEventListener("click", () => {
      buildBracketFromPlaylist();
    });
  }

  if (resetBracketBtn) {
    resetBracketBtn.addEventListener("click", () => {
      resetBracketBuilder();
    });
  }

  if (inviteFriendBtn) {
    inviteFriendBtn.addEventListener("click", async () => {
      if (!state.activeTournament?.id) return;
      const username = String(friendInviteInput?.value || "").trim();
      if (!username) {
        setDetailNotice("Type a friend's username first.", true);
        friendInviteInput?.focus();
        return;
      }
      try {
        const result = await callRpc("invite_friend_to_music_tournament", {
          target_tournament_id: state.activeTournament.id,
          target_friend_username: username,
        });
        const row = Array.isArray(result) ? result[0] : null;
        setDetailNotice(row?.participant_username ? `Invited @${row.participant_username} into this private bracket.` : "Friend added to the bracket.", true);
        friendInviteInput.value = "";
        await loadTournamentDetailBySlug(state.activeTournament.slug);
        await loadFriendsForOwner();
        renderApp();
      } catch (errorObj) {
        setDetailNotice(errorObj.message || "Could not invite that friend.", true);
      }
    });
  }

  if (createInviteLinkBtn) {
    createInviteLinkBtn.addEventListener("click", async () => {
      if (!state.activeTournament?.id) return;
      try {
        const result = await callRpc("create_music_tournament_invite", {
          target_tournament_id: state.activeTournament.id,
        });
        const row = Array.isArray(result) ? result[0] : null;
        if (inviteLinkOutput) inviteLinkOutput.textContent = row?.invite_url || "Could not generate the invite URL.";
        setDetailNotice("Invite link created. Share it with someone who should join this private bracket.", true);
      } catch (errorObj) {
        setDetailNotice(errorObj.message || "Could not create an invite link.", true);
      }
    });
  }

  if (roundStage) {
    roundStage.addEventListener("click", (event) => {
      const button = event.target.closest("[data-open-round]");
      if (!button) return;
      const roundIndex = Number(button.getAttribute("data-open-round"));
      if (Number.isFinite(roundIndex)) openRoundModal(roundIndex);
    });
  }

  if (voteMatchup) {
    voteMatchup.addEventListener("click", (event) => {
      const button = event.target.closest("[data-vote-side]");
      if (!button || state.activeRoundIndex === null || !state.activeTournament?.canVote) return;
      const side = String(button.getAttribute("data-vote-side"));
      const context = getCurrentModalContext();
      if (!context || context.matchIndex === null || (side !== "left" && side !== "right")) return;
      setMatchWinner(state.activeRoundIndex, context.matchIndex, side);
    });
  }

  if (votePrevBtn) votePrevBtn.addEventListener("click", () => advanceActiveSelection(-1));
  if (voteNextBtn) voteNextBtn.addEventListener("click", () => advanceActiveSelection(1));
  if (voteModalCloseBtn) voteModalCloseBtn.addEventListener("click", () => closeVoteModal());
  if (voteModal) {
    voteModal.addEventListener("click", (event) => {
      if (event.target === voteModal) closeVoteModal();
    });
  }

  window.addEventListener("pageshow", () => {
    if (pageMode === "hub" || pageMode === "builder") syncSpotifyAuthState().catch(() => {});
  });
  window.addEventListener("focus", () => {
    if (pageMode === "hub" || pageMode === "builder") syncSpotifyAuthState().catch(() => {});
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && (pageMode === "hub" || pageMode === "builder")) syncSpotifyAuthState().catch(() => {});
  });

  document.addEventListener("keydown", (event) => {
    if (!voteModal || !voteModal.classList.contains("open")) return;
    const activeTag = document.activeElement?.tagName || "";
    if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeVoteModal();
      return;
    }
    if (!state.activeTournament?.canVote) return;
    const context = getCurrentModalContext();
    if (!context || context.matchIndex === null) return;
    const key = event.key.toLowerCase();
    if (key === "1" || key === "a" || event.key === "ArrowLeft") {
      event.preventDefault();
      setMatchWinner(state.activeRoundIndex, context.matchIndex, "left");
      return;
    }
    if (key === "2" || key === "d" || event.key === "ArrowRight") {
      event.preventDefault();
      setMatchWinner(state.activeRoundIndex, context.matchIndex, "right");
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      advanceActiveSelection(1);
    }
  });

  (async () => {
    if (pageMode === "library") {
      await initLibraryPage();
      return;
    }
    if (pageMode === "detail") {
      await initDetailPage();
      return;
    }
    if (pageMode === "hub" || pageMode === "builder") {
      await initBuilderOrHub();
    }
  })().catch((errorObj) => {
    setStatus(errorObj.message || "Could not initialize tournaments.", "error");
    setDetailNotice(errorObj.message || "Could not initialize tournaments.", !!detailNoticeCard);
    setLibraryNotice(errorObj.message || "Could not initialize tournaments.", !!libraryNoticeCard);
  });
})();
