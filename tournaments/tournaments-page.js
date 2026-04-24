
(() => {
  const DEFAULT_CLIENT_ID = "3a032e0e0d4e4108b6e1e7b581b793df";
  const CLIENT_ID_KEY = "paiden_spotify_client_id";
  const AUTH_KEY = "paiden_spotify_auth";
  const VERIFIER_KEY = "paiden_spotify_pkce_verifier";
  const TOURNAMENT_STATE_KEY = "paiden_tournament_state_v1";
  const TOURNAMENT_LIBRARY_KEY = "paiden_tournament_library_v1";
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
    library: [],
    playlist: null,
    entrants: [],
    rounds: [],
    mainDrawSize: 0,
    picks: {},
    activeRoundIndex: null,
    activeSelectionCursor: 0,
    activeTournamentSlug: null,
    authRedirectProcessing: false,
    lastHandledAuthUrl: "",
  };

  const clientIdInput = document.getElementById("spotifyClientIdInput");
  const saveClientBtn = document.getElementById("saveSpotifyClientBtn");
  const connectBtn = document.getElementById("spotifyConnectBtn");
  const disconnectBtn = document.getElementById("spotifyDisconnectBtn");
  const authPill = document.getElementById("spotifyAuthPill");
  const playlistInput = document.getElementById("playlistInput");
  const buildBracketBtn = document.getElementById("buildBracketBtn");
  const resetBracketBtn = document.getElementById("resetBracketBtn");
  const statusCard = document.getElementById("statusCard");
  const statusText = document.getElementById("statusText");
  const debugOutput = document.getElementById("debugOutput");
  const tournamentLibraryList = document.getElementById("tournamentLibraryList");
  const libraryCount = document.getElementById("libraryCount");
  const detailHeroCover = document.getElementById("detailHeroCover");
  const detailHeroTitle = document.getElementById("detailHeroTitle");
  const detailHeroMeta = document.getElementById("detailHeroMeta");
  const detailHeroSubnote = document.getElementById("detailHeroSubnote");
  const detailEmptyState = document.getElementById("detailEmptyState");
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

  function getStoredClientId() {
    return localStorage.getItem(CLIENT_ID_KEY) || DEFAULT_CLIENT_ID;
  }

  function saveClientId(clientId) {
    localStorage.setItem(CLIENT_ID_KEY, clientId);
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

  function updateAuthUi() {
    if (!authPill) return;
    const connected = !!(state.auth && state.auth.access_token);
    authPill.classList.toggle("offline", !connected);
    authPill.innerHTML = connected
      ? `<i class="fab fa-spotify" aria-hidden="true"></i><span>Spotify connected${state.auth.user_name ? ` as ${escapeHtml(state.auth.user_name)}` : ""}</span>`
      : `<i class="fa-solid fa-circle" aria-hidden="true"></i><span>Not connected</span>`;
  }

  function slugify(value) {
    const normalized = String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return normalized || "untitled-playlist";
  }

  function loadActiveTournament() {
    try {
      const raw = localStorage.getItem(TOURNAMENT_STATE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function saveActiveTournament(record) {
    if (!record) {
      localStorage.removeItem(TOURNAMENT_STATE_KEY);
      return;
    }
    localStorage.setItem(TOURNAMENT_STATE_KEY, JSON.stringify(record));
  }

  function normalizeTournamentRecord(record) {
    if (!record || typeof record !== "object") return null;
    const playlist = record.playlist && typeof record.playlist === "object" ? record.playlist : null;
    const playlistId = record.playlistId || playlist?.id || "";
    const playlistName = record.playlistName || playlist?.name || "Untitled Playlist";
    if (!playlistId && !playlistName) return null;
    return {
      slug: record.slug || slugify(playlistName),
      playlistId,
      playlistName,
      cover: record.cover || playlist?.images?.[0]?.url || "",
      ownerName: record.ownerName || playlist?.owner?.display_name || playlist?.owner?.id || "",
      playlist,
      entrants: Array.isArray(record.entrants) ? record.entrants : [],
      rounds: Array.isArray(record.rounds) ? record.rounds : [],
      mainDrawSize: Number(record.mainDrawSize) || 0,
      picks: record.picks && typeof record.picks === "object" ? record.picks : {},
      updatedAt: record.updatedAt || new Date().toISOString(),
    };
  }

  function loadTournamentLibrary() {
    let list = [];
    try {
      const raw = localStorage.getItem(TOURNAMENT_LIBRARY_KEY);
      list = raw ? JSON.parse(raw) : [];
    } catch (_) {
      list = [];
    }
    list = Array.isArray(list) ? list.map(normalizeTournamentRecord).filter(Boolean) : [];
    if (list.length) return list;

    const active = normalizeTournamentRecord(loadActiveTournament());
    if (active) {
      localStorage.setItem(TOURNAMENT_LIBRARY_KEY, JSON.stringify([active]));
      return [active];
    }
    return [];
  }

  function saveTournamentLibrary(list) {
    localStorage.setItem(TOURNAMENT_LIBRARY_KEY, JSON.stringify(list));
  }
  function buildSnapshotFromState() {
    if (!state.playlist || !state.rounds.length) return null;
    return normalizeTournamentRecord({
      slug: state.activeTournamentSlug,
      playlistId: state.playlist.id,
      playlistName: state.playlist.name,
      cover: state.playlist.images?.[0]?.url || "",
      ownerName: state.playlist.owner?.display_name || state.playlist.owner?.id || "",
      playlist: state.playlist,
      entrants: state.entrants,
      rounds: state.rounds,
      mainDrawSize: state.mainDrawSize,
      picks: state.picks,
      updatedAt: new Date().toISOString(),
    });
  }

  function chooseTournamentSlug(snapshot) {
    const base = slugify(snapshot.playlistName || snapshot.playlist?.name || "playlist");
    const existing = state.library.find((entry) => entry.playlistId === snapshot.playlistId || entry.slug === state.activeTournamentSlug);
    if (existing?.slug) return existing.slug;
    let candidate = base;
    let counter = 2;
    while (state.library.some((entry) => entry.slug === candidate && entry.playlistId !== snapshot.playlistId)) {
      candidate = `${base}-${counter}`;
      counter += 1;
    }
    return candidate;
  }

  function persistCurrentTournament() {
    const snapshot = buildSnapshotFromState();
    if (!snapshot) {
      saveActiveTournament(null);
      return;
    }
    snapshot.slug = chooseTournamentSlug(snapshot);
    state.activeTournamentSlug = snapshot.slug;
    const nextLibrary = state.library.filter((entry) => entry.playlistId !== snapshot.playlistId && entry.slug !== snapshot.slug);
    nextLibrary.unshift(snapshot);
    nextLibrary.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    state.library = nextLibrary;
    saveTournamentLibrary(nextLibrary);
    saveActiveTournament(snapshot);
  }

  function applyTournamentRecord(record) {
    const normalized = normalizeTournamentRecord(record);
    state.playlist = normalized?.playlist || null;
    state.entrants = normalized?.entrants || [];
    state.rounds = normalized?.rounds || [];
    state.mainDrawSize = normalized?.mainDrawSize || 0;
    state.picks = normalized?.picks || {};
    state.activeTournamentSlug = normalized?.slug || null;
    state.activeRoundIndex = null;
    state.activeSelectionCursor = 0;
  }

  function clearTournamentState() {
    applyTournamentRecord(null);
    saveActiveTournament(null);
  }

  function findTournamentBySlug(slug) {
    return state.library.find((entry) => entry.slug === slug) || null;
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
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  async function createCodeChallenge(verifier) {
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return base64UrlEncode(digest);
  }

  async function beginSpotifyAuth() {
    const clientId = String(clientIdInput?.value || "").trim();
    if (!clientId) {
      setStatus("Save a Spotify Client ID first.", "error");
      clientIdInput?.focus();
      return;
    }
    saveClientId(clientId);
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
    if (!verifier || !clientId) {
      throw new Error("Missing PKCE verifier or Spotify client ID.");
    }
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
    if (!response.ok) {
      throw new Error(data.error_description || data.error || "Could not complete Spotify sign-in.");
    }
    localStorage.removeItem(VERIFIER_KEY);
    return data;
  }

  async function refreshToken() {
    const auth = loadAuth();
    const clientId = getStoredClientId();
    if (!auth || !auth.refresh_token || !clientId) {
      throw new Error("No refresh token available.");
    }
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
    if (!response.ok) {
      throw new Error(data.error_description || data.error || "Could not refresh Spotify session.");
    }
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
    if (!auth) {
      throw new Error("Connect Spotify first.");
    }
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
      history.replaceState({}, "", url.pathname);
      state.authRedirectProcessing = false;
    }
  }

  async function syncSpotifyAuthState() {
    await handleSpotifyRedirect();
    state.auth = loadAuth();
    updateAuthUi();
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
      `Client ID: ${getStoredClientId() || "(missing)"}`,
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

  function setMatchWinner(roundIndex, matchIndex, side) {
    state.picks[getRoundKey(roundIndex, matchIndex)] = side;
    clearLaterRounds(roundIndex + 1);
    persistCurrentTournament();
    renderApp();
    if (state.activeRoundIndex === roundIndex) {
      advanceActiveSelection();
    }
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
      roundStage.innerHTML = `<div class="empty-state">No saved bracket is loaded yet. Build one from the bracket builder to unlock round voting.</div>`;
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
      <article class="vote-choice${selected ? " selected" : ""}">
        <button class="vote-choice-select" type="button" data-vote-side="${side}">
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
    voteModalSubtitle.textContent = `${info.round.description} ${info.selectionTotal ? `${info.selectionTotal} selections need to be made in this round.` : "No manual selections remain in this round."}`;
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

  function renderTournamentLibrary() {
    if (!tournamentLibraryList) return;
    const tournaments = [...state.library].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    if (libraryCount) {
      libraryCount.textContent = tournaments.length ? `${tournaments.length} saved tournament${tournaments.length === 1 ? "" : "s"}` : "No saved tournaments yet";
    }
    if (!tournaments.length) {
      tournamentLibraryList.innerHTML = `
        <div class="empty-state">
          No tournaments have been saved on this device yet. Build one from <a href="/bracket-builder/">Bracket Builder</a> and it will show up here.
        </div>
      `;
      return;
    }

    tournamentLibraryList.innerHTML = tournaments.map((entry) => {
      const href = `/all-tournaments/${encodeURIComponent(entry.slug)}`;
      const metaBits = [
        entry.ownerName ? `Owner: ${entry.ownerName}` : "",
        entry.entrants?.length ? `${entry.entrants.length} songs` : "",
        entry.updatedAt ? `Updated ${formatDate(entry.updatedAt)}` : "",
      ].filter(Boolean).join(" - ");
      return `
        <a class="tournament-list-card" href="${href}">
          ${entry.cover ? `<img class="tournament-list-cover" src="${entry.cover}" alt="">` : `<div class="tournament-list-cover" aria-hidden="true"></div>`}
          <div class="tournament-list-copy">
            <h2>${escapeHtml(entry.playlistName)}</h2>
            <p>${escapeHtml(metaBits)}</p>
          </div>
          <span class="tournament-list-arrow"><i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
        </a>
      `;
    }).join("");
  }

  function renderDetailHeader(record) {
    if (!detailHeroTitle || !detailHeroMeta || !detailHeroSubnote || !detailHeroCover || !detailEmptyState) return;
    if (!record) {
      detailHeroTitle.textContent = "Tournament Not Found";
      detailHeroMeta.textContent = "This saved tournament could not be found on this device.";
      detailHeroSubnote.textContent = "Build a new bracket from the builder or go back to All Tournaments.";
      detailHeroCover.hidden = true;
      detailEmptyState.hidden = false;
      roundStage?.setAttribute("hidden", "hidden");
      championChip?.setAttribute("hidden", "hidden");
      return;
    }
    detailHeroTitle.textContent = record.playlistName || "Saved Tournament";
    detailHeroMeta.textContent = `${record.ownerName ? `Playlist by ${record.ownerName}` : "Saved tournament"}${record.entrants?.length ? ` - ${record.entrants.length} songs` : ""}`;
    detailHeroSubnote.textContent = "Open a round to vote matchup by matchup. Every pick here updates the saved tournament list immediately.";
    if (record.cover) {
      detailHeroCover.src = record.cover;
      detailHeroCover.hidden = false;
    } else {
      detailHeroCover.hidden = true;
    }
    detailEmptyState.hidden = true;
    roundStage?.removeAttribute("hidden");
    championChip?.removeAttribute("hidden");
  }

  function renderApp() {
    if (pageMode === "library") {
      renderTournamentLibrary();
      return;
    }
    if (pageMode === "detail") {
      renderDetailHeader(buildSnapshotFromState());
      renderChampion();
      renderRoundStage();
      renderVoteModal();
      return;
    }
    renderChampion();
    renderRoundStage();
    renderVoteModal();
  }

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
  async function buildBracketFromPlaylist() {
    const playlistId = parsePlaylistId(playlistInput?.value);
    if (!playlistId) {
      setStatus("Paste a valid Spotify playlist URL, URI, or 22-character playlist ID.", "error");
      playlistInput?.focus();
      setDebug("No diagnostics yet. Paste a valid Spotify playlist URL, URI, or 22-character playlist ID first.");
      return;
    }

    let accessToken;
    try {
      accessToken = await getValidAccessToken();
    } catch (errorObj) {
      setStatus(errorObj.message || "Connect Spotify first.", "error");
      setDebug(`Spotify auth is not ready.\nMessage: ${errorObj.message || "Connect Spotify first."}`);
      return;
    }

    if (buildBracketBtn) {
      buildBracketBtn.disabled = true;
      buildBracketBtn.innerHTML = "Building...";
    }

    try {
      setStatus("Loading playlist from Spotify...");
      await runPlaylistDiagnostics(playlistId, accessToken);
      const { playlist, tracks } = await fetchPlaylistItems(playlistId, accessToken);
      if (tracks.length < 2) {
        throw new Error("This playlist does not have enough Spotify tracks to build a tournament.");
      }

      const { rounds, mainDrawSize } = buildTournamentRounds(tracks);
      applyTournamentRecord({ playlist, entrants: tracks, rounds, mainDrawSize, picks: {} });
      persistCurrentTournament();
      renderApp();

      const prelimRound = rounds.find((round) => round.id === "preliminary-round");
      const successText = prelimRound
        ? `Saved ${playlist.name}. All ${tracks.length} songs are included, starting with ${prelimRound.matches.length} preliminary matchup${prelimRound.matches.length === 1 ? "" : "s"} before the ${roundLabelForSize(mainDrawSize).toLowerCase()}.`
        : `Saved ${playlist.name}. All ${tracks.length} songs land directly in the ${roundLabelForSize(mainDrawSize).toLowerCase()}.`;
      setStatus(successText, "success");
    } catch (errorObj) {
      clearTournamentState();
      if (errorObj?.spotifyStatus === 401) {
        clearAuth();
        updateAuthUi();
        setStatus("Spotify session expired or was rejected. Reconnect Spotify, then try building the tournament again.", "error");
      } else if (errorObj?.spotifyStatus === 403) {
        setStatus("Spotify denied access to that playlist. Reconnect Spotify and make sure the signed-in Spotify account can open the playlist and its tracks.", "error");
      } else {
        setStatus(errorObj.message || "Could not build the tournament.", "error");
      }
    } finally {
      if (buildBracketBtn) {
        buildBracketBtn.disabled = false;
        buildBracketBtn.innerHTML = `<i class="fa-solid fa-bracket-curly" aria-hidden="true"></i> Build Bracket`;
      }
    }
  }

  function resetBracketPicks() {
    state.picks = {};
    closeVoteModal();
    persistCurrentTournament();
    renderApp();
    if (state.rounds.length) {
      setStatus("Tournament picks reset.", "success");
    }
  }

  function handleStorageSync() {
    state.library = loadTournamentLibrary();
    if (pageMode === "library") {
      renderTournamentLibrary();
      return;
    }
    if (pageMode === "detail") {
      const slug = getDetailSlug();
      const record = findTournamentBySlug(slug);
      applyTournamentRecord(record);
      renderApp();
      return;
    }
    const active = normalizeTournamentRecord(loadActiveTournament());
    if (active) {
      applyTournamentRecord(active);
    }
  }

  async function initBuilderOrHub() {
    const initialClientId = getStoredClientId();
    if (initialClientId && !localStorage.getItem(CLIENT_ID_KEY)) {
      saveClientId(initialClientId);
    }
    if (clientIdInput) {
      clientIdInput.value = initialClientId;
    }
    if (debugOutput) {
      setDebug([
        `Client ID: ${initialClientId || "(missing)"}`,
        `Redirect URI: ${REDIRECT_URI}`,
        `Scopes requested: ${SCOPES}`,
        "",
        "No diagnostics yet. Build a bracket or reconnect Spotify to inspect the current account and playlist access steps.",
      ]);
    }
    state.auth = loadAuth();
    updateAuthUi();
    await syncSpotifyAuthState();
  }

  function initLibraryPage() {
    state.library = loadTournamentLibrary();
    renderTournamentLibrary();
  }

  function initDetailPage() {
    state.library = loadTournamentLibrary();
    const slug = getDetailSlug();
    const record = findTournamentBySlug(slug);
    applyTournamentRecord(record);
    renderApp();
  }

  if (saveClientBtn) {
    saveClientBtn.addEventListener("click", () => {
      const clientId = String(clientIdInput?.value || "").trim();
      if (!clientId) {
        setStatus("Paste a Spotify Client ID before saving.", "error");
        return;
      }
      saveClientId(clientId);
      setStatus("Spotify Client ID saved locally in this browser.", "success");
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
      updateAuthUi();
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
      resetBracketPicks();
    });
  }

  if (roundStage) {
    roundStage.addEventListener("click", (event) => {
      const button = event.target.closest("[data-open-round]");
      if (!button) return;
      const roundIndex = Number(button.getAttribute("data-open-round"));
      if (Number.isFinite(roundIndex)) {
        openRoundModal(roundIndex);
      }
    });
  }

  if (voteMatchup) {
    voteMatchup.addEventListener("click", (event) => {
      const button = event.target.closest("[data-vote-side]");
      if (!button || state.activeRoundIndex === null) return;
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
      if (event.target === voteModal) {
        closeVoteModal();
      }
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
  window.addEventListener("storage", (event) => {
    if (event.key !== TOURNAMENT_LIBRARY_KEY && event.key !== TOURNAMENT_STATE_KEY) return;
    handleStorageSync();
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
    state.library = loadTournamentLibrary();
    if (pageMode === "library") {
      initLibraryPage();
      return;
    }
    if (pageMode === "detail") {
      initDetailPage();
      return;
    }
    if (pageMode === "hub" || pageMode === "builder") {
      await initBuilderOrHub();
    }
  })().catch((errorObj) => {
    setStatus(errorObj.message || "Could not initialize tournaments.", "error");
  });
})();

