function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

async function getSharedSpotifyAccessToken(env) {
  const clientId = String(env.SPOTIFY_SHARED_CLIENT_ID || "").trim();
  const clientSecret = String(env.SPOTIFY_SHARED_CLIENT_SECRET || "").trim();
  const refreshToken = String(env.SPOTIFY_SHARED_REFRESH_TOKEN || "").trim();

  if (!clientId || !clientSecret || !refreshToken) {
    const error = new Error("Shared Spotify mode is not configured on the server.");
    error.status = 503;
    throw error;
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const authHeader = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      authorization: `Basic ${authHeader}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    const error = new Error(data.error_description || data.error || "Could not refresh the shared Spotify account.");
    error.status = response.status || 502;
    error.spotifyStatus = response.status || 502;
    throw error;
  }
  return data.access_token;
}

async function spotifyJson(path, accessToken, searchParams = null) {
  const url = /^https?:\/\//i.test(path)
    ? new URL(path)
    : new URL(`https://api.spotify.com/v1${path}`);
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });
  }
  const response = await fetch(url.toString(), {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error?.message || data.error_description || "Spotify request failed.");
    error.status = response.status || 502;
    error.spotifyStatus = response.status || 502;
    error.spotifyPayload = data;
    error.spotifyUrl = url.toString();
    throw error;
  }
  return data;
}

async function loadSharedSpotifyPlaylist(playlistId, env) {
  const accessToken = await getSharedSpotifyAccessToken(env);
  const diagnostics = [
    "Spotify App Mode: paiden.com shared Spotify account",
    `Playlist ID: ${playlistId}`,
    "",
  ];

  const me = await spotifyJson("/me", accessToken);
  diagnostics.push("[OK] /me");
  diagnostics.push(`Shared Spotify account: ${me.display_name || "(no display name)"}`);
  diagnostics.push(`Shared Spotify user id: ${me.id || "(missing)"}`);
  diagnostics.push("");

  const playlist = await spotifyJson(`/playlists/${playlistId}`, accessToken, {
    fields: "id,name,description,public,collaborative,owner(display_name,id),images(url),external_urls.spotify,items(total)",
  });
  diagnostics.push(`[OK] /playlists/${playlistId}`);
  diagnostics.push(`Playlist name: ${playlist.name || "(unknown)"}`);
  diagnostics.push(`Playlist owner: ${playlist.owner?.display_name || playlist.owner?.id || "(unknown)"}`);
  diagnostics.push(`Playlist owner id: ${playlist.owner?.id || "(missing)"}`);
  diagnostics.push(`Public: ${String(playlist.public)}`);
  diagnostics.push(`Collaborative: ${String(playlist.collaborative)}`);
  diagnostics.push(`Track count: ${playlist.items?.total ?? "(unknown)"}`);
  diagnostics.push("");

  const tracks = [];
  let nextUrl = `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/items?limit=100&offset=0&additional_types=track&fields=items(item(id,name,artists(name),album(images,release_date),external_urls.spotify,is_local,type)),next,total`;

  while (nextUrl) {
    const page = await spotifyJson(nextUrl, accessToken);
    const items = Array.isArray(page.items) ? page.items : [];
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
    nextUrl = page.next || null;
  }

  diagnostics.push(`[OK] /playlists/${playlistId}/items`);
  diagnostics.push(`Imported songs: ${tracks.length}`);

  return { playlist, tracks, diagnostics };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/spotify/shared/playlist") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return json({ ok: false, error: "Method not allowed." }, 405);
      }
      const playlistId = String(url.searchParams.get("playlist_id") || "").trim();
      if (!playlistId || !/^[A-Za-z0-9]{22}$/.test(playlistId)) {
        return json({ ok: false, error: "A valid Spotify playlist ID is required." }, 400);
      }
      try {
        const data = await loadSharedSpotifyPlaylist(playlistId, env);
        return json({ ok: true, ...data });
      } catch (error) {
        return json({
          ok: false,
          error: error.message || "Could not load the playlist through the shared Spotify account.",
          spotify_status: error.spotifyStatus || error.status || 500,
          spotify_url: error.spotifyUrl || "",
        }, error.status || 500);
      }
    }

    // Username route rewriter for paiden.com
    if (request.method !== "GET" && request.method !== "HEAD") {
      return fetch(request);
    }

    const host = url.hostname.toLowerCase();
    if (host !== "paiden.com" && host !== "www.paiden.com") {
      return fetch(request);
    }

    const path = url.pathname;
    const trimmed = path.replace(/^\/+|\/+$/g, "");

    const allTournamentMatch = path.match(/^\/all-tournaments\/([^/]+)\/?$/i);
    if (allTournamentMatch && allTournamentMatch[1].toLowerCase() !== "view") {
      const rewritten = new URL(url.toString());
      rewritten.pathname = "/all-tournaments/view/index.html";
      rewritten.search = "";
      rewritten.searchParams.set("slug", decodeURIComponent(allTournamentMatch[1]));
      return fetch(new Request(rewritten.toString(), request));
    }

    if (!trimmed || trimmed.includes("/")) {
      return fetch(request);
    }

    if (/\.[a-z0-9]+$/i.test(trimmed)) {
      return fetch(request);
    }

    const reserved = new Set([
      "resume",
      "photos",
      "blog",
      "contactme",
      "contact_me",
      "profile",
      "profile-view",
      "accounts",
      "signin",
      "create-account",
      "forgot-password",
      "reset-password",
      "event-invite",
      "tournaments",
      "bracket-builder",
      "all-tournaments",
      "tomi-p-shrine",
      "notifications",
      "news",
      "images",
      "backend",
      "cdn-cgi",
      "manifest.webmanifest",
      "favicon.ico",
      "robots.txt",
      "sitemap.xml",
    ]);

    if (reserved.has(trimmed.toLowerCase())) {
      return fetch(request);
    }

    const rewritten = new URL(url.toString());
    rewritten.pathname = "/profile-view";
    rewritten.search = "";
    rewritten.searchParams.set("username", trimmed);

    return fetch(new Request(rewritten.toString(), request));
  },
};
