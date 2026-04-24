(() => {
  const DEFAULT_CLIENT_ID = "3a032e0e0d4e4108b6e1e7b581b793df";
  const CLIENT_ID_KEY = "paiden_spotify_client_id";
  const AUTH_KEY = "paiden_spotify_auth";
  const VERIFIER_KEY = "paiden_spotify_pkce_verifier";
  const SCOPES = [
    "playlist-read-private",
    "playlist-read-collaborative",
  ].join(" ");
  const REDIRECT_URI = `${window.location.origin}/tournaments/`;
  const SPOTIFY_ACCOUNTS = "https://accounts.spotify.com";
  const SPOTIFY_API = "https://api.spotify.com/v1";

  const state = {
    auth: null,
    playlist: null,
    entrants: [],
    rounds: [],
    mainDrawSize: 0,
    picks: {},
    activeRoundIndex: null,
    activeSelectionCursor: 0,
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
  const playlistPreview = document.getElementById("playlistPreview");
  const roundStage = document.getElementById("roundStage");
  const championChip = document.getElementById("championChip");
  const debugOutput = document.getElementById("debugOutput");
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

  function setStatus(message, kind = "info") {
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
    const connected = !!(state.auth && state.auth.access_token);
    authPill.classList.toggle("offline", !connected);
    authPill.innerHTML = connected
      ? `<i class="fab fa-spotify" aria-hidden="true"></i><span>Spotify connected${state.auth.user_name ? ` as ${state.auth.user_name}` : ""}</span>`
      : `<i class="fa-solid fa-circle" aria-hidden="true"></i><span>Not connected</span>`;
  }

  function parsePlaylistId(input) {
    const value = String(input || "").trim();
    if (!value) return null;
    const rawId = value.match(/^[A-Za-z0-9]{22}$/);
    if (rawId) return rawId[0];
    const uriMatch = value.match(/^spotify:playlist:([A-Za-z0-9]{22})$/i);
    if (uriMatch) return uriMatch[1];
    try {
      const url = new URL(value);
      const match = url.pathname.match(/\/playlist\/([A-Za-z0-9]{22})/i);
      if (match) return match[1];
    } catch (_) {
      return null;
    }
    return null;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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
    const clientId = String(clientIdInput.value || "").trim();
    if (!clientId) {
      setStatus("Save a Spotify Client ID first.", "error");
      clientIdInput.focus();
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
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
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
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
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
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
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

  async function fetchCurrentUser(accessToken) {
    const me = await fetchCurrentUserProfile(accessToken);
    return me?.display_name || me?.id || "";
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
      const auth = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: Date.now() + ((Number(tokenData.expires_in) || 3600) - 45) * 1000,
      };
      saveAuth(auth);
      const accessToken = await getValidAccessToken();
      const profile = await fetchCurrentUserProfile(accessToken).catch(() => null);
      const userName = profile?.display_name || profile?.id || "";
      saveAuth({ ...state.auth, user_name: userName, user_country: profile?.country || "" });
      setStatus(userName ? `Spotify connected as ${userName}.` : "Spotify connected.", "success");
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
    renderApp();
  }

  function smallestPowerOfTwoAtOrAbove(value) {
    let size = 1;
    while (size < value) size *= 2;
    return size;
  }

  function powerOfTwoAtOrBelow(value) {
    let size = 1;
    while (size * 2 <= value) size *= 2;
    return size;
  }

  function resolveBracketSize(totalTracks, requested) {
    const minimumSize = smallestPowerOfTwoAtOrAbove(totalTracks);
    if (minimumSize < 2) return 0;
    if (requested === "auto") return minimumSize;
    const numeric = Number(requested);
    if (!Number.isFinite(numeric) || numeric < 2) return minimumSize;
    return Math.max(numeric, minimumSize);
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

  async function fetchTrackDetailsMap(trackIds, accessToken) {
    const detailMap = new Map();
    for (let index = 0; index < trackIds.length; index += 50) {
      const chunk = trackIds.slice(index, index + 50).filter(Boolean);
      if (!chunk.length) continue;
      const data = await spotifyFetch("/tracks", accessToken, {
        ids: chunk.join(","),
        market: state.auth?.user_country || undefined,
      });
      const tracks = Array.isArray(data?.tracks) ? data.tracks : [];
      tracks.forEach((track) => {
        if (!track?.id) return;
        detailMap.set(track.id, {
          popularity: Number(track.popularity) || 0,
          previewUrl: track.preview_url || "",
          image: track.album?.images?.[0]?.url || "",
          year: String(track.album?.release_date || "").slice(0, 4) || "Unknown year",
        });
      });
    }
    return detailMap;
  }

  async function fetchPlaylistItems(playlistId, accessToken) {
    const playlist = await spotifyFetch(`/playlists/${playlistId}`, accessToken, {
      fields: "id,name,description,owner(display_name,id),images(url),external_urls.spotify,items(total)",
    });

    const rawTracks = [];
    let nextUrl = `${SPOTIFY_API}/playlists/${playlistId}/items?limit=100&offset=0&additional_types=track&fields=items(item(id,name,popularity,artists(name),album(images,release_date),external_urls.spotify,preview_url,is_local,type)),next,total`;

    while (nextUrl) {
      const data = await spotifyFetchUrl(nextUrl, accessToken);
      const items = Array.isArray(data.items) ? data.items : [];
      items.forEach((item) => {
        const track = item?.item || item?.track;
        if (!track || track.is_local || track.type !== "track" || !track.id) return;
        rawTracks.push({
          id: track.id,
          playlistOrder: rawTracks.length,
          name: track.name || "Untitled track",
          popularity: Number(track.popularity) || 0,
          artists: Array.isArray(track.artists) ? track.artists.map((artist) => artist?.name).filter(Boolean) : [],
          image: track.album?.images?.[0]?.url || "",
          year: String(track.album?.release_date || "").slice(0, 4) || "Unknown year",
          spotifyUrl: track.external_urls?.spotify || "",
          previewUrl: track.preview_url || "",
        });
      });
      nextUrl = data.next || null;
    }

    const deduped = [];
    const seen = new Set();
    rawTracks.forEach((track) => {
      if (seen.has(track.id)) return;
      seen.add(track.id);
      deduped.push(track);
    });

    const detailMap = await fetchTrackDetailsMap(deduped.map((track) => track.id), accessToken).catch(() => new Map());

    const rankedTracks = deduped
      .map((track) => ({
        ...track,
        popularity: Number(detailMap.get(track.id)?.popularity ?? track.popularity) || 0,
        previewUrl: detailMap.get(track.id)?.previewUrl || track.previewUrl || "",
        image: detailMap.get(track.id)?.image || track.image || "",
        year: detailMap.get(track.id)?.year || track.year || "Unknown year",
      }))
      .sort((a, b) => {
        if (b.popularity !== a.popularity) return b.popularity - a.popularity;
        return a.playlistOrder - b.playlistOrder;
      });

    return { playlist, tracks: rankedTracks };
  }

  function clearBracketState() {
    state.playlist = null;
    state.entrants = [];
    state.rounds = [];
    state.mainDrawSize = 0;
    state.picks = {};
    state.activeRoundIndex = null;
    state.activeSelectionCursor = 0;
    renderPlaylistPreview();
    renderChampion();
    renderRoundStage();
    renderVoteModal();
  }

  async function runPlaylistDiagnostics(playlistId, accessToken) {
    const lines = [
      `Client ID: ${getStoredClientId() || "(missing)"}`,
      `Redirect URI: ${REDIRECT_URI}`,
      `Playlist ID: ${playlistId || "(missing)"}`,
      `Scopes requested: ${SCOPES}`,
      "",
    ];

    let meData = null;
    try {
      meData = await spotifyFetch("/me", accessToken);
      lines.push(`[OK] /me`);
      lines.push(`Spotify account: ${meData.display_name || "(no display name)"}`);
      lines.push(`Spotify user id: ${meData.id || "(missing)"}`);
    } catch (errorObj) {
      lines.push(`[FAIL ${errorObj?.spotifyStatus || "?"}] /me`);
      lines.push(`Message: ${errorObj?.message || "Unknown Spotify error"}`);
      setDebug(lines);
      return { meData: null, playlistData: null, tracksStatus: null };
    }

    let playlistData = null;
    try {
      playlistData = await spotifyFetch(`/playlists/${playlistId}`, accessToken, {
        fields: "id,name,public,collaborative,owner(display_name,id),items(total)",
      });
      lines.push("");
      lines.push(`[OK] /playlists/${playlistId}`);
      lines.push(`Playlist name: ${playlistData.name || "(unknown)"}`);
      lines.push(`Playlist owner: ${playlistData.owner?.display_name || playlistData.owner?.id || "(unknown)"}`);
      lines.push(`Playlist owner id: ${playlistData.owner?.id || "(missing)"}`);
      lines.push(`Public: ${String(playlistData.public)}`);
      lines.push(`Collaborative: ${String(playlistData.collaborative)}`);
      lines.push(`Track count: ${playlistData.items?.total ?? playlistData.tracks?.total ?? "(unknown)"}`);
    } catch (errorObj) {
      lines.push("");
      lines.push(`[FAIL ${errorObj?.spotifyStatus || "?"}] /playlists/${playlistId}`);
      lines.push(`Message: ${errorObj?.message || "Unknown Spotify error"}`);
      setDebug(lines);
      return { meData, playlistData: null, tracksStatus: errorObj?.spotifyStatus || null };
    }

    try {
      await spotifyFetch(`/playlists/${playlistId}/items`, accessToken, {
        additional_types: "track",
        limit: 1,
        offset: 0,
        fields: "items(item(id,name)),next,total",
      });
      lines.push("");
      lines.push(`[OK] /playlists/${playlistId}/items`);
    } catch (errorObj) {
      lines.push("");
      lines.push(`[FAIL ${errorObj?.spotifyStatus || "?"}] /playlists/${playlistId}/items`);
      lines.push(`Message: ${errorObj?.message || "Unknown Spotify error"}`);
      setDebug(lines);
      return { meData, playlistData, tracksStatus: errorObj?.spotifyStatus || null };
    }

    setDebug(lines);
    return { meData, playlistData, tracksStatus: 200 };
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
      for (let i = 0; i < overflow; i += 1) {
        const betterSeed = entries[autoCount + i];
        const lowerSeed = entries[total - 1 - i];
        prelimMatches.push({
          effectiveSeed: betterSeed.seed,
          sides: [
            { type: "entrant", entry: betterSeed },
            { type: "entrant", entry: lowerSeed },
          ],
        });
      }

      rounds.push({
        id: "preliminary-round",
        label: "Preliminary Round",
        description: `Win ${overflow} matchup${overflow === 1 ? "" : "s"} to trim into the ${roundLabelForSize(mainDrawSize).toLowerCase()}.`,
        matches: prelimMatches,
      });

      entries.slice(0, autoCount).forEach((entry) => {
        seedRefs.set(entry.seed, { type: "entrant", entry });
      });
      prelimMatches.forEach((match, index) => {
        seedRefs.set(match.effectiveSeed, { type: "winner", roundIndex: 0, matchIndex: index });
      });
    } else {
      entries.forEach((entry) => {
        seedRefs.set(entry.seed, { type: "entrant", entry });
      });
    }

    const mainOrder = buildSeedOrder(mainDrawSize);
    const mainMatches = [];
    for (let i = 0; i < mainOrder.length; i += 2) {
      mainMatches.push({
        sides: [seedRefs.get(mainOrder[i]) || null, seedRefs.get(mainOrder[i + 1]) || null],
      });
    }

    rounds.push({
      id: `round-${mainDrawSize}`,
      label: roundLabelForSize(mainDrawSize),
      description: `Make every pick needed to decide the ${roundLabelForSize(mainDrawSize).toLowerCase()}.`,
      matches: mainMatches,
    });

    let previousRoundIndex = rounds.length - 1;
    let fieldSize = mainDrawSize / 2;
    while (fieldSize >= 1) {
      const previousRound = rounds[previousRoundIndex];
      if (previousRound.matches.length <= 1) break;
      const nextMatches = [];
      for (let matchIndex = 0; matchIndex < previousRound.matches.length; matchIndex += 2) {
        nextMatches.push({
          sides: [
            { type: "winner", roundIndex: previousRoundIndex, matchIndex },
            { type: "winner", roundIndex: previousRoundIndex, matchIndex: matchIndex + 1 },
          ],
        });
      }
      rounds.push({
        id: `round-${fieldSize}`,
        label: roundLabelForSize(fieldSize),
        description: fieldSize === 2
          ? "Choose the final winner for the playlist."
          : `Move the remaining songs through the ${roundLabelForSize(fieldSize).toLowerCase()}.`,
        matches: nextMatches,
      });
      previousRoundIndex = rounds.length - 1;
      fieldSize /= 2;
    }

    return { rounds, mainDrawSize };
  }

  function getRoundKey(roundIndex, matchIndex) {
    return `${roundIndex}:${matchIndex}`;
  }

  function resolveParticipant(ref) {
    if (!ref) return null;
    if (ref.type === "entrant") return ref.entry;
    if (ref.type === "winner") return getMatchWinner(ref.roundIndex, ref.matchIndex);
    return null;
  }

  function getRoundByIndex(roundIndex) {
    return state.rounds[roundIndex] || null;
  }

  function getMatchCompetitor(roundIndex, matchIndex, sideIndex) {
    const round = getRoundByIndex(roundIndex);
    const match = round?.matches?.[matchIndex];
    if (!match) return null;
    return resolveParticipant(match.sides[sideIndex]);
  }

  function getMatchWinner(roundIndex, matchIndex) {
    const left = getMatchCompetitor(roundIndex, matchIndex, 0);
    const right = getMatchCompetitor(roundIndex, matchIndex, 1);
    if (left && !right) return left;
    if (right && !left) return right;
    const pick = state.picks[getRoundKey(roundIndex, matchIndex)];
    if (!pick) return null;
    return pick === "left" ? left : right;
  }

  function clearLaterRounds(startRound) {
    Object.keys(state.picks).forEach((key) => {
      const roundIndex = Number(String(key).split(":")[0]);
      if (roundIndex >= startRound) delete state.picks[key];
    });
  }

  function setMatchWinner(roundIndex, matchIndex, side) {
    state.picks[getRoundKey(roundIndex, matchIndex)] = side;
    clearLaterRounds(roundIndex + 1);
    renderApp();
    if (state.activeRoundIndex === roundIndex) {
      advanceActiveSelection();
    }
  }
  function getRoundInfo(roundIndex) {
    const round = getRoundByIndex(roundIndex);
    if (!round) return null;
    const ready = roundIndex === 0 || isRoundComplete(roundIndex - 1);
    const matchInfos = round.matches.map((_, matchIndex) => {
      const left = getMatchCompetitor(roundIndex, matchIndex, 0);
      const right = getMatchCompetitor(roundIndex, matchIndex, 1);
      const pick = state.picks[getRoundKey(roundIndex, matchIndex)] || "";
      const winner = pick === "left" ? left : pick === "right" ? right : null;
      const requiresVote = !!(left && right);
      const autoAdvance = !!((left && !right) || (right && !left));
      return { matchIndex, left, right, pick, winner, requiresVote, autoAdvance };
    });
    const selectionMatchIndexes = matchInfos.filter((info) => info.requiresVote).map((info) => info.matchIndex);
    const completedSelections = matchInfos.filter((info) => info.requiresVote && info.winner).length;
    const selectionTotal = selectionMatchIndexes.length;
    const completed = ready && completedSelections === selectionTotal;
    return {
      round,
      roundIndex,
      ready,
      completed,
      matchInfos,
      selectionMatchIndexes,
      selectionTotal,
      completedSelections,
    };
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

  function formatPopularityLabel(entry) {
    return `Spotify popularity ${Number(entry?.popularity) || 0}/100`;
  }

  function renderPlaylistPreview() {
    if (!state.playlist || !state.entrants.length || !state.mainDrawSize) {
      playlistPreview.innerHTML = `<div class="empty-state">No playlist loaded yet. Once you build a tournament, this panel will show the playlist cover, owner, seeds, and round structure.</div>`;
      return;
    }

    const topSeeds = state.entrants.slice(0, Math.min(state.entrants.length, 8));
    const cover = state.playlist.images?.[0]?.url || "";
    const seedButtons = topSeeds.map((track) => `
      <button class="seed-option" type="button">
        <span class="seed-rank">${track.seed}</span>
        <span class="seed-copy">
          <span class="seed-track">${escapeHtml(track.name)}</span>
          <span class="seed-artist">${escapeHtml(track.artists.join(", "))}</span>
        </span>
        <span class="seed-score">${escapeHtml(track.year)} · Pop ${track.popularity}</span>
      </button>
    `).join("");

    const prelimRound = state.rounds.find((round) => round.id === "preliminary-round");
    const prelimText = prelimRound
      ? `Preliminary round: ${prelimRound.matches.length} matchup${prelimRound.matches.length === 1 ? "" : "s"}.`
      : "No preliminary round needed.";

    playlistPreview.innerHTML = `
      <div class="playlist-head">
        ${cover ? `<img class="playlist-cover" src="${cover}" alt="">` : `<div class="playlist-cover" aria-hidden="true"></div>`}
        <div>
          <h3 class="playlist-title">${escapeHtml(state.playlist.name || "Spotify playlist")}</h3>
          <p class="playlist-meta">Owner: ${escapeHtml(state.playlist.owner?.display_name || state.playlist.owner?.id || "Unknown")} - ${state.entrants.length} ranked songs - main draw ${roundLabelForSize(state.mainDrawSize).toLowerCase()}.</p>
          <p class="playlist-meta">${prelimText}</p>
          ${state.playlist.external_urls?.spotify ? `<p class="playlist-meta"><a class="spotify-link" href="${state.playlist.external_urls.spotify}" target="_blank" rel="noopener">Open playlist on Spotify</a></p>` : ""}
        </div>
      </div>
      <div class="seed-strip">
        ${seedButtons}
      </div>
    `;
  }

  function renderChampion() {
    const champion = getFinalWinner();
    const label = champion
      ? `${champion.name} - ${champion.artists.join(", ")}`
      : "No winner selected yet";
    championChip.innerHTML = `<span>Champion</span><strong>${escapeHtml(label)}</strong>`;
  }

  function renderRoundStage() {
    if (!state.rounds.length) {
      roundStage.innerHTML = `<div class="empty-state">Build a playlist tournament to unlock round-by-round voting.</div>`;
      return;
    }

    roundStage.innerHTML = state.rounds.map((round, roundIndex) => {
      const info = getRoundInfo(roundIndex);
      const statusLabel = !info.ready
        ? "Locked"
        : info.completed
          ? "Complete"
          : info.selectionTotal
            ? "Ready"
            : "Auto";
      const statusClass = !info.ready ? "" : info.completed ? " complete" : " ready";
      const helper = info.selectionTotal
        ? `${info.selectionTotal} selections to make.`
        : "This round only contains automatic advancers.";
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

  function renderVoteChoice(entry, selected, side) {
    if (!entry) {
      return `<div class="empty-state">No competitor is available in this slot.</div>`;
    }
    const hotkey = side === "left" ? "1 / A / ←" : "2 / D / →";
    const previewMarkup = entry.previewUrl
      ? `
        <div class="vote-preview">
          <div class="vote-preview-label">Song Snippet</div>
          <audio controls preload="none" src="${entry.previewUrl}"></audio>
        </div>
      `
      : `
        <div class="vote-preview">
          <div class="vote-preview-label">Song Snippet</div>
          <div class="vote-preview-note">Spotify did not provide a preview clip for this song.</div>
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
                <span>Seed ${entry.seed}</span>
                <span>${escapeHtml(entry.year)}</span>
                <span>${escapeHtml(formatPopularityLabel(entry))}</span>
              </div>
            </div>
          </div>
        </button>
        ${previewMarkup}
      </article>
    `;
  }

  function renderVoteModal() {
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

    voteMatchup.innerHTML = `
      ${renderVoteChoice(match.left, match.pick === "left", "left")}
      ${renderVoteChoice(match.right, match.pick === "right", "right")}
    `;

    votePrevBtn.disabled = state.activeSelectionCursor <= 0;
    voteNextBtn.disabled = state.activeSelectionCursor >= selectionTotal - 1;
  }

  function renderApp() {
    renderPlaylistPreview();
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
    const playlistId = parsePlaylistId(playlistInput.value);
    if (!playlistId) {
      setStatus("Paste a valid Spotify playlist URL, URI, or 22-character playlist ID.", "error");
      playlistInput.focus();
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

    buildBracketBtn.disabled = true;
    buildBracketBtn.textContent = "Building...";
    try {
      setStatus("Loading playlist from Spotify...");
      await runPlaylistDiagnostics(playlistId, accessToken);
      const { playlist, tracks } = await fetchPlaylistItems(playlistId, accessToken);
      if (tracks.length < 2) {
        throw new Error("This playlist does not have enough Spotify tracks to build a tournament.");
      }

      const seededTracks = tracks.map((track, index) => ({
        ...track,
        seed: index + 1,
      }));
      const { rounds, mainDrawSize } = buildTournamentRounds(seededTracks);

      state.playlist = playlist;
      state.entrants = seededTracks;
      state.rounds = rounds;
      state.mainDrawSize = mainDrawSize;
      state.picks = {};
      state.activeRoundIndex = null;
      state.activeSelectionCursor = 0;

      renderApp();

      const prelimRound = rounds.find((round) => round.id === "preliminary-round");
      if (prelimRound) {
        setStatus(`Tournament built from ${playlist.name}. All ${seededTracks.length} songs are included, starting with ${prelimRound.matches.length} preliminary matchup${prelimRound.matches.length === 1 ? "" : "s"} before the ${roundLabelForSize(mainDrawSize).toLowerCase()}.`, "success");
      } else {
        setStatus(`Tournament built from ${playlist.name}. All ${seededTracks.length} songs are included directly in the ${roundLabelForSize(mainDrawSize).toLowerCase()}.`, "success");
      }
    } catch (errorObj) {
      clearBracketState();
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
      buildBracketBtn.disabled = false;
      buildBracketBtn.innerHTML = `<i class="fa-solid fa-bracket-curly" aria-hidden="true"></i> Build Bracket`;
    }
  }

  function resetBracketPicks() {
    state.picks = {};
    closeVoteModal();
    renderApp();
    if (state.rounds.length) {
      setStatus("Tournament picks reset.", "success");
    }
  }

  async function init() {
    const initialClientId = getStoredClientId();
    if (initialClientId && !localStorage.getItem(CLIENT_ID_KEY)) {
      saveClientId(initialClientId);
    }
    clientIdInput.value = initialClientId;
    setDebug([
      `Client ID: ${initialClientId || "(missing)"}`,
      `Redirect URI: ${REDIRECT_URI}`,
      `Scopes requested: ${SCOPES}`,
      "",
      "No diagnostics yet. Build a bracket or reconnect Spotify to inspect the current account and playlist access steps.",
    ]);
    state.auth = loadAuth();
    updateAuthUi();
    renderApp();

    await syncSpotifyAuthState();

    if (state.auth?.access_token && !state.auth.user_name) {
      getValidAccessToken()
        .then((token) => fetchCurrentUserProfile(token))
        .then((profile) => {
          const userName = profile?.display_name || profile?.id || "";
          if (!userName) return;
          saveAuth({ ...state.auth, user_name: userName, user_country: profile?.country || "" });
          updateAuthUi();
        })
        .catch(() => {});
    }
  }

  saveClientBtn.addEventListener("click", () => {
    const clientId = String(clientIdInput.value || "").trim();
    if (!clientId) {
      setStatus("Paste a Spotify Client ID before saving.", "error");
      return;
    }
    saveClientId(clientId);
    setStatus("Spotify Client ID saved locally in this browser.", "success");
  });

  connectBtn.addEventListener("click", () => {
    beginSpotifyAuth().catch((errorObj) => {
      setStatus(errorObj.message || "Could not start Spotify sign-in.", "error");
    });
  });

  disconnectBtn.addEventListener("click", () => {
    clearAuth();
    updateAuthUi();
    setStatus("Spotify connection cleared from this device.", "success");
  });

  buildBracketBtn.addEventListener("click", () => {
    buildBracketFromPlaylist();
  });

  resetBracketBtn.addEventListener("click", () => {
    resetBracketPicks();
  });

  roundStage.addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-round]");
    if (!button) return;
    const roundIndex = Number(button.getAttribute("data-open-round"));
    if (!Number.isFinite(roundIndex)) return;
    openRoundModal(roundIndex);
  });

  voteMatchup.addEventListener("click", (event) => {
    const button = event.target.closest("[data-vote-side]");
    if (!button || state.activeRoundIndex === null) return;
    const side = String(button.getAttribute("data-vote-side"));
    const context = getCurrentModalContext();
    if (!context || context.matchIndex === null) return;
    if (side !== "left" && side !== "right") return;
    setMatchWinner(state.activeRoundIndex, context.matchIndex, side);
  });

  votePrevBtn.addEventListener("click", () => {
    advanceActiveSelection(-1);
  });

  voteNextBtn.addEventListener("click", () => {
    advanceActiveSelection(1);
  });

  voteModalCloseBtn.addEventListener("click", () => {
    closeVoteModal();
  });

  voteModal.addEventListener("click", (event) => {
    if (event.target === voteModal) {
      closeVoteModal();
    }
  });

  window.addEventListener("pageshow", () => {
    syncSpotifyAuthState().catch(() => {});
  });

  window.addEventListener("focus", () => {
    syncSpotifyAuthState().catch(() => {});
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      syncSpotifyAuthState().catch(() => {});
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!voteModal.classList.contains("open")) return;
    const activeTag = document.activeElement?.tagName || "";
    if (activeTag === "AUDIO" || activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT" || document.activeElement?.closest?.("audio")) {
      return;
    }
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

  init().catch((errorObj) => {
    setStatus(errorObj.message || "Could not initialize Spotify tournaments.", "error");
  });
})();
