(() => {
  const createForm = document.getElementById("createAccountForm");
  const signInForm = document.getElementById("signInForm");
  const forgotPasswordForm = document.getElementById("forgotPasswordForm");
  const resetPasswordForm = document.getElementById("resetPasswordForm");
  const statusEl = document.getElementById("authStatus");

  function setStatus(message, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.style.color = isError ? "#a10000" : "rgba(17,17,17,0.8)";
  }

  function setButtonPending(button, pending, idleText) {
    if (!button) return;
    button.disabled = !!pending;
    button.textContent = pending ? "Please wait..." : idleText;
  }

  const createPasswordEl = document.getElementById("password");
  const createToggleEl = document.getElementById("toggleCreatePassword");
  if (createPasswordEl && createToggleEl) {
    createToggleEl.addEventListener("change", () => {
      createPasswordEl.type = createToggleEl.checked ? "text" : "password";
    });
  }

  if (createForm) {
    createForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!window.PaidenAuth) return setStatus("Auth service unavailable.", true);

      const fullName = (document.getElementById("full-name")?.value || "").trim();
      const username = (document.getElementById("username")?.value || "").trim();
      const email = (document.getElementById("email")?.value || "").trim();
      const password = document.getElementById("password")?.value || "";
      const securityQuestion = (document.getElementById("security-question")?.value || "").trim();
      const securityAnswer = (document.getElementById("security-answer")?.value || "").trim();
      const submitBtn = document.getElementById("createAccountSubmit");

      if (!fullName || !username || !email || !password || !securityQuestion || !securityAnswer) {
        return setStatus("Please complete every field.", true);
      }
      if (password.length < 8) {
        return setStatus("Password must be at least 8 characters.", true);
      }

      setButtonPending(submitBtn, true, "Create Account");
      setStatus("");
      const res = await window.PaidenAuth.createAccount({
        fullName,
        username,
        email,
        password,
        securityQuestion,
        securityAnswer,
      });
      setButtonPending(submitBtn, false, "Create Account");

      if (!res.ok) return setStatus(res.error || "Could not create account.", true);
      if (res.requiresEmailConfirmation) {
        setStatus("Account created. Check your email for the confirmation link, then sign in. If you do not see it, check spam or junk.");
        window.setTimeout(() => { window.location.href = "/signin"; }, 1200);
      } else {
        setStatus("Account created and signed in. Redirecting to profile...");
        window.setTimeout(() => { window.location.href = "/profile/?v=20260304"; }, 800);
      }
    });
  }

  if (signInForm) {
    signInForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!window.PaidenAuth) return setStatus("Auth service unavailable.", true);

      const username = (document.getElementById("signin-username")?.value || "").trim();
      const password = document.getElementById("password")?.value || "";
      const submitBtn = document.getElementById("signInSubmit");

      if (!username || !password) {
        return setStatus("Please enter your username and password.", true);
      }

      setButtonPending(submitBtn, true, "Sign In");
      setStatus("");
      const res = await window.PaidenAuth.signIn({ username, password });
      setButtonPending(submitBtn, false, "Sign In");

      if (!res.ok) return setStatus(res.error || "Could not sign in.", true);
      setStatus("Signed in. Redirecting to blog...");
      window.setTimeout(() => { window.location.href = "/blog"; }, 700);
    });
  }

  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!window.PaidenAuth) return setStatus("Auth service unavailable.", true);

      const identifier = (document.getElementById("reset-identifier")?.value || "").trim();
      const submitBtn = document.getElementById("forgotPasswordSubmit");
      if (!identifier) {
        return setStatus("Please enter your username or email.", true);
      }

      setButtonPending(submitBtn, true, "Send Reset Email");
      setStatus("");
      const res = await window.PaidenAuth.requestPasswordReset({
        identifier,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setButtonPending(submitBtn, false, "Send Reset Email");

      if (!res.ok) return setStatus(res.error || "Could not send password reset email.", true);
      setStatus("Reset email sent. Check your inbox for the recovery link. If you do not see it, check spam or junk.");
    });
  }

  if (resetPasswordForm) {
    resetPasswordForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!window.PaidenAuth) return setStatus("Auth service unavailable.", true);

      const password = document.getElementById("reset-password")?.value || "";
      const confirmPassword = document.getElementById("reset-password-confirm")?.value || "";
      const submitBtn = document.getElementById("resetPasswordSubmit");

      if (!password || !confirmPassword) {
        return setStatus("Please complete both password fields.", true);
      }
      if (password !== confirmPassword) {
        return setStatus("Passwords do not match.", true);
      }
      if (password.length < 8) {
        return setStatus("Password must be at least 8 characters.", true);
      }

      setButtonPending(submitBtn, true, "Save New Password");
      setStatus("");
      const res = await window.PaidenAuth.updatePassword(password);
      setButtonPending(submitBtn, false, "Save New Password");

      if (!res.ok) return setStatus(res.error || "Could not update password.", true);
      setStatus("Password updated. Redirecting to sign in...");
      window.setTimeout(() => { window.location.href = "/signin"; }, 1000);
    });
  }

  if (!createForm && !signInForm && !forgotPasswordForm && !resetPasswordForm && statusEl) {
    statusEl.textContent = "";
  }
})();
