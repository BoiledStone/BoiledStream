(function () {
  const config = window.BOILED_SUPABASE;
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

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

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

  function getDisplayName(user) {
    const name =
      currentProfile?.display_name ||
      user?.user_metadata?.display_name ||
      user?.email?.split("@")[0] ||
      "Utilisateur";
    return String(name).trim().slice(0, 40) || "Utilisateur";
  }

  function renderAvatar(profile, name, className = "avatar") {
    if (profile?.avatar_url) {
      return `<span class="${className}"><img src="${escapeHtml(profile.avatar_url)}" alt=""></span>`;
    }

    return `<span class="${className}" aria-hidden="true">${escapeHtml(getInitials(name))}</span>`;
  }

  function setText(node, value) {
    if (node) {
      node.textContent = value;
    }
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
      display_name: profile.display_name,
      avatar_url: profile.avatar_url || null
    };
  }

  function getAuthPanel() {
    return document.querySelector("#auth-panel");
  }

  function getFocusableAuthNodes() {
    const panel = getAuthPanel();
    if (!panel || panel.hidden) {
      return [];
    }

    return [...panel.querySelectorAll("button, input, textarea, select, a[href]")]
      .filter((node) => !node.disabled && node.offsetParent !== null);
  }

  function setAuthMode(mode) {
    authMode = mode;
    const isSignup = mode === "signup";
    const isProfile = mode === "profile";
    const title = document.querySelector("#auth-title");
    const authForm = document.querySelector("#auth-form");
    const profileForm = document.querySelector("#profile-form");
    const nameRow = document.querySelector("#auth-name-row");
    const authSubmit = document.querySelector("#auth-submit");
    const password = document.querySelector("#auth-password");
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
    if (authSubmit) {
      authSubmit.textContent = isSignup ? "Créer le compte" : "Connexion";
    }
    if (password) {
      password.autocomplete = isSignup ? "new-password" : "current-password";
      password.placeholder = isSignup ? "6 caractères minimum" : "Mot de passe";
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

    const name = getDisplayName(currentSession.user);
    const profileName = document.querySelector("#profile-name");
    const avatarPreview = document.querySelector("#profile-avatar-preview");
    if (profileName) {
      profileName.value = name;
    }
    if (avatarPreview) {
      avatarPreview.innerHTML = renderAvatar(currentProfile, name, "avatar avatar-large");
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
            <p class="section-kicker">Compte BoiledStream</p>
            <h2 id="auth-title">Connexion</h2>

            <form class="auth-form" id="auth-form">
              <label id="auth-name-row" hidden>
                <span>Pseudo</span>
                <input id="auth-name" type="text" autocomplete="nickname" maxlength="40" placeholder="Pseudo affiché">
              </label>
              <label>
                <span>Email</span>
                <input id="auth-email" type="email" autocomplete="email" required placeholder="email@exemple.com">
              </label>
              <label>
                <span>Mot de passe</span>
                <input id="auth-password" type="password" autocomplete="current-password" required minlength="6" placeholder="Mot de passe">
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
                <input id="profile-name" type="text" maxlength="40" required>
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
    document.querySelector("#auth-form").addEventListener("submit", handleAuthSubmit);
    document.querySelector("#profile-form").addEventListener("submit", handleProfileSubmit);
    document.querySelector("#profile-avatar").addEventListener("change", handleAvatarPreview);
  }

  function renderAccountControls() {
    if (!accountMount) {
      return;
    }

    if (!supabaseClient) {
      accountMount.innerHTML = `<span class="account-note">Compte indisponible</span>`;
      return;
    }

    if (!currentSession) {
      accountMount.innerHTML = `<button class="account-button" type="button" id="account-open">Connexion</button>`;
      document.querySelector("#account-open").addEventListener("click", () => openAuthPanel("signin"));
      return;
    }

    const name = getDisplayName(currentSession.user);
    accountMount.innerHTML = `
      <button class="profile-button" type="button" id="account-profile" aria-label="Ouvrir les paramètres du profil">
        ${renderAvatar(currentProfile, name)}
        <span>${escapeHtml(name)}</span>
      </button>
      <button class="account-button" type="button" id="account-signout">Déconnexion</button>
    `;
    document.querySelector("#account-profile").addEventListener("click", () => openAuthPanel("profile"));
    document.querySelector("#account-signout").addEventListener("click", async () => {
      await supabaseClient.auth.signOut();
    });
  }

  async function loadProfile(user) {
    if (!user || !supabaseClient) {
      return null;
    }

    // Keep profile creation separate from sign-in so existing users do not lose their pseudo or avatar.
    let { data, error } = await supabaseClient
      .from("profiles")
      .select(profileColumns())
      .eq("id", user.id)
      .maybeSingle();

    if (error && hasAvatarColumn && isMissingAvatarColumnError(error)) {
      hasAvatarColumn = false;
      const fallback = await supabaseClient
        .from("profiles")
        .select(profileColumns())
        .eq("id", user.id)
        .maybeSingle();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.warn("Profil Supabase indisponible:", error.message);
      return null;
    }

    if (data) {
      currentProfile = normalizeProfile(data);
      return currentProfile;
    }

    const displayName = getDisplayName(user);
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

    if (created.error) {
      console.warn("Création du profil impossible:", created.error.message);
      return null;
    }

    currentProfile = normalizeProfile(created.data);
    return currentProfile;
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    const email = document.querySelector("#auth-email").value.trim();
    const password = document.querySelector("#auth-password").value;
    const displayName = document.querySelector("#auth-name").value.trim();
    const authStatus = document.querySelector("#auth-status");
    const isSignup = authMode === "signup";

    if (isSignup && !displayName) {
      setText(authStatus, "Choisis un pseudo pour créer le compte.");
      return;
    }

    setText(authStatus, "Traitement en cours...");

    const response = isSignup
      ? await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.href,
            data: { display_name: displayName.slice(0, 40) }
          }
        })
      : await supabaseClient.auth.signInWithPassword({ email, password });

    if (response.error) {
      setText(authStatus, response.error.message);
      return;
    }

    if (response.data.session) {
      currentSession = response.data.session;
      await loadProfile(currentSession.user);
      closeAuthPanel();
      await refreshCommunity();
    } else {
      setText(authStatus, "Compte créé. Vérifie ton email avant de te connecter.");
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
      upsert: true
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
    const displayName = document.querySelector("#profile-name").value.trim().slice(0, 40);
    const avatarFile = document.querySelector("#profile-avatar").files[0];

    if (!displayName) {
      setText(profileStatus, "Le pseudo est obligatoire.");
      return;
    }

    setText(profileStatus, "Enregistrement...");

    try {
      const avatarUrl = hasAvatarColumn ? await uploadAvatar(avatarFile) : currentProfile?.avatar_url || null;
      const updatePayload = {
        display_name: displayName,
        updated_at: new Date().toISOString()
      };
      if (hasAvatarColumn) {
        updatePayload.avatar_url = avatarUrl;
      }

      let { data, error } = await supabaseClient
        .from("profiles")
        .update(updatePayload)
        .eq("id", currentSession.user.id)
        .select(profileColumns())
        .single();

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
          .single();
        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
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
          ? "Profil mis à jour."
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
      setText(ratingSummary, "Notes indisponibles: exécute supabase-schema.sql dans Supabase.");
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
        : "Aucune note pour ce film."
    );
    setText(ratingStatus, currentSession ? "Clique une étoile pour noter." : "Connecte-toi pour noter.");
    renderStars(Number(myScore));
  }

  async function saveRating(score) {
    if (!currentSession) {
      openAuthPanel("signin");
      return;
    }

    const { error } = await supabaseClient.from("ratings").upsert(
      {
        video_id: getVideoId(),
        user_id: currentSession.user.id,
        score
      },
      { onConflict: "video_id,user_id" }
    );

    setText(ratingStatus, error ? error.message : "Note enregistrée.");
    await loadRatings();
  }

  function renderComments(comments) {
    if (!commentsList) {
      return;
    }

    if (!comments.length) {
      commentsList.innerHTML = `<p class="empty-state">Aucun commentaire pour ce film.</p>`;
      return;
    }

    commentsList.innerHTML = comments
      .map((comment) => {
        const isOwner = currentSession?.user?.id === comment.user_id;
        const author = comment.profiles?.display_name || "Utilisateur";
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
                <strong>${escapeHtml(author)}</strong>
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
  }

  async function loadComments() {
    if (!communitySection || !supabaseClient) {
      return;
    }

    let { data, error } = await supabaseClient
      .from("comments")
      .select(
        hasAvatarColumn
          ? "id, body, user_id, created_at, profiles(display_name, avatar_url)"
          : "id, body, user_id, created_at, profiles(display_name)"
      )
      .eq("video_id", getVideoId())
      .order("created_at", { ascending: false });

    if (error && hasAvatarColumn && isMissingAvatarColumnError(error)) {
      hasAvatarColumn = false;
      const fallback = await supabaseClient
        .from("comments")
        .select("id, body, user_id, created_at, profiles(display_name)")
        .eq("video_id", getVideoId())
        .order("created_at", { ascending: false });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      commentsList.innerHTML = `<p class="empty-state">Commentaires indisponibles: exécute supabase-schema.sql dans Supabase.</p>`;
      return;
    }

    renderComments(data || []);
  }

  async function handleCommentSubmit(event) {
    event.preventDefault();
    if (!currentSession) {
      openAuthPanel("signin");
      return;
    }

    const body = commentBody.value.trim();
    if (!body) {
      setText(commentStatus, "Écris un commentaire avant de publier.");
      return;
    }

    const { error } = await supabaseClient.from("comments").insert({
      video_id: getVideoId(),
      user_id: currentSession.user.id,
      body
    });

    if (error) {
      setText(commentStatus, error.message);
      return;
    }

    commentBody.value = "";
    setText(commentStatus, "Commentaire publié.");
    await loadComments();
  }

  async function deleteComment(id) {
    if (!currentSession) {
      return;
    }

    const { error } = await supabaseClient.from("comments").delete().eq("id", id);
    setText(commentStatus, error ? error.message : "Commentaire supprimé.");
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
