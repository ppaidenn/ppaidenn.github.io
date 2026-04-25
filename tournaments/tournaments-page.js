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
    bracketPairStartIndex: 0,
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
  const rankingSummaryText = document.getElementById("rankingSummaryText");
  const rankingList = document.getElementById("rankingList");
  const resultsShell = document.getElementById("resultsShell");
  const bracketViewLink = document.getElementById("bracketViewLink");
  const rankingBackLink = document.getElementById("rankingBackLink");
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
  const voteNextRoundBtn = document.getElementById("voteNextRoundBtn");
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
    const ballots = Array.isArray(row.ballots) ? row.ballots.map((ballot) => ({
      userId: ballot?.user_id || "",
      username: ballot?.username || "",
      avatarUrl: ballot?.avatar_url || "",
      role: ballot?.role || "participant",
      picks: ballot?.picks && typeof ballot.picks === "object" ? ballot.picks : {},
    })) : [];
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
      myPicks: row.my_picks && typeof row.my_picks === "object" ? row.my_picks : {},
      ballots,
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
    state.picks = record?.myPicks || {};
    state.activeRoundIndex = null;
    state.activeSelectionCursor = 0;
    state.bracketPairStartIndex = 0;
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

  function getPrimaryVotingContext() {
    for (let roundIndex = 0; roundIndex < state.rounds.length; roundIndex += 1) {
      const info = getRoundInfo(roundIndex);
      if (!info?.ready) break;
      if (!info.selectionTotal) continue;
      if (!info.completed) {
        const firstOpenIndex = info.selectionMatchIndexes.findIndex((matchIndex) => {
          const match = info.matchInfos.find((entry) => entry.matchIndex === matchIndex);
          return match && !match.winner;
        });
        return {
          info,
          pickNumber: Math.max(firstOpenIndex + 1, 1),
          isComplete: false,
        };
      }
    }

    for (let roundIndex = state.rounds.length - 1; roundIndex >= 0; roundIndex -= 1) {
      const info = getRoundInfo(roundIndex);
      if (info?.ready && info.selectionTotal) {
        return {
          info,
          pickNumber: Math.max(info.selectionTotal, 1),
          isComplete: true,
        };
      }
    }

    return null;
  }

  function resolveReferenceForBallot(reference, rounds, picks, cache) {
    if (!reference) return null;
    if (reference.type === "entrant") return reference.entry || null;
    if (reference.type === "winner") return getMatchWinnerForBallot(rounds, picks, reference.roundIndex, reference.matchIndex, cache);
    return null;
  }

  function getMatchWinnerForBallot(rounds, picks, roundIndex, matchIndex, cache = new Map()) {
    const cacheKey = getRoundKey(roundIndex, matchIndex);
    if (cache.has(cacheKey)) return cache.get(cacheKey);
    const round = rounds?.[roundIndex];
    const match = round?.matches?.[matchIndex];
    if (!match) {
      cache.set(cacheKey, null);
      return null;
    }
    const leftRef = match.sides?.[0] || null;
    const rightRef = match.sides?.[1] || null;
    const left = resolveReferenceForBallot(leftRef, rounds, picks, cache);
    const right = resolveReferenceForBallot(rightRef, rounds, picks, cache);
    let winner = null;
    if (leftRef && !rightRef && left) {
      winner = left;
    } else if (rightRef && !leftRef && right) {
      winner = right;
    } else {
      const pick = picks?.[cacheKey];
      if (pick === "left") winner = left || null;
      if (pick === "right") winner = right || null;
    }
    cache.set(cacheKey, winner);
    return winner;
  }

  function computeBallotPoints(rounds, entrants, picks) {
    const cache = new Map();
    const eliminationRoundById = {};
    const bestRoundReachedById = {};
    const safeRounds = Array.isArray(rounds) ? rounds : [];
    const safeEntrants = Array.isArray(entrants) ? entrants : [];

    safeRounds.forEach((round, roundIndex) => {
      (Array.isArray(round?.matches) ? round.matches : []).forEach((match, matchIndex) => {
        const left = resolveReferenceForBallot(match?.sides?.[0] || null, safeRounds, picks || {}, cache);
        const right = resolveReferenceForBallot(match?.sides?.[1] || null, safeRounds, picks || {}, cache);
        const winner = getMatchWinnerForBallot(safeRounds, picks || {}, roundIndex, matchIndex, cache);
        if (winner?.id) {
          bestRoundReachedById[winner.id] = Math.max(bestRoundReachedById[winner.id] ?? -1, roundIndex);
        }
        if (left && right && winner?.id) {
          const loser = winner.id === left.id ? right : left;
          if (loser?.id && eliminationRoundById[loser.id] === undefined) {
            eliminationRoundById[loser.id] = roundIndex;
          }
        }
      });
    });

    const champion = safeRounds.length ? getMatchWinnerForBallot(safeRounds, picks || {}, safeRounds.length - 1, 0, cache) : null;
    const pointsByEntrantId = {};
    safeEntrants.forEach((entry) => {
      if (!entry?.id) return;
      let points = 0;
      if (champion?.id === entry.id) {
        points = safeRounds.length + 1;
      } else if (eliminationRoundById[entry.id] !== undefined) {
        points = eliminationRoundById[entry.id] + 1;
      } else if ((bestRoundReachedById[entry.id] ?? -1) >= 0) {
        points = bestRoundReachedById[entry.id] + 1;
      }
      pointsByEntrantId[entry.id] = points;
    });

    return {
      pointsByEntrantId,
      championId: champion?.id || "",
    };
  }

  function getRankingBreakdown(record) {
    const entrants = Array.isArray(record?.entrants) ? record.entrants : [];
    const rounds = Array.isArray(record?.rounds) ? record.rounds : [];
    const ballots = Array.isArray(record?.ballots) ? record.ballots : [];
    const rankingMap = new Map();

    entrants.forEach((entry) => {
      if (!entry?.id) return;
      rankingMap.set(entry.id, {
        entry,
        totalPoints: 0,
        userPoints: [],
        podiumVotes: [],
      });
    });

    ballots.forEach((ballot) => {
      const picks = ballot?.picks && typeof ballot.picks === "object" ? ballot.picks : {};
      const hasSelections = Object.keys(picks).length > 0;
      if (!hasSelections) return;
      const result = computeBallotPoints(rounds, entrants, picks);
      const podiumRanks = new Map(
        entrants
          .filter((entry) => entry?.id)
          .map((entry) => ({
            entry,
            points: Number(result.pointsByEntrantId[entry.id] || 0),
          }))
          .filter((item) => item.points > 0)
          .sort((left, right) => {
            if (right.points !== left.points) return right.points - left.points;
            if ((left.entry?.seed || 0) !== (right.entry?.seed || 0)) return (left.entry?.seed || 0) - (right.entry?.seed || 0);
            return String(left.entry?.name || "").localeCompare(String(right.entry?.name || ""));
          })
          .slice(0, 3)
          .map((item, index) => [item.entry.id, index + 1])
      );
      entrants.forEach((entry) => {
        if (!entry?.id) return;
        const points = Number(result.pointsByEntrantId[entry.id] || 0);
        const ranking = rankingMap.get(entry.id);
        if (!ranking) return;
        ranking.totalPoints += points;
        if (points > 0 || result.championId === entry.id) {
          const voteRecord = {
            userId: ballot.userId,
            username: ballot.username || "user",
            avatarUrl: ballot.avatarUrl || "",
            role: ballot.role || "participant",
            points,
            champion: result.championId === entry.id,
            podiumRank: podiumRanks.get(entry.id) || null,
          };
          ranking.userPoints.push(voteRecord);
          if (voteRecord.podiumRank) ranking.podiumVotes.push(voteRecord);
        }
      });
    });

    const rankings = Array.from(rankingMap.values()).sort((left, right) => {
      if (right.totalPoints !== left.totalPoints) return right.totalPoints - left.totalPoints;
      if ((right.entry?.seed || 0) !== (left.entry?.seed || 0)) return (left.entry?.seed || 0) - (right.entry?.seed || 0);
      return String(left.entry?.name || "").localeCompare(String(right.entry?.name || ""));
    });

    return {
      rankings,
      ballotCount: ballots.filter((ballot) => Object.keys(ballot?.picks || {}).length > 0).length,
      rounds,
    };
  }

  function describePointWeights(rounds) {
    const safeRounds = Array.isArray(rounds) ? rounds : [];
    const roundWeights = safeRounds.map((round, roundIndex) => `${round.label} ${roundIndex + 1}`);
    roundWeights.push(`Champion ${safeRounds.length + 1}`);
    return roundWeights.join(" • ");
  }

  function getPodiumTone(rank) {
    if (rank === 1) return "gold";
    if (rank === 2) return "silver";
    return "bronze";
  }

  function getPodiumLabel(rank) {
    if (rank === 1) return "top song";
    if (rank === 2) return "second song";
    return "third song";
  }

  function getProfileInitial(username) {
    const cleaned = String(username || "user").replace(/^@+/, "").trim();
    return cleaned ? cleaned.slice(0, 1).toUpperCase() : "?";
  }

  function renderVoterPodiumBadge(vote) {
    const rank = Number(vote?.podiumRank || 0);
    if (!rank) return "";
    const tone = getPodiumTone(rank);
    const username = vote?.username || "user";
    const label = `${username}'s ${getPodiumLabel(rank)}`;
    return `
      <span class="voter-podium-badge ${tone}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">
        <i class="fa-solid fa-star" aria-hidden="true"></i>
        ${vote?.avatarUrl ? `<img src="${escapeHtml(vote.avatarUrl)}" alt="">` : `<span class="voter-podium-initial">${escapeHtml(getProfileInitial(username))}</span>`}
      </span>
    `;
  }

  function renderPodiumBadgeCluster(votes) {
    const sortedVotes = [...(Array.isArray(votes) ? votes : [])].sort((left, right) => {
      if ((left.podiumRank || 0) !== (right.podiumRank || 0)) return (left.podiumRank || 0) - (right.podiumRank || 0);
      return String(left.username || "").localeCompare(String(right.username || ""));
    });
    if (!sortedVotes.length) return "";
    return `<span class="podium-badge-cluster">${sortedVotes.map(renderVoterPodiumBadge).join("")}</span>`;
  }

  function updateLocalBallot(snapshot) {
    if (!state.activeTournament) return;
    state.activeTournament.myPicks = snapshot;
    const ballots = Array.isArray(state.activeTournament.ballots) ? [...state.activeTournament.ballots] : [];
    const userId = state.paidenUser?.id || "";
    const hasSelections = Object.keys(snapshot || {}).length > 0;
    const existingIndex = ballots.findIndex((ballot) => ballot.userId === userId);

    if (!userId) return;

    if (!hasSelections && existingIndex >= 0) {
      ballots.splice(existingIndex, 1);
    } else if (hasSelections) {
      const nextBallot = {
        userId,
        username: state.paidenProfile?.username || state.activeTournament.ownerUsername || "user",
        avatarUrl: state.paidenProfile?.avatar_url || "",
        role: state.activeTournament.ownerId === userId ? "owner" : "participant",
        picks: snapshot,
      };
      if (existingIndex >= 0) {
        ballots[existingIndex] = nextBallot;
      } else {
        ballots.push(nextBallot);
      }
    }

    state.activeTournament.ballots = ballots;
  }

  async function persistTournamentPicks(previousPicks) {
    if (!state.activeTournament?.id) return;
    const snapshot = JSON.parse(JSON.stringify(state.picks || {}));
    try {
      const result = await callRpc("set_my_music_tournament_ballot", {
        target_tournament_id: state.activeTournament.id,
        next_picks: snapshot,
      });
      if (result !== true) throw new Error("This account cannot update picks for this tournament.");
      updateLocalBallot(snapshot);
      renderApp();
      setDetailNotice("Your ballot was saved. The rankings now include your points for this bracket.", true);
    } catch (errorObj) {
      state.picks = previousPicks || {};
      updateLocalBallot(state.picks);
      renderApp();
      setDetailNotice(errorObj.message || "Could not save your ballot.", true);
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
      state.activeTournament.myPicks = state.picks;
      state.activeTournament.updatedAt = new Date().toISOString();
    }
    updateLocalBallot(state.picks);
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

  function getNextReadyRoundIndex(roundIndex) {
    for (let nextIndex = roundIndex + 1; nextIndex < state.rounds.length; nextIndex += 1) {
      const nextInfo = getRoundInfo(nextIndex);
      if (nextInfo?.ready) return nextIndex;
    }
    return null;
  }

  function moveToNextRoundFromModal() {
    const context = getCurrentModalContext();
    if (!context?.info?.completed) return;
    const nextRoundIndex = getNextReadyRoundIndex(context.info.roundIndex);
    if (nextRoundIndex === null) {
      closeVoteModal();
      return;
    }
    openRoundModal(nextRoundIndex);
  }

  function renderChampion() {
    if (!championChip) return;
    const champion = getFinalWinner();
    if (resultsShell) resultsShell.hidden = !champion;
    championChip.hidden = !champion;
    if (!champion) {
      championChip.innerHTML = "";
      return;
    }
    const artists = Array.isArray(champion.artists) ? champion.artists.join(", ") : "";
    championChip.innerHTML = `
      ${champion.image ? `<img class="champion-cover" src="${escapeHtml(champion.image)}" alt="">` : `<div class="champion-cover" aria-hidden="true"></div>`}
      <div class="champion-copy">
        <span>Champion</span>
        <strong>${escapeHtml(champion.name || "Winning song")}</strong>
        <p>${escapeHtml(artists)}</p>
      </div>
    `;
  }

  function renderBracketEntrySlot(entry, isWinner) {
    if (!entry) {
      return `
        <span class="bracket-slot empty">
          <span class="bracket-slot-cover" aria-hidden="true"></span>
          <span class="bracket-slot-copy">
            <strong>Awaiting song</strong>
            <em>Winner feeds in here</em>
          </span>
        </span>
      `;
    }
    return `
      <span class="bracket-slot${isWinner ? " winner" : ""}">
        ${entry.image ? `<img class="bracket-slot-cover" src="${escapeHtml(entry.image)}" alt="">` : `<span class="bracket-slot-cover" aria-hidden="true"></span>`}
        <span class="bracket-slot-copy">
          <strong>${escapeHtml(entry.name || "Song")}</strong>
          <em>${escapeHtml(Array.isArray(entry.artists) ? entry.artists.join(", ") : "")}</em>
        </span>
        <span class="bracket-seed">#${escapeHtml(String(entry.seed || "?"))}</span>
      </span>
    `;
  }

  function renderBracketMatchCard(info, matchInfo, isFinalRound) {
    const leftWinner = !!(matchInfo.winner?.id && matchInfo.left?.id === matchInfo.winner.id);
    const rightWinner = !!(matchInfo.winner?.id && matchInfo.right?.id === matchInfo.winner.id);
    const canOpen = !!(info.ready && matchInfo.requiresVote);
    const statusLabel = !info.ready
      ? "Locked"
      : matchInfo.winner
        ? "Complete"
        : matchInfo.requiresVote
          ? "Pick Needed"
          : "Auto";
    const statusClass = !info.ready
      ? "locked"
      : matchInfo.winner
        ? "complete"
        : matchInfo.requiresVote
          ? "ready"
          : "auto";
    const title = `${info.round.label} matchup ${matchInfo.matchIndex + 1}`;
    return `
      <button class="bracket-match-card ${statusClass}${isFinalRound ? " final" : ""}" type="button" data-open-round="${info.roundIndex}" data-open-match="${matchInfo.matchIndex}" ${canOpen ? "" : "disabled"} aria-label="${escapeHtml(`Open ${title}`)}">
        <span class="bracket-match-topline">
          <span>${escapeHtml(title)}</span>
          <strong>${escapeHtml(statusLabel)}</strong>
        </span>
        <span class="bracket-match-slots">
          ${renderBracketEntrySlot(matchInfo.left, leftWinner)}
          ${renderBracketEntrySlot(matchInfo.right, rightWinner)}
        </span>
      </button>
    `;
  }

  function getMaxBracketPairStart() {
    return Math.max(state.rounds.length - 2, 0);
  }

  function clampBracketPairStart(roundIndex) {
    return Math.min(Math.max(Number(roundIndex) || 0, 0), getMaxBracketPairStart());
  }

  function getRoundStatusLabel(info) {
    if (!info?.ready) return "Locked";
    return info.completed ? "Complete" : "Ready";
  }

  function renderBracketRoundWindowHeader(info, eyebrow) {
    return `
      <header class="bracket-round-header">
        <div>
          <span class="kicker">${escapeHtml(eyebrow)}</span>
          <h3>${escapeHtml(info.round.label || `Round ${info.roundIndex + 1}`)}</h3>
        </div>
        <span class="round-card-status${!info.ready ? "" : info.completed ? " complete" : " ready"}">${escapeHtml(getRoundStatusLabel(info))}</span>
      </header>
    `;
  }

  function renderBracketEmptySlot() {
    return `
      <div class="bracket-match-card empty" aria-hidden="true">
        <span class="bracket-match-topline">
          <span>Waiting</span>
          <strong>Empty</strong>
        </span>
        <span class="bracket-match-slots">
          ${renderBracketEntrySlot(null, false)}
        </span>
      </div>
    `;
  }

  function renderTraditionalBracketStage() {
    state.bracketPairStartIndex = clampBracketPairStart(state.bracketPairStartIndex);
    const leftIndex = state.bracketPairStartIndex;
    const rightIndex = leftIndex + 1;
    const leftInfo = getRoundInfo(leftIndex);
    const rightInfo = rightIndex < state.rounds.length ? getRoundInfo(rightIndex) : null;
    if (!leftInfo) {
      roundStage.innerHTML = `<div class="empty-state">No bracket is loaded yet.</div>`;
      return;
    }
    const roundPills = state.rounds.map((round, roundIndex) => {
      const info = getRoundInfo(roundIndex);
      const statusLabel = getRoundStatusLabel(info);
      const safeTarget = clampBracketPairStart(roundIndex);
      const activeClass = roundIndex === leftIndex ? " active" : roundIndex === rightIndex ? " paired" : "";
      return `
        <button class="bracket-round-pill${activeClass}" type="button" data-bracket-round-target="${safeTarget}">
          <span>${escapeHtml(round.label || `Round ${roundIndex + 1}`)}</span>
          <strong>${escapeHtml(statusLabel)}</strong>
        </button>
      `;
    }).join("");
    const pairCount = rightInfo
      ? Math.max(rightInfo.matchInfos.length || 0, Math.ceil(leftInfo.matchInfos.length / 2), 1)
      : Math.max(leftInfo.matchInfos.length, 1);
    const pairRows = Array.from({ length: pairCount }, (_, pairIndex) => {
      const firstLeft = leftInfo.matchInfos[rightInfo ? pairIndex * 2 : pairIndex] || null;
      const secondLeft = rightInfo ? leftInfo.matchInfos[pairIndex * 2 + 1] || null : null;
      const rightMatch = rightInfo?.matchInfos[pairIndex] || null;
      return `
        <div class="bracket-pair-row">
          <div class="bracket-left-pair">
            ${firstLeft ? renderBracketMatchCard(leftInfo, firstLeft, !rightInfo) : renderBracketEmptySlot()}
            ${rightInfo ? (secondLeft ? renderBracketMatchCard(leftInfo, secondLeft, false) : renderBracketEmptySlot()) : ""}
          </div>
          ${rightInfo ? `<div class="bracket-connector" aria-hidden="true"></div>` : ""}
          ${rightInfo ? `
            <div class="bracket-right-pair">
              ${rightMatch ? renderBracketMatchCard(rightInfo, rightMatch, rightIndex === state.rounds.length - 1) : renderBracketEmptySlot()}
            </div>
          ` : ""}
        </div>
      `;
    }).join("");

    roundStage.innerHTML = `
      <div class="bracket-window-head">
        <div class="bracket-round-pills" aria-label="Bracket rounds">
          ${roundPills}
        </div>
        <div class="bracket-window-actions">
          <button class="bracket-window-btn" type="button" data-bracket-round-shift="-1" ${leftIndex <= 0 ? "disabled" : ""} aria-label="Previous round pair">
            <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
            <span>Previous Rounds</span>
          </button>
          <button class="bracket-window-btn" type="button" data-bracket-round-shift="1" ${leftIndex >= getMaxBracketPairStart() ? "disabled" : ""} aria-label="Next round pair">
            <span>Next Rounds</span>
            <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
          </button>
        </div>
      </div>
      <div class="bracket-window-summary">
        Showing ${escapeHtml(leftInfo.round.label || `Round ${leftIndex + 1}`)}${rightInfo ? ` into ${escapeHtml(rightInfo.round.label || `Round ${rightIndex + 1}`)}` : ""}.
      </div>
      <section class="bracket-window" aria-label="Two-round bracket window">
        <div class="bracket-window-grid${rightInfo ? "" : " single"}">
          <div class="bracket-window-round-head left">${renderBracketRoundWindowHeader(leftInfo, "LEFT SIDE")}</div>
          ${rightInfo ? `<div class="bracket-window-round-head right">${renderBracketRoundWindowHeader(rightInfo, "RIGHT SIDE")}</div>` : ""}
          <div class="bracket-pair-rows">
            ${pairRows}
          </div>
        </div>
      </section>
      <p class="bracket-map-note">Use Next Rounds to shift the right column onto the left side. Unlocked matchup cards still open the voting popup.</p>
    `;
  }

  function setBracketWindowStart(roundIndex) {
    const nextStart = clampBracketPairStart(roundIndex);
    if (state.bracketPairStartIndex === nextStart) return;
    state.bracketPairStartIndex = nextStart;
    renderRoundStage();
  }

  function shiftBracketRound(step) {
    setBracketWindowStart(state.bracketPairStartIndex + step);
  }

  function renderRoundStage() {
    if (!roundStage) return;
    if (!state.rounds.length) {
      roundStage.innerHTML = `<div class="empty-state">No bracket is loaded yet.</div>`;
      return;
    }
    if (pageMode === "bracket") {
      renderTraditionalBracketStage();
      return;
    }
    if (pageMode !== "bracket") {
      const votingContext = getPrimaryVotingContext();
      if (!votingContext) {
        roundStage.innerHTML = `<div class="empty-state">No manual voting rounds are available for this bracket yet.</div>`;
        return;
      }
      const { info, pickNumber, isComplete } = votingContext;
      const bracketHref = state.activeTournament?.slug
        ? `/all-tournaments/bracket/view/?slug=${encodeURIComponent(state.activeTournament.slug)}`
        : "/all-tournaments/bracket/view/";
      const voteLabel = isComplete ? "Review Votes" : "Vote Now";
      const helper = isComplete
        ? `${info.round.label} is complete. You can reopen it to review or change picks.`
        : `${info.round.label} - pick ${pickNumber} of ${info.selectionTotal}. ${formatRoundSummary(info)}`;
      roundStage.innerHTML = `
        <section class="vote-now-card">
          <div class="vote-now-copy">
            <div class="kicker">VOTING</div>
            <h3>Vote Now</h3>
            <p>${escapeHtml(helper)}</p>
          </div>
          <div class="vote-now-actions">
            <button class="btn vote-now-btn" type="button" data-open-round="${info.roundIndex}">${escapeHtml(voteLabel)}</button>
            <a class="btn-secondary" id="bracketViewLink" href="${escapeHtml(bracketHref)}" target="_blank" rel="noopener">
              <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
              <span>Open Bracket View</span>
            </a>
          </div>
        </section>
      `;
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
    const sideLabel = side === "left" ? "Left song" : "Right song";
    const canVote = !!state.activeTournament?.canVote;
    return `
      <button class="vote-choice${selected ? " selected" : ""}${canVote ? "" : " disabled"}" type="button" data-vote-side="${side}" ${canVote ? "" : "disabled"} aria-label="Pick ${escapeHtml(entry.name)}">
        <span class="vote-hotkey">${hotkey}</span>
        <span class="vote-choice-body">
          ${entry.image ? `<img class="vote-cover" src="${escapeHtml(entry.image)}" alt="">` : `<span class="vote-cover" aria-hidden="true"></span>`}
          <span class="vote-copy">
            <span class="vote-side-label">${sideLabel}</span>
            <span class="vote-title">${escapeHtml(entry.name)}</span>
            <span class="vote-artist">${escapeHtml(Array.isArray(entry.artists) ? entry.artists.join(", ") : "")}</span>
            <span class="vote-meta">
              <span>${escapeHtml(entry.year)}</span>
              <span>Seed ${escapeHtml(entry.seed)}</span>
            </span>
          </span>
        </span>
      </button>
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
    const pickNumber = Math.min(state.activeSelectionCursor + 1, Math.max(selectionTotal, 1));
    const nextRoundIndex = info.completed ? getNextReadyRoundIndex(info.roundIndex) : null;
    const nextRound = nextRoundIndex === null ? null : state.rounds[nextRoundIndex];
    voteModalKicker.textContent = info.round.label.toUpperCase();
    voteModalTitle.textContent = info.completed ? `${info.round.label} Complete` : `Pick ${pickNumber} of ${Math.max(selectionTotal, 1)}`;
    const accessSentence = state.activeTournament?.canVote
      ? (info.selectionTotal ? `${info.completedSelections}/${info.selectionTotal} selections are locked in for this round.` : "No manual selections remain in this round.")
      : "You can view this round, but only eligible paiden.com accounts can submit picks here.";
    voteModalSubtitle.textContent = `${info.round.description} ${accessSentence}`;
    voteProgressText.textContent = `${info.round.label} - Pick ${pickNumber} / ${Math.max(selectionTotal, 1)}`;
    voteCompleteNote.hidden = !info.completed;
    if (voteNextRoundBtn) {
      voteNextRoundBtn.hidden = !info.completed;
      voteNextRoundBtn.textContent = nextRound ? `Open ${nextRound.label}` : "Close Voting";
      voteNextRoundBtn.disabled = false;
    }

    if (!match) {
      voteMatchup.innerHTML = `
        <div class="vote-matchup-frame">
          <div class="vote-matchup-label">
            <span>${escapeHtml(info.round.label)}</span>
            <strong>No manual picks left</strong>
          </div>
          <div class="empty-state">No manual matchups are left in this round.</div>
        </div>
      `;
      votePrevBtn.disabled = true;
      voteNextBtn.disabled = true;
      voteNextBtn.textContent = "Next Pick";
      return;
    }

    voteMatchup.innerHTML = `
      <div class="vote-matchup-frame">
        <div class="vote-matchup-label">
          <span>${escapeHtml(info.round.label)}</span>
          <strong>Pick ${pickNumber} of ${selectionTotal}</strong>
        </div>
        <div class="vote-choice-grid">
          ${renderVoteChoice(match.left, match.pick === "left", "left")}
          ${renderVoteChoice(match.right, match.pick === "right", "right")}
        </div>
      </div>
    `;
    votePrevBtn.disabled = state.activeSelectionCursor <= 0;
    voteNextBtn.disabled = state.activeSelectionCursor >= selectionTotal - 1;
    voteNextBtn.textContent = "Next Pick";
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

  function getFullRankingsUrl(record) {
    return record?.slug ? `/all-tournaments/rankings/list/?slug=${encodeURIComponent(record.slug)}` : "/all-tournaments/rankings/list/";
  }

  function renderFullRankingCard(item, index) {
    const entry = item.entry || {};
    const userPoints = [...item.userPoints].sort((left, right) => {
      if ((left.podiumRank || 0) !== (right.podiumRank || 0)) {
        if (!left.podiumRank) return 1;
        if (!right.podiumRank) return -1;
        return left.podiumRank - right.podiumRank;
      }
      if (right.points !== left.points) return right.points - left.points;
      return String(left.username || "").localeCompare(String(right.username || ""));
    });
    const podiumBadges = renderPodiumBadgeCluster(item.podiumVotes);
    return `
      <article class="ranking-card">
        <div class="ranking-card-head">
          <div class="ranking-order">#${index + 1}</div>
          <div class="ranking-entry">
            ${entry.image ? `<img class="ranking-cover" src="${escapeHtml(entry.image)}" alt="">` : `<div class="ranking-cover" aria-hidden="true"></div>`}
            <div class="ranking-copy">
              <h3>${escapeHtml(entry.name || "Song")}</h3>
              <p>${escapeHtml(Array.isArray(entry.artists) ? entry.artists.join(", ") : "")}</p>
              <div class="ranking-meta">
                <span class="meta-chip">${escapeHtml(String(entry.year || "Unknown year"))}</span>
                <span class="meta-chip">Seed ${escapeHtml(String(entry.seed || "?"))}</span>
                <span class="meta-chip ranking-total-chip">${podiumBadges}<span>${item.totalPoints} pts</span></span>
              </div>
            </div>
          </div>
        </div>
        <div class="ranking-user-points">
          ${userPoints.map((vote) => `
            <span class="ranking-voter-pill${vote.champion ? " champion" : ""}${vote.podiumRank ? ` podium ${getPodiumTone(vote.podiumRank)}` : ""}">
              <span class="ranking-voter-name">${escapeHtml(vote.username)}</span>
              <span class="ranking-voter-score">
                ${renderVoterPodiumBadge(vote)}
                <strong>${vote.points} pt${vote.points === 1 ? "" : "s"}</strong>
              </span>
            </span>
          `).join("")}
        </div>
      </article>
    `;
  }

  function renderRankingPreviewRow(item, index) {
    const entry = item.entry || {};
    const podiumBadges = renderPodiumBadgeCluster(item.podiumVotes);
    return `
      <div class="ranking-preview-row">
        <span class="ranking-preview-position">#${index + 1}</span>
        ${entry.image ? `<img class="ranking-preview-cover" src="${escapeHtml(entry.image)}" alt="">` : `<span class="ranking-preview-cover" aria-hidden="true"></span>`}
        <span class="ranking-preview-copy">
          <strong>${escapeHtml(entry.name || "Song")}</strong>
          <span>${escapeHtml(Array.isArray(entry.artists) ? entry.artists.join(", ") : "")}</span>
        </span>
        <span class="ranking-preview-points">${podiumBadges}<span>${item.totalPoints} pts</span></span>
      </div>
    `;
  }

  function renderRankings(record) {
    if (!rankingList || !rankingSummaryText) return;
    const shell = rankingList.closest(".ranking-shell");
    if (!record) {
      if (shell) shell.hidden = true;
      rankingSummaryText.textContent = "";
      rankingList.innerHTML = "";
      return;
    }
    if (pageMode === "detail" && !getFinalWinner()) {
      if (shell) shell.hidden = true;
      rankingSummaryText.textContent = "";
      rankingList.innerHTML = "";
      return;
    }
    if (shell) shell.hidden = false;
    const { rankings, ballotCount, rounds } = getRankingBreakdown(record);
    if (!ballotCount) {
      rankingSummaryText.textContent = "No one has saved a ballot for this bracket yet.";
      rankingList.innerHTML = `<div class="empty-state">Once voters save picks, this page will rank songs by weighted finish points for this bracket.</div>`;
      return;
    }

    if (pageMode === "rankings") {
      rankingSummaryText.textContent = `${ballotCount} ballot${ballotCount === 1 ? "" : "s"} saved. Points by finish: ${describePointWeights(rounds)}.`;
      rankingList.innerHTML = rankings.map(renderFullRankingCard).join("");
      return;
    }

    const fullUrl = getFullRankingsUrl(record);
    const previewRankings = rankings.slice(0, 5);
    rankingSummaryText.textContent = `${ballotCount} ballot${ballotCount === 1 ? "" : "s"} saved. Showing the top 5 here. Points by finish: ${describePointWeights(rounds)}.`;
    rankingList.innerHTML = `
      <a class="ranking-preview-link" href="${escapeHtml(fullUrl)}" target="_blank" rel="noopener" aria-label="Open the full ranked list for ${escapeHtml(record.name || "this tournament")}">
        <div class="ranking-preview-grid">
          ${previewRankings.map(renderRankingPreviewRow).join("")}
        </div>
        <span class="ranking-full-link">
          <span>Open full ranked list</span>
          <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
        </span>
      </a>
    `;
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
      resultsShell?.setAttribute("hidden", "hidden");
      return;
    }
    detailHeroTitle.textContent = record.name || "Saved Tournament";
    detailHeroMeta.textContent = `${record.ownerUsername ? `Hosted by @${record.ownerUsername}` : "Hosted on paiden.com"}${record.entrants?.length ? ` - ${record.entrants.length} songs` : ""}`;
    if (pageMode === "rankings") {
      detailHeroSubnote.textContent = "This page shows the full weighted list for the bracket. Open the tournament page to vote or manage access.";
    } else if (pageMode === "bracket") {
      detailHeroSubnote.textContent = "Move through adjacent bracket rounds two at a time. Open any available matchup to review or change picks.";
    } else {
      detailHeroSubnote.textContent = record.canVote
        ? "Use the Vote Now card to continue the next pick. Your ballot is saved to this bracket and folded into the top-five standings after completion."
        : record.visibility === "public"
          ? "You can view this public bracket here. Sign in to paiden.com if you want to vote on it."
          : "This private bracket is only voteable by the owner and invited participants.";
    }
    if (rankingBackLink) {
      rankingBackLink.href = record.slug ? `/all-tournaments/${encodeURIComponent(record.slug)}` : "/all-tournaments/";
    }
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
      renderRankings(state.activeTournament);
      renderChampion();
      renderRoundStage();
      renderVoteModal();
      return;
    }
    if (pageMode === "rankings") {
      renderDetailHeader(state.activeTournament);
      renderRankings(state.activeTournament);
      return;
    }
    if (pageMode === "bracket") {
      renderDetailHeader(state.activeTournament);
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

  function openRoundModal(roundIndex, targetMatchIndex = null) {
    const info = getRoundInfo(roundIndex);
    if (!info || !info.ready) return;
    state.activeRoundIndex = roundIndex;
    const requestedCursor = targetMatchIndex === null ? -1 : info.selectionMatchIndexes.indexOf(targetMatchIndex);
    const firstIncomplete = info.selectionMatchIndexes.findIndex((matchIndex) => {
      const match = info.matchInfos.find((entry) => entry.matchIndex === matchIndex);
      return match && !match.winner;
    });
    state.activeSelectionCursor = requestedCursor >= 0 ? requestedCursor : firstIncomplete >= 0 ? firstIncomplete : 0;
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
      const roundTarget = event.target.closest("[data-bracket-round-target]");
      if (roundTarget) {
        const targetIndex = Number(roundTarget.getAttribute("data-bracket-round-target"));
        if (Number.isFinite(targetIndex)) setBracketWindowStart(targetIndex);
        return;
      }
      const roundShift = event.target.closest("[data-bracket-round-shift]");
      if (roundShift) {
        const shift = Number(roundShift.getAttribute("data-bracket-round-shift"));
        if (Number.isFinite(shift)) shiftBracketRound(shift);
        return;
      }
      const button = event.target.closest("[data-open-round]");
      if (!button) return;
      const roundIndex = Number(button.getAttribute("data-open-round"));
      const matchIndex = Number(button.getAttribute("data-open-match"));
      if (Number.isFinite(roundIndex)) openRoundModal(roundIndex, Number.isFinite(matchIndex) ? matchIndex : null);
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
  if (voteNextRoundBtn) voteNextRoundBtn.addEventListener("click", () => moveToNextRoundFromModal());
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
      if (context.info.completed) {
        moveToNextRoundFromModal();
        return;
      }
      advanceActiveSelection(1);
    }
  });

  (async () => {
    if (pageMode === "library") {
      await initLibraryPage();
      return;
    }
    if (pageMode === "detail" || pageMode === "rankings" || pageMode === "bracket") {
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
