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
    slotEntrants: [],
    bracketSize: 0,
    picks: {},
  };

  const clientIdInput = document.getElementById("spotifyClientIdInput");
  const saveClientBtn = document.getElementById("saveSpotifyClientBtn");
  const connectBtn = document.getElementById("spotifyConnectBtn");
  const disconnectBtn = document.getElementById("spotifyDisconnectBtn");
  const authPill = document.getElementById("spotifyAuthPill");
  const playlistInput = document.getElementById("playlistInput");
  const bracketSizeSelect = document.getElementById("bracketSizeSelect");
  const buildBracketBtn = document.getElementById("buildBracketBtn");
  const resetBracketBtn = document.getElementById("resetBracketBtn");
  const statusCard = document.getElementById("statusCard");
  const statusText = document.getElementById("statusText");
  const playlistPreview = document.getElementById("playlistPreview");
  const bracketBoard = document.getElementById("bracketBoard");
  const championChip = document.getElementById("championChip");
  const debugOutput = document.getElementById("debugOutput");

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

  async function fetchCurrentUser(accessToken) {
    const me = await spotifyFetch("/me", accessToken);
    return me?.display_name || me?.id || "";
  }

  async function handleSpotifyRedirect() {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    if (!code && !error) return;

    if (error) {
      setStatus(`Spotify sign-in was not completed: ${error}`, "error");
      url.searchParams.delete("error");
      history.replaceState({}, "", url.pathname);
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
      const userName = await fetchCurrentUser(accessToken).catch(() => "");
      saveAuth({ ...state.auth, user_name: userName });
      setStatus(userName ? `Spotify connected as ${userName}.` : "Spotify connected.", "success");
    } catch (errorObj) {
      clearAuth();
      setStatus(errorObj.message || "Could not complete Spotify sign-in.", "error");
    } finally {
      url.searchParams.delete("code");
      history.replaceState({}, "", url.pathname);
    }
  }

  function smallestPowerOfTwoAtOrAbove(value) {
    let size = 1;
    while (size < value) size *= 2;
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

  async function fetchPlaylistItems(playlistId, accessToken) {
    const playlist = await spotifyFetch(`/playlists/${playlistId}`, accessToken, {
      fields: "id,name,description,owner(display_name,id),images(url),external_urls.spotify,items(total)",
    });

    const rawTracks = [];
    let nextUrl = `${SPOTIFY_API}/playlists/${playlistId}/items?limit=100&offset=0&additional_types=track&fields=items(item(id,name,popularity,artists(name),album(images),external_urls.spotify,preview_url,is_local,type)),next,total`;

    while (nextUrl) {
      const data = await spotifyFetchUrl(nextUrl, accessToken);
      const items = Array.isArray(data.items) ? data.items : [];
      items.forEach((item) => {
        const track = item?.item || item?.track;
        if (!track || track.is_local || track.type !== "track" || !track.id) return;
        rawTracks.push({
          id: track.id,
          name: track.name || "Untitled track",
          popularity: Number(track.popularity) || 0,
          artists: Array.isArray(track.artists) ? track.artists.map((artist) => artist?.name).filter(Boolean) : [],
          image: track.album?.images?.[0]?.url || "",
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

    const rankedTracks = deduped
      .map((track) => ({
        ...track,
        popularity: Number(track.popularity) || 0,
      }))
      .sort((a, b) => {
        if (b.popularity !== a.popularity) return b.popularity - a.popularity;
        return a.name.localeCompare(b.name);
      });

    return { playlist, tracks: rankedTracks };
  }

  function clearBracketState() {
    state.playlist = null;
    state.entrants = [];
    state.slotEntrants = [];
    state.bracketSize = 0;
    state.picks = {};
    renderPlaylistPreview();
    renderBracket();
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

  function getRoundCount() {
    return state.bracketSize ? Math.log2(state.bracketSize) : 0;
  }

  function getMatchCompetitor(roundIndex, matchIndex, side) {
    if (!state.slotEntrants.length) return null;
    if (roundIndex === 0) {
      const slotIndex = matchIndex * 2 + (side === "left" ? 0 : 1);
      return state.slotEntrants[slotIndex] || null;
    }
    const previousMatchIndex = matchIndex * 2 + (side === "left" ? 0 : 1);
    return getMatchWinner(roundIndex - 1, previousMatchIndex);
  }

  function getMatchWinner(roundIndex, matchIndex) {
    const left = getMatchCompetitor(roundIndex, matchIndex, "left");
    const right = getMatchCompetitor(roundIndex, matchIndex, "right");
    if (left && !right) return left;
    if (right && !left) return right;
    const pick = state.picks[`${roundIndex}:${matchIndex}`];
    if (!pick) return null;
    return getMatchCompetitor(roundIndex, matchIndex, pick);
  }

  function clearLaterRounds(startRound) {
    Object.keys(state.picks).forEach((key) => {
      const roundIndex = Number(String(key).split(":")[0]);
      if (roundIndex >= startRound) delete state.picks[key];
    });
  }

  function setMatchWinner(roundIndex, matchIndex, side) {
    state.picks[`${roundIndex}:${matchIndex}`] = side;
    clearLaterRounds(roundIndex + 1);
    renderBracket();
  }

  function roundLabel(roundIndex, totalRounds) {
    if (roundIndex === totalRounds - 1) return "Final";
    if (roundIndex === totalRounds - 2) return "Semifinals";
    if (roundIndex === totalRounds - 3) return "Quarterfinals";
    return `Round ${roundIndex + 1}`;
  }

  function renderPlaylistPreview() {
    if (!state.playlist || !state.entrants.length || !state.bracketSize) {
      playlistPreview.innerHTML = `<div class="empty-state">No playlist loaded yet. Once you build a bracket, this panel will show the playlist cover, owner, seed size, and top-ranked tracks.</div>`;
      return;
    }

    const topSeeds = state.entrants.slice(0, Math.min(state.bracketSize, 8));
    const cover = state.playlist.images?.[0]?.url || "";
    const seedButtons = topSeeds.map((track) => `
      <button class="seed-option" type="button">
        <span class="seed-rank">${track.seed}</span>
        <span class="seed-copy">
          <span class="seed-track">${escapeHtml(track.name)}</span>
          <span class="seed-artist">${escapeHtml(track.artists.join(", "))}</span>
        </span>
        <span class="seed-score">Pop ${track.popularity}</span>
      </button>
    `).join("");

    playlistPreview.innerHTML = `
      <div class="playlist-head">
        ${cover ? `<img class="playlist-cover" src="${cover}" alt="">` : `<div class="playlist-cover" aria-hidden="true"></div>`}
        <div>
          <h3 class="playlist-title">${escapeHtml(state.playlist.name || "Spotify playlist")}</h3>
          <p class="playlist-meta">Owner: ${escapeHtml(state.playlist.owner?.display_name || state.playlist.owner?.id || "Unknown")} · ${state.entrants.length} ranked tracks · ${state.bracketSize}-slot bracket${state.bracketSize > state.entrants.length ? ` with ${state.bracketSize - state.entrants.length} byes` : ""}</p>
          ${state.playlist.external_urls?.spotify ? `<p class="playlist-meta"><a class="spotify-link" href="${state.playlist.external_urls.spotify}" target="_blank" rel="noopener">Open playlist on Spotify</a></p>` : ""}
        </div>
      </div>
      <div class="seed-strip">
        ${seedButtons}
      </div>
    `;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderChampion() {
    const totalRounds = getRoundCount();
    const champion = totalRounds ? getMatchWinner(totalRounds - 1, 0) : null;
    const strong = champion
      ? `${champion.name} · ${champion.artists.join(", ")}`
      : "No winner selected yet";
    championChip.innerHTML = `<span>Champion</span><strong>${escapeHtml(strong)}</strong>`;
  }

  function renderBracket() {
    renderChampion();
    if (!state.bracketSize || !state.slotEntrants.length) {
      bracketBoard.innerHTML = `<div class="empty-state">Build a playlist bracket to render the tournament board here.</div>`;
      return;
    }

    const totalRounds = getRoundCount();
    const roundHtml = [];

    for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
      const matchesInRound = state.bracketSize / Math.pow(2, roundIndex + 1);
      const matchHtml = [];
      for (let matchIndex = 0; matchIndex < matchesInRound; matchIndex += 1) {
        const left = getMatchCompetitor(roundIndex, matchIndex, "left");
        const right = getMatchCompetitor(roundIndex, matchIndex, "right");
        const winner = state.picks[`${roundIndex}:${matchIndex}`] || "";
        matchHtml.push(renderMatch(roundIndex, matchIndex, left, right, winner));
      }
      roundHtml.push(`
        <section class="bracket-round">
          <div class="round-label">${roundLabel(roundIndex, totalRounds)}</div>
          ${matchHtml.join("")}
        </section>
      `);
    }

    bracketBoard.innerHTML = roundHtml.join("");
  }

  function renderMatch(roundIndex, matchIndex, left, right, winner) {
    return `
      <div class="match-card">
        ${renderCompetitorButton(roundIndex, matchIndex, "left", left, winner === "left")}
        ${renderCompetitorButton(roundIndex, matchIndex, "right", right, winner === "right")}
      </div>
    `;
  }

  function renderCompetitorButton(roundIndex, matchIndex, side, competitor, isWinner) {
    if (!competitor) {
      const label = roundIndex === 0 ? "Bye" : "Waiting on earlier round";
      return `
        <button class="match-competitor" type="button" disabled>
          <div class="match-track">
            <span class="match-seed">${roundIndex === 0 ? "BYE" : "-"}</span>
            <span class="match-name">${roundIndex === 0 ? "Automatic advance" : "TBD"}</span>
          </div>
          <div class="match-meta"><span>${label}</span></div>
        </button>
      `;
    }

    return `
      <button
        class="match-competitor${isWinner ? " winner" : ""}"
        type="button"
        data-round="${roundIndex}"
        data-match="${matchIndex}"
        data-side="${side}"
      >
        <div class="match-track">
          <span class="match-seed">${competitor.seed}</span>
          <span class="match-name">${escapeHtml(competitor.name)}</span>
        </div>
        <div class="match-meta">
          <span>${escapeHtml(competitor.artists.join(", "))}</span>
          <span>Pop ${competitor.popularity}</span>
        </div>
      </button>
    `;
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
        throw new Error("This playlist does not have enough Spotify tracks to build a bracket.");
      }

      const resolvedSize = resolveBracketSize(tracks.length, bracketSizeSelect.value);
      if (!resolvedSize) {
        throw new Error("Not enough ranked tracks to build a power-of-two bracket.");
      }

      const selectedTracks = tracks.map((track, index) => ({
        ...track,
        seed: index + 1,
      }));
      const slotEntrants = buildSeedOrder(resolvedSize).map((seed) => selectedTracks[seed - 1]);

      state.playlist = playlist;
      state.entrants = selectedTracks;
      state.slotEntrants = slotEntrants;
      state.bracketSize = resolvedSize;
      state.picks = {};

      renderPlaylistPreview();
      renderBracket();

      const byeCount = Math.max(0, resolvedSize - selectedTracks.length);
      const requested = bracketSizeSelect.value;
      if (byeCount > 0) {
        setStatus(`Bracket built from ${playlist.name}. Included all ${selectedTracks.length} songs in a ${resolvedSize}-slot bracket with ${byeCount} byes.`, "success");
      } else if (requested !== "auto" && Number(requested) !== resolvedSize) {
        setStatus(`Bracket built from ${playlist.name}. Expanded the bracket to ${resolvedSize} slots so all ${selectedTracks.length} songs are included.`, "success");
      } else {
        setStatus(`Bracket built from ${playlist.name}. Included all ${selectedTracks.length} songs and seeded them by Spotify popularity.`, "success");
      }
    } catch (errorObj) {
      clearBracketState();
      if (errorObj?.spotifyStatus === 401) {
        clearAuth();
        updateAuthUi();
        setStatus("Spotify session expired or was rejected. Reconnect Spotify, then try building the bracket again.", "error");
      } else if (errorObj?.spotifyStatus === 403) {
        if (String(errorObj?.spotifyUrl || "").includes("/tracks")) {
          setStatus("Spotify denied the follow-up track popularity lookup. The bracket builder has been updated to avoid that extra call; refresh the page and try again.", "error");
        } else {
          setStatus("Spotify denied access to that playlist. If it is private or collaborative, reconnect Spotify and make sure the signed-in Spotify account can open that playlist.", "error");
        }
      } else {
        setStatus(errorObj.message || "Could not build the bracket.", "error");
      }
    } finally {
      buildBracketBtn.disabled = false;
      buildBracketBtn.innerHTML = `<i class="fa-solid fa-bracket-curly" aria-hidden="true"></i> Build Bracket`;
    }
  }

  function resetBracketPicks() {
    state.picks = {};
    renderBracket();
    if (state.bracketSize) {
      setStatus("Bracket picks reset.", "success");
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

    await handleSpotifyRedirect();
    updateAuthUi();

    if (state.auth?.access_token && !state.auth.user_name) {
      getValidAccessToken()
        .then((token) => fetchCurrentUser(token))
        .then((userName) => {
          if (!userName) return;
          saveAuth({ ...state.auth, user_name: userName });
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

  bracketBoard.addEventListener("click", (event) => {
    const button = event.target.closest("[data-round][data-match][data-side]");
    if (!button) return;
    const roundIndex = Number(button.getAttribute("data-round"));
    const matchIndex = Number(button.getAttribute("data-match"));
    const side = String(button.getAttribute("data-side"));
    if (!Number.isFinite(roundIndex) || !Number.isFinite(matchIndex) || (side !== "left" && side !== "right")) return;
    setMatchWinner(roundIndex, matchIndex, side);
  });

  init().catch((errorObj) => {
    setStatus(errorObj.message || "Could not initialize Spotify tournaments.", "error");
  });
})();

