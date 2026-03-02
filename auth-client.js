(() => {
  const SUPABASE_URL = "https://irauuqhqqkctcwulqzsw.supabase.co";
  const SUPABASE_KEY = "sb_publishable_93dGo8oZILIYg9NSotz9MQ_T8v22oXR";

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
    return window.__paidenAuthClient;
  }

  function normalizeUsername(username, email = "") {
    const raw = String(username || "").trim();
    if (raw) return raw.slice(0, 40);
    const emailPrefix = String(email || "").split("@")[0].trim();
    return (emailPrefix || "User").slice(0, 40);
  }

  function profileFromUser(user, fallback = {}) {
    const meta = user && user.user_metadata ? user.user_metadata : {};
    const email = String((fallback.email || user?.email || "")).trim();
    return {
      id: user?.id,
      username: normalizeUsername(fallback.username || meta.username, email),
      email: email || null,
      security_question: String(fallback.securityQuestion || meta.security_question || "").trim() || null,
      security_answer: String(fallback.securityAnswer || meta.security_answer || "").trim() || null,
    };
  }

  async function upsertProfileForUser(user, fallback = {}) {
    if (!user || !user.id) return { ok: false, error: "No authenticated user." };
    const client = requireClient();
    const profile = profileFromUser(user, fallback);
    const { error } = await client.from("profiles").upsert(profile, { onConflict: "id" });
    if (error) return { ok: false, error: error.message || "Could not save profile." };
    return { ok: true, profile };
  }

  async function createAccount({ username, email, password, securityQuestion, securityAnswer }) {
    const client = requireClient();
    const normalizedUsername = normalizeUsername(username, email);
    const { data: existingUsername, error: existingUsernameError } = await client
      .from("profiles")
      .select("id")
      .ilike("username", normalizedUsername)
      .limit(1);
    if (existingUsernameError) {
      return { ok: false, error: existingUsernameError.message || "Could not verify username." };
    }
    if (Array.isArray(existingUsername) && existingUsername.length > 0) {
      return { ok: false, error: "That username is already taken." };
    }

    const payload = {
      username: normalizedUsername,
      security_question: String(securityQuestion || "").trim(),
      security_answer: String(securityAnswer || "").trim(),
    };
    const { data, error } = await client.auth.signUp({
      email: String(email || "").trim(),
      password: String(password || ""),
      options: { data: payload },
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
        email,
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
      return { ok: true, user, session, requiresEmailConfirmation: false };
    }

    return {
      ok: true,
      user,
      session,
      requiresEmailConfirmation: true,
      message: "Account created. Please verify your email, then sign in.",
    };
  }

  async function signIn({ email, password }) {
    const client = requireClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: String(email || "").trim(),
      password: String(password || ""),
    });
    if (error) return { ok: false, error: error.message || "Could not sign in." };
    const user = data?.user || null;
    const session = data?.session || null;
    const saved = await upsertProfileForUser(user, { email });
    if (!saved.ok) return saved;
    return { ok: true, user, session };
  }

  async function getCurrentProfile() {
    const client = requireClient();
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) return { ok: false, error: sessionError.message || "Could not load session." };
    const user = sessionData?.session?.user || null;
    if (!user) return { ok: true, user: null, profile: null };

    let { data: profile, error } = await client
      .from("profiles")
      .select("id,username,email,security_question,security_answer")
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

  async function signOut() {
    const client = requireClient();
    const { error } = await client.auth.signOut();
    if (error) return { ok: false, error: error.message || "Could not sign out." };
    return { ok: true };
  }

  window.PaidenAuth = {
    getClient: requireClient,
    createAccount,
    signIn,
    signOut,
    getCurrentProfile,
  };
})();
