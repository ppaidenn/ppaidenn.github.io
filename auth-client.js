(() => {
  const SUPABASE_URL = "https://irauuqhqqkctcwulqzsw.supabase.co";
  const SUPABASE_KEY = "sb_publishable_93dGo8oZILIYg9NSotz9MQ_T8v22oXR";
  const DEFAULT_AVATAR_URL = "/images/default_pfp.jpg";
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
    return window.__paidenAuthClient;
  }

  function normalizeUsername(username, email = "") {
    const raw = String(username || "").trim();
    if (raw) return raw.slice(0, 80);
    const emailPrefix = String(email || "").split("@")[0].trim();
    return (emailPrefix || "User").slice(0, 80);
  }

  function profileFromUser(user, fallback = {}) {
    const meta = user && user.user_metadata ? user.user_metadata : {};
    const email = String((fallback.email || user?.email || "")).trim();
    return {
      id: user?.id,
      username: normalizeUsername(fallback.username || meta.username, email),
      email: email || null,
      avatar_url: String(fallback.avatarUrl || meta.avatar_url || DEFAULT_AVATAR_URL).trim() || DEFAULT_AVATAR_URL,
      bio: String(fallback.bio || meta.bio || "").trim() || null,
      silly_question: String(fallback.sillyQuestion || meta.silly_question || "").trim() || null,
      silly_answer: String(fallback.sillyAnswer || meta.silly_answer || "").trim() || null,
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
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedUsername = normalizeUsername(username, normalizedEmail);
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
      username: normalizedUsername,
      silly_question: sillyQuestion,
      security_question: String(securityQuestion || "").trim(),
      security_answer: String(securityAnswer || "").trim(),
    };
    const { data, error } = await client.auth.signUp({
      email: normalizedEmail,
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

    let resolvedEmail = rawIdentifier;
    if (!rawIdentifier.includes("@")) {
      const { data: rpcEmail, error: rpcError } = await client.rpc("get_signin_email_by_username", {
        target_username: rawIdentifier,
      });
      if (rpcError) return { ok: false, error: rpcError.message || "Could not resolve username." };
      resolvedEmail = String(rpcEmail || "").trim();
      if (!resolvedEmail) return { ok: false, error: "Username not found." };
    }

    const { data, error } = await client.auth.signInWithPassword({
      email: resolvedEmail,
      password: String(password || ""),
    });
    if (error) return { ok: false, error: error.message || "Could not sign in." };
    const user = data?.user || null;
    const session = data?.session || null;
    // Avoid overwriting existing profile fields (e.g., avatar_url) on every sign-in.
    // Missing profiles are created lazily in getCurrentProfile().
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
      .select("id,username,email,avatar_url,bio,silly_question,silly_answer,security_question,security_answer")
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
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) return { ok: false, error: sessionError.message || "Could not load session." };
    const user = sessionData?.session?.user || null;
    if (!user) return { ok: false, error: "Not signed in." };

    const update = {};
    if (Object.prototype.hasOwnProperty.call(patch, "username")) {
      const normalized = normalizeUsername(patch.username, user.email || "");
      if (!normalized) return { ok: false, error: "Username is required." };
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
    return { ok: true };
  }

  window.PaidenAuth = {
    getClient: requireClient,
    createAccount,
    signIn,
    signOut,
    getCurrentProfile,
    updateProfile,
    sillyQuestionBank: [...SILLY_QUESTION_BANK],
  };
})();
