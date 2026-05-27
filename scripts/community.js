(function () {
  const config = window.BOILED_SUPABASE;
  const utils = window.BOILED_UTILS || {};
  const accountMount = document.querySelector("#account-controls");
  const communitySection = document.querySelector("#community-section");
  const ratingSummary = document.querySelector("#rating-summary");
  const ratingStars = document.querySelector("#rating-stars");
  const ratingStatus = document.querySelector("#rating-status");
  const commentForm = document.querySelector("#comment-form");
  const commentBody = document.querySelector("#comment-body");
  const commentStatus = document.querySelector("#comment-status");
  const commentsList = document.querySelector("#comments-list");
  let supabaseClient = null;
  let currentSession = null;
  let currentProfile = null;
  let authMode = "signin";
  let lastFocusedElement = null;
  let hasAvatarColumn = true;
  let profileLoadPromise = null;
  let profileLoadUserId = null;
  let adminUserIds = new Set();
  const passwordRules = [
    {
      label: "12 caractères minimum",
      test: (value) => value.length >= 12
    },
    {
      label: "une minuscule",
      test: (value) => /[a-z]/.test(value)
    },
    {
      label: "une majuscule",
      test: (value) => /[A-Z]/.test(value)
    },
    {
      label: "un chiffre",
      test: (value) => /\d/.test(value)
    },
    {
      label: "un symbole",
      test: (value) => /[^A-Za-z0-9]/.test(value)
    }
  ];

  const escapeHtml = utils.escapeHtml || function escapeHtmlFallback(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  };

  function getVideoId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("video") || window.BOILED_VIDEOS?.[0]?.id || "";
  }

  function getInitials(name) {
    return String(name || "Utilisateur")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  function sanitizeDisplayName(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9 _-]+/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 40);
  }

  function getBaseDisplayName(user) {
    return (
      sanitizeDisplayName(currentProfile?.display_name) ||
      sanitizeDisplayName(user?.user_metadata?.display_name) ||
      sanitizeDisplayName(user?.email?.split("@")[0]) ||
      "Utilisateur"
    );
  }

  function isAdminUser(userId) {
    return Boolean(userId && adminUserIds.has(userId));
  }

  function renderDisplayName(name, userId) {
    const safeName = sanitizeDisplayName(name) || "Utilisateur";
    if (!isAdminUser(userId)) {
      return escapeHtml(safeName);
    }

    return `<span class="admin-prefix">[admin]</span> ${escapeHtml(safeName)}`;
  }

  function renderAvatar(profile, name, className = "avatar") {
    const initials = escapeHtml(getInitials(name));
    if (profile?.avatar_url) {
      return `<span class="${escapeHtml(className)}" data-initials="${initials}"><img src="${escapeHtml(profile.avatar_url)}" alt=""></span>`;
    }

    return `<span class="${escapeHtml(className)}" data-initials="${initials}" aria-hidden="true">${initials}</span>`;
  }

  function setText(node, value) {
    if (node) {
      node.textContent = value;
    }
  }

  function bindAvatarFallbacks(root = document) {
    root.querySelectorAll(".avatar img").forEach((image) => {
      const fallbackToInitials = () => {
        const avatar = image.closest(".avatar");
        if (!avatar) {
          image.remove();
          return;
        }

        avatar.textContent = avatar.dataset.initials || "";
        avatar.setAttribute("aria-hidden", "true");
      };

      image.addEventListener("error", fallbackToInitials, { once: true });
      if (image.complete && image.naturalWidth === 0) {
        fallbackToInitials();
      }
    });
  }

  function isMissingAvatarColumnError(error) {
    return /avatar_url/i.test(error?.message || "") || /avatar_url/i.test(error?.details || "");
  }

  function isMissingAvatarBucketError(error) {
    const message = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
    return message.includes("bucket not found") || message.includes("bucket_not_found");
  }

  function profileColumns() {
    return hasAvatarColumn ? "id, display_name, avatar_url" : "id, display_name";
  }

  function normalizeProfile(profile) {
    if (!profile) {
      return null;
    }

    return {
      id: profile.id,
      display_name: sanitizeDisplayName(profile.display_name) || "Utilisateur",
      avatar_url: profile.avatar_url || null
    };
  }

  function applyLoadedProfile(userId, profile) {
    const normalized = normalizeProfile(profile);
    if (currentSession?.user?.id === userId) {
      currentProfile = normalized;
    }
    return normalized;
  }

  function isNoRowsError(error) {
    return error?.code === "PGRST116" || /0 rows/i.test(error?.message || "");
  }

  function isMissingProfileRelationError(error) {
    const message = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
    return message.includes("foreign key") || message.includes("profiles");
  }

  function profileUnavailableMessage() {
    return "Profil Supabase indisponible. Reconnecte-toi, puis relance supabase-schema.sql si le problème reste.";
  }

  function bindDisplayNameInput(input) {
    input?.addEventListener("input", () => {
      const cleanValue = sanitizeDisplayName(input.value);
      if (input.value !== cleanValue) {
        input.value = cleanValue;
      }
    });
  }

  function getAuthPanel() {
    return document.querySelector("#auth-panel");
  }

  function getPasswordIssues(password) {
    return passwordRules
      .filter((rule) => !rule.test(password))
      .map((rule) => rule.label);
  }

  function renderPasswordRules() {
    const rules = document.querySelector("#password-rules");
    const password = document.querySelector("#auth-password")?.value || "";
    if (!rules) {
      return;
    }

    rules.hidden = authMode !== "signup";
    rules.innerHTML = passwordRules
      .map((rule) => {
        const isMet = rule.test(password);
        return `<span class="${isMet ? "met" : ""}">${escapeHtml(rule.label)}</span>`;
      })
      .join("");
  }

  function validateSignupPassword() {
    const password = document.querySelector("#auth-password");
    if (!password) {
      return true;
    }

    if (authMode !== "signup") {
      password.setCustomValidity("");
      renderPasswordRules();
      return true;
    }

    const issues = getPasswordIssues(password.value);
    const message = issues.length ? `Mot de passe trop faible: ${issues.join(", ")}.` : "";
    password.setCustomValidity(message);
    renderPasswordRules();
    return !message;
  }

  function getFocusableAuthNodes() {
    const panel = getAuthPanel();
    if (!panel || panel.hidden) {
      return [];
    }

    return [...panel.querySelectorAll("button, input, textarea, select, a[href]")]
      .filter((node) => !node.disabled && node.offsetParent !== null);
  }

  function validatePasswordConfirmation() {
    const password = document.querySelector("#auth-password");
    const passwordConfirm = document.querySelector("#auth-password-confirm");
    const passwordIsStrong = validateSignupPassword();
    if (authMode !== "signup" || !password || !passwordConfirm) {
      passwordConfirm?.setCustomValidity("");
      return passwordIsStrong;
    }

    const message =
      password.value === passwordConfirm.value ? "" : "Les mots de passe ne correspondent pas.";
    passwordConfirm.setCustomValidity(message);
    return passwordIsStrong && !message;
  }

  function setAuthMode(mode) {
    authMode = mode;
    const isSignup = mode === "signup";
    const isProfile = mode === "profile";
    const title = document.querySelector("#auth-title");
    const authForm = document.querySelector("#auth-form");
    const profileForm = document.querySelector("#profile-form");
    const nameRow = document.querySelector("#auth-name-row");
    const confirmRow = document.querySelector("#auth-confirm-row");
    const authSubmit = document.querySelector("#auth-submit");
    const password = document.querySelector("#auth-password");
    const passwordConfirm = document.querySelector("#auth-password-confirm");
    const authStatus = document.querySelector("#auth-status");
    const profileStatus = document.querySelector("#profile-status");
    const modeSwitch = document.querySelector("#auth-mode-switch");
    const switchPrompt = document.querySelector("#auth-switch-prompt");
    const switchButton = document.querySelector("#auth-switch-button");

    setText(title, isProfile ? "Paramètres du profil" : isSignup ? "Créer un compte" : "Connexion");
    if (authForm) {
      authForm.hidden = isProfile;
    }
    if (profileForm) {
      profileForm.hidden = !isProfile;
    }
    if (nameRow) {
      nameRow.hidden = !isSignup;
      document.querySelector("#auth-name").required = isSignup;
    }
    if (confirmRow && passwordConfirm) {
      confirmRow.hidden = !isSignup;
      passwordConfirm.required = isSignup;
      passwordConfirm.minLength = isSignup ? 12 : 1;
      passwordConfirm.value = "";
      passwordConfirm.setCustomValidity("");
    }
    if (authSubmit) {
      authSubmit.textContent = isSignup ? "Créer le compte" : "Connexion";
    }
    if (password) {
      password.autocomplete = isSignup ? "new-password" : "current-password";
      password.minLength = isSignup ? 12 : 1;
      password.placeholder = isSignup ? "12 caractères, majuscule, chiffre, symbole" : "Mot de passe";
      password.setCustomValidity("");
    }
    if (passwordConfirm) {
      passwordConfirm.autocomplete = "new-password";
      passwordConfirm.placeholder = "Répéter le mot de passe";
    }
    if (modeSwitch) {
      modeSwitch.hidden = isProfile;
    }
    setText(switchPrompt, isSignup ? "Déjà un compte ?" : "Pas encore de compte ?");
    if (switchButton) {
      switchButton.textContent = isSignup ? "Connexion" : "Inscription";
      switchButton.dataset.authMode = isSignup ? "signin" : "signup";
    }
    setText(authStatus, "");
    setText(profileStatus, "");
    renderPasswordRules();

    if (isProfile) {
      hydrateProfileForm();
    }
  }

  function openAuthPanel(mode = "signin") {
    const panel = getAuthPanel();
    lastFocusedElement = document.activeElement;
    panel?.removeAttribute("hidden");
    panel?.scrollTo(0, 0);
    document.body.classList.add("modal-open");
    setAuthMode(mode);
    const focusTarget = mode === "profile" ? "#profile-name" : "#auth-email";
    document.querySelector(focusTarget)?.focus();
  }

  function closeAuthPanel() {
    getAuthPanel()?.setAttribute("hidden", "");
    document.body.classList.remove("modal-open");
    if (lastFocusedElement instanceof HTMLElement) {
      lastFocusedElement.focus();
    }
  }

  function handleAuthPanelKeydown(event) {
    if (event.key === "Escape") {
      closeAuthPanel();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusableNodes = getFocusableAuthNodes();
    if (!focusableNodes.length) {
      return;
    }

    const firstNode = focusableNodes[0];
    const lastNode = focusableNodes[focusableNodes.length - 1];

    if (event.shiftKey && document.activeElement === firstNode) {
      event.preventDefault();
      lastNode.focus();
    } else if (!event.shiftKey && document.activeElement === lastNode) {
      event.preventDefault();
      firstNode.focus();
    }
  }

  function hydrateProfileForm() {
    if (!currentSession) {
      return;
    }

    const name = getBaseDisplayName(currentSession.user);
    const profileName = document.querySelector("#profile-name");
    const avatarPreview = document.querySelector("#profile-avatar-preview");
    if (profileName) {
      profileName.value = name;
    }
    if (avatarPreview) {
      avatarPreview.innerHTML = renderAvatar(currentProfile, name, "avatar avatar-large");
      bindAvatarFallbacks(avatarPreview);
    }
  }

  function handleAvatarPreview(event) {
    const file = event.target.files[0];
    const avatarPreview = document.querySelector("#profile-avatar-preview");
    const profileStatus = document.querySelector("#profile-status");

    if (!file) {
      hydrateProfileForm();
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      event.target.value = "";
      hydrateProfileForm();
      setText(profileStatus, "Choisis une image jpg, png, webp ou gif.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      event.target.value = "";
      hydrateProfileForm();
      setText(profileStatus, "La photo doit faire 2 Mo maximum.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    if (avatarPreview) {
      avatarPreview.innerHTML = `<span class="avatar avatar-large"><img src="${previewUrl}" alt=""></span>`;
      avatarPreview.querySelector("img")?.addEventListener(
        "load",
        () => URL.revokeObjectURL(previewUrl),
        { once: true }
      );
    }
    setText(profileStatus, "");
  }

  function renderAuthPanel() {
    if (document.querySelector("#auth-panel")) {
      return;
    }

    document.body.insertAdjacentHTML(
      "beforeend",
      `
        <div class="auth-panel" id="auth-panel" hidden>
          <div class="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
            <button class="auth-close" type="button" id="auth-close" aria-label="Fermer">×</button>
            <p class="section-kicker">Espace membre</p>
            <h2 id="auth-title">Connexion</h2>

            <form class="auth-form" id="auth-form">
              <label id="auth-name-row" hidden>
                <span>Pseudo</span>
                <input id="auth-name" type="text" autocomplete="nickname" maxlength="40" pattern="[A-Za-z0-9 _-]{1,40}" title="Lettres, chiffres, espaces, tirets et underscores seulement" placeholder="Pseudo affiché">
              </label>
              <label>
                <span>Email</span>
                <input id="auth-email" type="email" autocomplete="email" required placeholder="email@exemple.com">
              </label>
              <label>
                <span>Mot de passe</span>
                <input id="auth-password" type="password" autocomplete="current-password" required minlength="1" title="Inscription: 12 caractères minimum, minuscule, majuscule, chiffre et symbole." placeholder="Mot de passe">
              </label>
              <p class="password-rules" id="password-rules" hidden></p>
              <label id="auth-confirm-row" hidden>
                <span>Confirmer le mot de passe</span>
                <input id="auth-password-confirm" type="password" autocomplete="new-password" minlength="12" placeholder="Répéter le mot de passe">
              </label>
              <button class="button primary" id="auth-submit" type="submit">Connexion</button>
              <p class="community-status" id="auth-status" aria-live="polite"></p>
              <p class="auth-mode-switch" id="auth-mode-switch">
                <span id="auth-switch-prompt">Pas encore de compte ?</span>
                <button type="button" id="auth-switch-button" data-auth-mode="signup">Inscription</button>
              </p>
            </form>

            <form class="profile-form" id="profile-form" hidden>
              <div class="profile-preview" id="profile-avatar-preview"></div>
              <label>
                <span>Pseudo</span>
                <input id="profile-name" type="text" maxlength="40" pattern="[A-Za-z0-9 _-]{1,40}" title="Lettres, chiffres, espaces, tirets et underscores seulement" required>
              </label>
              <label>
                <span>Photo de profil</span>
                <input id="profile-avatar" type="file" accept="image/png,image/jpeg,image/webp,image/gif">
              </label>
              <button class="button primary" type="submit">Enregistrer</button>
              <p class="community-status" id="profile-status" aria-live="polite"></p>
            </form>
          </div>
        </div>
      `
    );

    document.querySelector("#auth-close").addEventListener("click", closeAuthPanel);
    document.querySelector("#auth-panel").addEventListener("click", (event) => {
      if (event.target.id === "auth-panel") {
        closeAuthPanel();
      }
    });
    document.querySelector("#auth-panel").addEventListener("keydown", handleAuthPanelKeydown);
    document.querySelector("#auth-switch-button").addEventListener("click", (event) => {
      setAuthMode(event.currentTarget.dataset.authMode);
    });
    bindDisplayNameInput(document.querySelector("#auth-name"));
    bindDisplayNameInput(document.querySelector("#profile-name"));
    document.querySelector("#auth-password").addEventListener("input", validatePasswordConfirmation);
    document.querySelector("#auth-password-confirm").addEventListener("input", validatePasswordConfirmation);
    document.querySelector("#auth-form").addEventListener("submit", handleAuthSubmit);
    document.querySelector("#profile-form").addEventListener("submit", handleProfileSubmit);
    document.querySelector("#profile-avatar").addEventListener("change", handleAvatarPreview);
  }

  function renderAccountControls() {
    if (!accountMount) {
      return;
    }

    if (!supabaseClient) {
      accountMount.innerHTML = `<span class="account-note">Compte hors ligne</span>`;
      return;
    }

    if (!currentSession) {
      accountMount.innerHTML = `<button class="account-button" type="button" id="account-open">Connexion</button>`;
      document.querySelector("#account-open").addEventListener("click", () => openAuthPanel("signin"));
      return;
    }

    const name = getBaseDisplayName(currentSession.user);
    accountMount.innerHTML = `
      <button class="profile-button" type="button" id="account-profile" aria-label="Ouvrir les paramètres du profil">
        ${renderAvatar(currentProfile, name)}
        <span class="display-name">${renderDisplayName(name, currentSession.user.id)}</span>
      </button>
      <button class="account-button" type="button" id="account-signout">Déconnexion</button>
    `;
    bindAvatarFallbacks(accountMount);
    document.querySelector("#account-profile").addEventListener("click", () => openAuthPanel("profile"));
    document.querySelector("#account-signout").addEventListener("click", async () => {
      await supabaseClient.auth.signOut();
    });
  }

  async function fetchProfile(userId) {
    let { data, error } = await supabaseClient
      .from("profiles")
      .select(profileColumns())
      .eq("id", userId)
      .maybeSingle();

    if (error && hasAvatarColumn && isMissingAvatarColumnError(error)) {
      hasAvatarColumn = false;
      const fallback = await supabaseClient
        .from("profiles")
        .select(profileColumns())
        .eq("id", userId)
        .maybeSingle();
      data = fallback.data;
      error = fallback.error;
    }

    return { data, error };
  }

  function isDuplicateProfileError(error) {
    return error?.code === "23505" || /duplicate key/i.test(error?.message || "");
  }

  async function loadProfileNow(user) {
    const selected = await fetchProfile(user.id);
    if (selected.error) {
      console.warn("Profil Supabase indisponible:", selected.error.message);
      return null;
    }

    if (selected.data) {
      return applyLoadedProfile(user.id, selected.data);
    }

    // Auth state changes can fire at the same time as the submit handler.
    // If both paths create the row, the loser re-reads instead of breaking the session.
    const displayName = getBaseDisplayName(user);
    let created = await supabaseClient
      .from("profiles")
      .insert({ id: user.id, display_name: displayName })
      .select(profileColumns())
      .single();

    if (created.error && hasAvatarColumn && isMissingAvatarColumnError(created.error)) {
      hasAvatarColumn = false;
      created = await supabaseClient
        .from("profiles")
        .insert({ id: user.id, display_name: displayName })
        .select(profileColumns())
        .single();
    }

    if (created.error && isDuplicateProfileError(created.error)) {
      const retry = await fetchProfile(user.id);
      if (!retry.error && retry.data) {
        return applyLoadedProfile(user.id, retry.data);
      }
    }

    if (created.error) {
      console.warn("Création du profil impossible:", created.error.message);
      return null;
    }

    return applyLoadedProfile(user.id, created.data);
  }

  async function loadProfile(user) {
    if (!user || !supabaseClient) {
      return null;
    }

    if (!profileLoadPromise || profileLoadUserId !== user.id) {
      profileLoadUserId = user.id;
      profileLoadPromise = loadProfileNow(user).finally(() => {
        if (profileLoadUserId === user.id) {
          profileLoadPromise = null;
          profileLoadUserId = null;
        }
      });
    }

    return profileLoadPromise;
  }

  async function ensureProfileForWrite(statusNode) {
    if (!currentSession) {
      return false;
    }

    if (currentProfile) {
      return true;
    }

    const profile = await loadProfile(currentSession.user);
    if (profile) {
      renderAccountControls();
      return true;
    }

    setText(statusNode, profileUnavailableMessage());
    return false;
  }

  async function loadAdminUsers() {
    if (!supabaseClient) {
      return;
    }

    const { data, error } = await supabaseClient.from("admin_users").select("user_id");
    if (error) {
      console.warn("Liste admin Supabase indisponible:", error.message);
      adminUserIds = new Set();
      return;
    }

    adminUserIds = new Set((data || []).map((row) => row.user_id));
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    const email = document.querySelector("#auth-email").value.trim();
    const password = document.querySelector("#auth-password").value;
    const displayName = sanitizeDisplayName(document.querySelector("#auth-name").value);
    const authStatus = document.querySelector("#auth-status");
    const isSignup = authMode === "signup";

    if (isSignup && !displayName) {
      setText(authStatus, "Choisis un pseudo avec lettres, chiffres, espaces, - ou _.");
      return;
    }

    if (isSignup && !validatePasswordConfirmation()) {
      const passwordIssues = getPasswordIssues(password);
      setText(
        authStatus,
        passwordIssues.length
          ? `Mot de passe trop faible: ${passwordIssues.join(", ")}.`
          : "Les mots de passe ne correspondent pas."
      );
      (passwordIssues.length ? document.querySelector("#auth-password") : document.querySelector("#auth-password-confirm"))
        .reportValidity();
      return;
    }

    setText(authStatus, isSignup ? "Création du compte..." : "Connexion en cours...");

    const response = isSignup
      ? await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.href,
            data: { app_name: "BoiledStream", display_name: displayName.slice(0, 40) }
          }
        })
      : await supabaseClient.auth.signInWithPassword({ email, password });

    if (response.error) {
      setText(authStatus, response.error.message);
      return;
    }

    if (response.data.session) {
      currentSession = response.data.session;
      const profile = await loadProfile(currentSession.user);
      if (!profile) {
        setText(authStatus, profileUnavailableMessage());
        await refreshCommunity();
        return;
      }
      closeAuthPanel();
      await refreshCommunity();
    } else {
      setText(authStatus, "Compte créé. Vérifie ton email, puis reviens te connecter.");
    }
  }

  async function uploadAvatar(file) {
    if (!file) {
      return currentProfile?.avatar_url || null;
    }

    if (!hasAvatarColumn) {
      throw new Error(
        "La base Supabase n'a pas encore la colonne avatar_url. Relance supabase-schema.sql dans Supabase."
      );
    }

    // The SQL storage policy mirrors these client-side limits.
    const extensionsByType = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif"
    };
    const extension = extensionsByType[file.type];

    if (!extension) {
      throw new Error("Choisis une image jpg, png, webp ou gif.");
    }

    if (file.size > 2 * 1024 * 1024) {
      throw new Error("La photo doit faire 2 Mo maximum.");
    }

    const path = `${currentSession.user.id}/avatar-${Date.now()}.${extension}`;
    const { error } = await supabaseClient.storage.from("avatars").upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false
    });

    if (error) {
      if (isMissingAvatarBucketError(error)) {
        throw new Error(
          "Le bucket Supabase avatars n'existe pas encore. Exécute le fichier supabase-schema.sql au complet dans Supabase."
        );
      }

      throw error;
    }

    return supabaseClient.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    if (!currentSession) {
      return;
    }

    const profileStatus = document.querySelector("#profile-status");
    const displayName = sanitizeDisplayName(document.querySelector("#profile-name").value);
    const avatarFile = document.querySelector("#profile-avatar").files[0];

    if (!displayName) {
      setText(profileStatus, "Le pseudo doit contenir lettres, chiffres, espaces, - ou _.");
      return;
    }

    setText(profileStatus, "Mise à jour du profil...");

    try {
      if (!(await ensureProfileForWrite(profileStatus))) {
        return;
      }

      const avatarUrl = hasAvatarColumn ? await uploadAvatar(avatarFile) : currentProfile?.avatar_url || null;
      const updatePayload = {
        display_name: displayName,
        updated_at: new Date().toISOString()
      };
      if (hasAvatarColumn && avatarFile) {
        updatePayload.avatar_url = avatarUrl;
      }

      let { data, error } = await supabaseClient
        .from("profiles")
        .update(updatePayload)
        .eq("id", currentSession.user.id)
        .select(profileColumns())
        .maybeSingle();

      if (!error && !data) {
        const insertPayload = {
          id: currentSession.user.id,
          display_name: displayName
        };
        if (hasAvatarColumn && avatarUrl) {
          insertPayload.avatar_url = avatarUrl;
        }

        const inserted = await supabaseClient
          .from("profiles")
          .insert(insertPayload)
          .select(profileColumns())
          .single();
        data = inserted.data;
        error = inserted.error;
      }

      if (error && hasAvatarColumn && isMissingAvatarColumnError(error)) {
        hasAvatarColumn = false;
        const fallback = await supabaseClient
          .from("profiles")
          .update({
            display_name: displayName,
            updated_at: new Date().toISOString()
          })
          .eq("id", currentSession.user.id)
          .select(profileColumns())
          .maybeSingle();
        data = fallback.data;
        error = fallback.error;
      }

      if (error || !data) {
        if (!data || isNoRowsError(error)) {
          throw new Error(profileUnavailableMessage());
        }
        throw error;
      }

      currentProfile = normalizeProfile(data);
      document.querySelector("#profile-avatar").value = "";
      hydrateProfileForm();
      renderAccountControls();
      await loadComments();
      setText(
        profileStatus,
        hasAvatarColumn
          ? "Profil enregistré."
          : "Pseudo mis à jour. Relance supabase-schema.sql dans Supabase pour activer la photo."
      );
    } catch (error) {
      setText(profileStatus, error.message || "Mise à jour impossible.");
    }
  }

  function renderStars(myScore) {
    if (!ratingStars) {
      return;
    }

    ratingStars.innerHTML = [1, 2, 3, 4, 5]
      .map(
        (score) => `
          <button
            class="star-button${myScore >= score ? " active" : ""}"
            type="button"
            data-score="${score}"
            aria-label="Noter ${score} sur 5"
          >★</button>
        `
      )
      .join("");
  }

  async function loadRatings() {
    if (!communitySection || !supabaseClient) {
      return;
    }

    const videoId = getVideoId();
    const { data, error } = await supabaseClient
      .from("ratings")
      .select("score, user_id")
      .eq("video_id", videoId);

    if (error) {
      setText(ratingSummary, "Score indisponible: exécute supabase-schema.sql dans Supabase.");
      renderStars(0);
      return;
    }

    const scores = data || [];
    const count = scores.length;
    const average = count
      ? scores.reduce((total, item) => total + Number(item.score || 0), 0) / count
      : 0;
    const myScore = currentSession
      ? scores.find((item) => item.user_id === currentSession.user.id)?.score || 0
      : 0;

    setText(
      ratingSummary,
      count
        ? `${average.toFixed(1)} / 5 avec ${count} vote${count > 1 ? "s" : ""}`
        : "Pas encore de score."
    );
    setText(ratingStatus, currentSession ? "Choisis une étoile pour noter." : "Connecte-toi pour noter.");
    renderStars(Number(myScore));
  }

  async function saveRating(score) {
    if (!currentSession) {
      openAuthPanel("signin");
      return;
    }

    if (!(await ensureProfileForWrite(ratingStatus))) {
      return;
    }

    const ratingPayload = {
      video_id: getVideoId(),
      user_id: currentSession.user.id,
      score
    };
    const ratingOptions = { onConflict: "video_id,user_id" };
    let { error } = await supabaseClient.from("ratings").upsert(ratingPayload, ratingOptions);

    if (error && isMissingProfileRelationError(error)) {
      currentProfile = null;
      if (await ensureProfileForWrite(ratingStatus)) {
        ({ error } = await supabaseClient.from("ratings").upsert(ratingPayload, ratingOptions));
      }
    }

    setText(ratingStatus, error ? error.message : "Score enregistré.");
    await loadRatings();
  }

  function renderComments(comments) {
    if (!commentsList) {
      return;
    }

    if (!comments.length) {
      commentsList.innerHTML = `<p class="empty-state">Aucun avis pour le moment.</p>`;
      return;
    }

    commentsList.innerHTML = comments
      .map((comment) => {
        const isOwner = currentSession?.user?.id === comment.user_id;
        const author = sanitizeDisplayName(comment.profiles?.display_name) || "Utilisateur";
        const avatar = renderAvatar(comment.profiles, author, "avatar avatar-comment");
        const date = new Date(comment.created_at).toLocaleDateString("fr-CA", {
          year: "numeric",
          month: "short",
          day: "numeric"
        });

        return `
          <article class="comment-item">
            <div class="comment-heading">
              <div class="comment-author">
                ${avatar}
                <strong>${renderDisplayName(author, comment.user_id)}</strong>
              </div>
              <span>${escapeHtml(date)}</span>
            </div>
            <p>${escapeHtml(comment.body)}</p>
            ${
              isOwner
                ? `<button class="comment-delete" type="button" data-comment-id="${comment.id}">Supprimer</button>`
                : ""
            }
          </article>
        `;
      })
      .join("");
    bindAvatarFallbacks(commentsList);
  }

  async function loadComments() {
    if (!communitySection || !supabaseClient) {
      return;
    }

    const { data, error } = await supabaseClient
      .from("comments")
      .select("id, body, user_id, created_at")
      .eq("video_id", getVideoId())
      .order("created_at", { ascending: false });

    if (error) {
      commentsList.innerHTML = `<p class="empty-state">Avis indisponibles: exécute supabase-schema.sql dans Supabase.</p>`;
      return;
    }

    const comments = data || [];
    const userIds = [...new Set(comments.map((comment) => comment.user_id).filter(Boolean))];
    const profilesById = new Map();

    if (userIds.length) {
      let profiles = await supabaseClient
        .from("profiles")
        .select(profileColumns())
        .in("id", userIds);

      if (profiles.error && hasAvatarColumn && isMissingAvatarColumnError(profiles.error)) {
        hasAvatarColumn = false;
        profiles = await supabaseClient
          .from("profiles")
          .select(profileColumns())
          .in("id", userIds);
      }

      if (profiles.error) {
        console.warn("Profils des avis indisponibles:", profiles.error.message);
      } else {
        (profiles.data || []).forEach((profile) => {
          profilesById.set(profile.id, normalizeProfile(profile));
        });
      }
    }

    renderComments(
      comments.map((comment) => ({
        ...comment,
        profiles: profilesById.get(comment.user_id) || null
      }))
    );
  }

  async function handleCommentSubmit(event) {
    event.preventDefault();
    if (!currentSession) {
      openAuthPanel("signin");
      return;
    }

    const body = commentBody.value.trim();
    if (!body) {
      setText(commentStatus, "Écris un avis avant de publier.");
      return;
    }

    if (!(await ensureProfileForWrite(commentStatus))) {
      return;
    }

    const commentPayload = {
      video_id: getVideoId(),
      user_id: currentSession.user.id,
      body
    };
    let { error } = await supabaseClient.from("comments").insert(commentPayload);

    if (error && isMissingProfileRelationError(error)) {
      currentProfile = null;
      if (await ensureProfileForWrite(commentStatus)) {
        ({ error } = await supabaseClient.from("comments").insert(commentPayload));
      }
    }

    if (error) {
      setText(commentStatus, error.message);
      return;
    }

    commentBody.value = "";
    setText(commentStatus, "Avis publié.");
    await loadComments();
  }

  async function deleteComment(id) {
    if (!currentSession) {
      return;
    }

    const { error } = await supabaseClient.from("comments").delete().eq("id", id);
    setText(commentStatus, error ? error.message : "Avis supprimé.");
    await loadComments();
  }

  async function refreshCommunity() {
    renderAccountControls();
    if (!communitySection) {
      return;
    }

    if (commentForm) {
      commentForm.hidden = !currentSession;
      const loginNote = document.querySelector("#comment-login-note");
      if (loginNote) {
        loginNote.hidden = Boolean(currentSession);
      }
    }

    await Promise.all([loadRatings(), loadComments()]);
  }

  async function init() {
    renderAuthPanel();

    if (!config?.url || !config?.anonKey || !window.supabase) {
      renderAccountControls();
      if (communitySection) {
        communitySection.classList.add("is-disabled");
      }
      return;
    }

    supabaseClient = window.supabase.createClient(config.url, config.anonKey);
    await loadAdminUsers();
    const { data } = await supabaseClient.auth.getSession();
    currentSession = data.session;
    if (currentSession) {
      await loadProfile(currentSession.user);
    }

    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      currentSession = session;
      if (currentSession) {
        await loadProfile(currentSession.user);
      } else {
        currentProfile = null;
        profileLoadPromise = null;
        profileLoadUserId = null;
      }
      await refreshCommunity();
    });

    ratingStars?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-score]");
      if (button) {
        saveRating(Number(button.dataset.score));
      }
    });

    commentForm?.addEventListener("submit", handleCommentSubmit);
    commentsList?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-comment-id]");
      if (button) {
        deleteComment(button.dataset.commentId);
      }
    });

    await refreshCommunity();
  }

  init();
})();
