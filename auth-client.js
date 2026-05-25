(() => {
  const SUPABASE_URL = "https://irauuqhqqkctcwulqzsw.supabase.co";
  const SUPABASE_KEY = "sb_publishable_93dGo8oZILIYg9NSotz9MQ_T8v22oXR";
  const DEFAULT_AVATAR_URL = "/images/default_pfp.jpg";
  const AUTH_LAST_SEEN_KEY = "paiden_auth_last_seen_at";
  let authLifecycleBound = false;
  let authRefreshInFlight = null;
  const RESERVED_PROFILE_ROUTES = new Set([
    "resume",
    "photos",
    "blog",
    "contactme",
    "contact_me",
    "profile",
    "profile-view",
    "accounts",
    "auth-tools",
    "signin",
    "create-account",
    "forgot-password",
    "reset-password",
    "event-invite",
    "tournaments",
    "bracket-builder",
    "all-tournaments",
    "finances",
    "trivia",
    "spotify-app-setup",
    "tomi-p-shrine",
    "notifications",
    "news",
    "images",
    "backend",
    "calendar",
    "manifest.webmanifest",
    "favicon.ico",
    "robots.txt",
    "sitemap.xml",
    "cdn-cgi",
  ]);
  const SILLY_QUESTION_BANK = [
    "If your socks had names, what are they?",
    "Which snack would survive a zombie apocalypse with you?",
    "What would your pet say in your job interview?",
    "If your laugh had a ringtone, what would it be called?",
    "What is your go-to dance move at 2 AM?",
    "If your fridge had a personality, describe it.",
    "What useless superpower would you choose?",
    "What would be the title of your accidental autobiography?",
    "What food best matches your mood on Mondays?",
    "If your backpack could talk, what would it complain about?",
  ];

  function requireClient() {
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error("Supabase client library not loaded.");
    }
    if (!window.__paidenAuthClient) {
      window.__paidenAuthClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    }
    bindAuthLifecycle(window.__paidenAuthClient);
    return window.__paidenAuthClient;
  }

  function markSessionSeen(session) {
    try {
      if (session && session.user && session.user.id) {
        localStorage.setItem(AUTH_LAST_SEEN_KEY, String(Date.now()));
      } else {
        localStorage.removeItem(AUTH_LAST_SEEN_KEY);
      }
    } catch (_) {
      // Non-fatal storage issue.
    }
  }

  function bindAuthLifecycle(client) {
    if (!client || authLifecycleBound) return;
    authLifecycleBound = true;

    client.auth.onAuthStateChange((_event, session) => {
      markSessionSeen(session || null);
    });

    const refreshIfPossible = async () => {
      if (authRefreshInFlight) return authRefreshInFlight;
      authRefreshInFlight = (async () => {
        try {
          const { data } = await client.auth.getSession();
          if (data?.session) {
            await client.auth.refreshSession().catch(() => {});
          }
        } finally {
          authRefreshInFlight = null;
        }
      })();
      return authRefreshInFlight;
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          refreshIfPossible().catch(() => {});
        }
      });
    }

    if (typeof window !== "undefined") {
      window.addEventListener("focus", () => {
        refreshIfPossible().catch(() => {});
      });
    }
  }

  async function getRecoveredSession() {
    const client = requireClient();
    let { data, error } = await client.auth.getSession();
    if (error) return { ok: false, error: error.message || "Could not load session.", session: null, user: null };
    if (data?.session?.user) {
      markSessionSeen(data.session);
      return { ok: true, session: data.session, user: data.session.user };
    }

    await new Promise((resolve) => setTimeout(resolve, 180));
    ({ data, error } = await client.auth.getSession());
    if (error) return { ok: false, error: error.message || "Could not load session.", session: null, user: null };
    if (data?.session?.user) {
      markSessionSeen(data.session);
      return { ok: true, session: data.session, user: data.session.user };
    }

    try {
      const refresh = await client.auth.refreshSession();
      const session = refresh?.data?.session || null;
      if (session?.user) {
        markSessionSeen(session);
        return { ok: true, session, user: session.user };
      }
    } catch (_) {
      // No recoverable session.
    }

    markSessionSeen(null);
    return { ok: true, session: null, user: null };
  }

  function sanitizeUsernameCandidate(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9_-]+/g, "")
      .slice(0, 80);
  }

  function makeFallbackUsername(email = "") {
    const emailPrefix = String(email || "").split("@")[0].trim();
    let candidate = sanitizeUsernameCandidate(emailPrefix) || "user";
    if (candidate.length < 3) candidate = `${candidate}user`.slice(0, 80);
    if (RESERVED_PROFILE_ROUTES.has(candidate)) candidate = `${candidate}_user`.slice(0, 80);
    return candidate;
  }

  function normalizeUsername(username, email = "") {
    const normalized = sanitizeUsernameCandidate(username);
    return normalized || makeFallbackUsername(email);
  }

  function validateUsername(username, email = "") {
    const raw = String(username || "").trim();
    if (!raw) return { ok: false, error: "Username is required." };
    if (/\s/.test(raw)) {
      return { ok: false, error: "Username cannot contain spaces." };
    }
    const normalized = normalizeUsername(raw, email);
    if (!normalized) return { ok: false, error: "Username is required." };
    if (!/^[a-z0-9_-]{3,80}$/.test(normalized)) {
      return { ok: false, error: "Username must be 3-80 characters using letters, numbers, hyphens, or underscores." };
    }
    if (RESERVED_PROFILE_ROUTES.has(normalized)) {
      return { ok: false, error: "That username is reserved by the site." };
    }
    return { ok: true, normalized };
  }

  function profileFromUser(user, fallback = {}) {
    const meta = user && user.user_metadata ? user.user_metadata : {};
    const email = String((fallback.email || user?.email || "")).trim();
    return {
      id: user?.id,
      full_name: String(fallback.fullName || meta.full_name || "").trim() || null,
      username: normalizeUsername(fallback.username || meta.username, email),
      email: email || null,
      avatar_url: String(fallback.avatarUrl || meta.avatar_url || DEFAULT_AVATAR_URL).trim() || DEFAULT_AVATAR_URL,
      bio: String(fallback.bio || meta.bio || "").trim() || null,
      personal_links: normalizePersonalLinks(fallback.personalLinks ?? meta.personal_links ?? []),
      silly_question: String(fallback.sillyQuestion || meta.silly_question || "").trim() || null,
      silly_answer: String(fallback.sillyAnswer || meta.silly_answer || "").trim() || null,
      security_question: String(fallback.securityQuestion || meta.security_question || "").trim() || null,
      security_answer: String(fallback.securityAnswer || meta.security_answer || "").trim() || null,
    };
  }

  function normalizePersonalLinks(input) {
    const source = Array.isArray(input) ? input : String(input || "").split(/\r?\n/);
    const unique = [];
    source.forEach((entry) => {
      const trimmed = String(entry || "").trim();
      if (!trimmed) return;
      const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      if (!/^https?:\/\/\S+$/i.test(normalized)) return;
      if (!unique.includes(normalized)) unique.push(normalized);
    });
    return unique.slice(0, 8);
  }

  async function upsertProfileForUser(user, fallback = {}) {
    if (!user || !user.id) return { ok: false, error: "No authenticated user." };
    const client = requireClient();
    const profile = profileFromUser(user, fallback);
    const { error } = await client.from("profiles").upsert(profile, { onConflict: "id" });
    if (error) return { ok: false, error: error.message || "Could not save profile." };
    return { ok: true, profile };
  }

  function triggerNotificationSubscriptionSync() {
    try {
      if (window.PaidenNotify && typeof window.PaidenNotify.syncCurrentSubscription === "function") {
        window.PaidenNotify.syncCurrentSubscription().catch(() => {});
      }
    } catch (_) {
      // Non-fatal.
    }
  }

  async function createAccount({ fullName, username, email, password, securityQuestion, securityAnswer, redirectTo }) {
    const client = requireClient();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const fullNameValue = String(fullName || "").trim();
    const usernameValidation = validateUsername(username, normalizedEmail);
    if (!usernameValidation.ok) return { ok: false, error: usernameValidation.error };
    const normalizedUsername = usernameValidation.normalized;
    const sillyQuestion = SILLY_QUESTION_BANK[Math.floor(Math.random() * SILLY_QUESTION_BANK.length)];
    const { data: usernameTaken, error: usernameTakenError } = await client.rpc("is_signup_username_taken", {
      target_username: normalizedUsername,
    });
    if (usernameTakenError) {
      return { ok: false, error: usernameTakenError.message || "Could not verify username." };
    }
    if (usernameTaken === true) {
      return { ok: false, error: "That username is already taken." };
    }

    const { data: emailTaken, error: emailTakenError } = await client.rpc("is_signup_email_taken", {
      target_email: normalizedEmail,
    });
    if (emailTakenError) {
      return { ok: false, error: emailTakenError.message || "Could not verify email." };
    }
    if (emailTaken === true) {
      return { ok: false, error: "That email is already linked to an account." };
    }

    const payload = {
      full_name: fullNameValue || null,
      username: normalizedUsername,
      silly_question: sillyQuestion,
      security_question: String(securityQuestion || "").trim(),
      security_answer: String(securityAnswer || "").trim(),
    };
    const { data, error } = await client.auth.signUp({
      email: normalizedEmail,
      password: String(password || ""),
      options: {
        data: payload,
        emailRedirectTo: String(redirectTo || `${window.location.origin}/profile`).trim(),
      },
    });
    if (error) {
      const msg = String(error.message || "");
      if (msg.toLowerCase().includes("profiles_username_lower_unique")) {
        return { ok: false, error: "That username is already taken." };
      }
      return { ok: false, error: msg || "Could not create account." };
    }

    const user = data?.user || null;
    const session = data?.session || null;
    if (user && session) {
      const saved = await upsertProfileForUser(user, {
        username: payload.username,
        fullName: payload.full_name,
        email,
        sillyQuestion: payload.silly_question,
        securityQuestion: payload.security_question,
        securityAnswer: payload.security_answer,
      });
      if (!saved.ok) {
        const saveErr = String(saved.error || "");
        if (saveErr.toLowerCase().includes("profiles_username_lower_unique")) {
          return { ok: false, error: "That username is already taken." };
        }
        return saved;
      }
      triggerNotificationSubscriptionSync();
      return { ok: true, user, session, requiresEmailConfirmation: false };
    }

    return {
      ok: true,
      user,
      session,
      requiresEmailConfirmation: true,
      message: "Account created. Check your email for the confirmation link, then sign in.",
    };
  }

  async function signIn({ email, username, password }) {
    const client = requireClient();
    const rawIdentifier = String(username || email || "").trim();
    if (!rawIdentifier) return { ok: false, error: "Username is required." };

    const emailResult = await resolveEmailForIdentifier(rawIdentifier);
    if (!emailResult.ok) return emailResult;
    const resolvedEmail = emailResult.email;

    const { data, error } = await client.auth.signInWithPassword({
      email: resolvedEmail,
      password: String(password || ""),
    });
    if (error) return { ok: false, error: error.message || "Could not sign in." };
    const user = data?.user || null;
    const session = data?.session || null;
    // Avoid overwriting existing profile fields (e.g., avatar_url) on every sign-in.
    // Missing profiles are created lazily in getCurrentProfile().
    if (session?.user) triggerNotificationSubscriptionSync();
    return { ok: true, user, session };
  }

  async function resolveEmailForIdentifier(rawIdentifier) {
    const client = requireClient();
    const identifier = String(rawIdentifier || "").trim();
    if (!identifier) return { ok: false, error: "Username or email is required." };
    if (identifier.includes("@")) {
      return { ok: true, email: identifier.toLowerCase() };
    }
    const { data: rpcEmail, error: rpcError } = await client.rpc("get_signin_email_by_username", {
      target_username: identifier,
    });
    if (rpcError) return { ok: false, error: rpcError.message || "Could not resolve username." };
    const resolvedEmail = String(rpcEmail || "").trim().toLowerCase();
    if (!resolvedEmail) return { ok: false, error: "Username not found." };
    return { ok: true, email: resolvedEmail };
  }

  async function getCurrentProfile() {
    const client = requireClient();
    const sessionResult = await getRecoveredSession();
    if (!sessionResult.ok) return { ok: false, error: sessionResult.error || "Could not load session." };
    const user = sessionResult.user || null;
    if (!user) return { ok: true, user: null, profile: null };

    let { data: profile, error } = await client
      .from("profiles")
      .select("id,full_name,username,email,avatar_url,bio,personal_links,silly_question,silly_answer,security_question,security_answer")
      .eq("id", user.id)
      .maybeSingle();

    if (error) return { ok: false, error: error.message || "Could not load profile." };

    if (!profile) {
      const saved = await upsertProfileForUser(user);
      if (!saved.ok) return saved;
      profile = saved.profile;
    }

    return { ok: true, user, profile };
  }

  async function updateProfile(patch = {}) {
    const client = requireClient();
    const sessionResult = await getRecoveredSession();
    if (!sessionResult.ok) return { ok: false, error: sessionResult.error || "Could not load session." };
    const user = sessionResult.user || null;
    if (!user) return { ok: false, error: "Not signed in." };

    const update = {};
    if (Object.prototype.hasOwnProperty.call(patch, "full_name")) {
      update.full_name = String(patch.full_name || "").trim() || null;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "username")) {
      const usernameValidation = validateUsername(patch.username, user.email || "");
      if (!usernameValidation.ok) return { ok: false, error: usernameValidation.error };
      const normalized = usernameValidation.normalized;
      const { data: existingUsername, error: existingUsernameError } = await client
        .from("profiles")
        .select("id")
        .ilike("username", normalized)
        .neq("id", user.id)
        .limit(1);
      if (existingUsernameError) {
        return { ok: false, error: existingUsernameError.message || "Could not verify username." };
      }
      if (Array.isArray(existingUsername) && existingUsername.length > 0) {
        return { ok: false, error: "That username is already taken." };
      }
      update.username = normalized;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "avatar_url")) {
      update.avatar_url = String(patch.avatar_url || "").trim() || null;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "bio")) {
      update.bio = String(patch.bio || "").trim() || null;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "personal_links")) {
      const normalizedLinks = normalizePersonalLinks(patch.personal_links);
      update.personal_links = normalizedLinks.length ? normalizedLinks : null;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "silly_answer")) {
      update.silly_answer = String(patch.silly_answer || "").trim() || null;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "security_question")) {
      update.security_question = String(patch.security_question || "").trim() || null;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "security_answer")) {
      update.security_answer = String(patch.security_answer || "").trim() || null;
    }

    const { error } = await client.from("profiles").update(update).eq("id", user.id);
    if (error) {
      const msg = String(error.message || "");
      if (msg.toLowerCase().includes("profiles_username_lower_unique")) {
        return { ok: false, error: "That username is already taken." };
      }
      return { ok: false, error: msg || "Could not update profile." };
    }
    return getCurrentProfile();
  }

  async function signOut() {
    const client = requireClient();
    const { error } = await client.auth.signOut();
    if (error) return { ok: false, error: error.message || "Could not sign out." };
    markSessionSeen(null);
    return { ok: true };
  }

  async function requestPasswordReset({ identifier, redirectTo }) {
    const client = requireClient();
    const emailResult = await resolveEmailForIdentifier(identifier);
    if (!emailResult.ok) return emailResult;
    const { error } = await client.auth.resetPasswordForEmail(emailResult.email, {
      redirectTo: String(redirectTo || `${window.location.origin}/reset-password`).trim(),
    });
    if (error) return { ok: false, error: error.message || "Could not send password reset email." };
    return { ok: true };
  }

  async function updatePassword(newPassword) {
    const client = requireClient();
    const password = String(newPassword || "");
    if (password.length < 8) {
      return { ok: false, error: "Password must be at least 8 characters." };
    }
    const { data, error } = await client.auth.updateUser({ password });
    if (error) return { ok: false, error: error.message || "Could not update password." };
    return { ok: true, data };
  }

  async function getAccessToken() {
    const sessionResult = await getRecoveredSession();
    if (!sessionResult.ok) return "";
    return sessionResult.session?.access_token || "";
  }

  async function invokeEdgeFunction(name, payload = {}) {
    const client = requireClient();
    const token = await getAccessToken();
    const headers = {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token || SUPABASE_KEY}`,
    };
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload || {}),
    });
    const text = await res.text().catch(() => "");
    let json = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch (_) {
      json = {};
    }
    if (!res.ok) {
      return { ok: false, error: json?.error || text || `Could not call ${name}.` };
    }
    return { ok: true, data: json };
  }

  window.PaidenAuth = {
    getClient: requireClient,
    createAccount,
    signIn,
    signOut,
    requestPasswordReset,
    updatePassword,
    getAccessToken,
    invokeEdgeFunction,
    getCurrentProfile,
    updateProfile,
    reservedProfileRoutes: [...RESERVED_PROFILE_ROUTES],
    sillyQuestionBank: [...SILLY_QUESTION_BANK],
  };
})();
