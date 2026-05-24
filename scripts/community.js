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

  function getDisplayName(user) {
    const name =
      currentProfile?.display_name ||
      user?.user_metadata?.display_name ||
      user?.email?.split("@")[0] ||
      "Utilisateur";
    return String(name).trim().slice(0, 40) || "Utilisateur";
  }

  function setText(node, value) {
    if (node) {
      node.textContent = value;
    }
  }

  function openAuthPanel() {
    document.querySelector("#auth-panel")?.removeAttribute("hidden");
    document.querySelector("#auth-email")?.focus();
  }

  function closeAuthPanel() {
    document.querySelector("#auth-panel")?.setAttribute("hidden", "");
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
              <label>
                <span>Nom public</span>
                <input id="auth-name" type="text" autocomplete="nickname" maxlength="40" placeholder="Pseudo affiché">
              </label>
              <label>
                <span>Email</span>
                <input id="auth-email" type="email" autocomplete="email" required placeholder="email@exemple.com">
              </label>
              <label>
                <span>Mot de passe</span>
                <input id="auth-password" type="password" autocomplete="current-password" required minlength="6" placeholder="6 caractères minimum">
              </label>
              <div class="auth-actions">
                <button class="button primary" type="submit" data-auth-action="signin">Connexion</button>
                <button class="button secondary" type="submit" data-auth-action="signup">Créer un compte</button>
              </div>
              <p class="community-status" id="auth-status" aria-live="polite"></p>
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
    document.querySelector("#auth-form").addEventListener("submit", handleAuthSubmit);
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
      document.querySelector("#account-open").addEventListener("click", openAuthPanel);
      return;
    }

    const name = getDisplayName(currentSession.user);
    accountMount.innerHTML = `
      <span class="account-name">${escapeHtml(name)}</span>
      <button class="account-button" type="button" id="account-signout">Déconnexion</button>
    `;
    document.querySelector("#account-signout").addEventListener("click", async () => {
      await supabaseClient.auth.signOut();
    });
  }

  async function ensureProfile(user) {
    if (!user || !supabaseClient) {
      return null;
    }

    const displayName = getDisplayName(user);
    const { data, error } = await supabaseClient
      .from("profiles")
      .upsert(
        {
          id: user.id,
          display_name: displayName,
          updated_at: new Date().toISOString()
        },
        { onConflict: "id" }
      )
      .select("id, display_name")
      .single();

    if (error) {
      console.warn("Profil Supabase indisponible:", error.message);
      return null;
    }

    currentProfile = data;
    return data;
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    const action = event.submitter?.dataset.authAction || "signin";
    const email = document.querySelector("#auth-email").value.trim();
    const password = document.querySelector("#auth-password").value;
    const displayName = document.querySelector("#auth-name").value.trim();
    const authStatus = document.querySelector("#auth-status");

    setText(authStatus, "Traitement en cours...");

    const payload = { email, password };
    const response =
      action === "signup"
        ? await supabaseClient.auth.signUp({
            ...payload,
            options: {
              emailRedirectTo: window.location.href,
              data: { display_name: displayName || email.split("@")[0] }
            }
          })
        : await supabaseClient.auth.signInWithPassword(payload);

    if (response.error) {
      setText(authStatus, response.error.message);
      return;
    }

    if (response.data.session) {
      currentSession = response.data.session;
      await ensureProfile(currentSession.user);
      closeAuthPanel();
      await refreshCommunity();
    } else {
      setText(authStatus, "Compte créé. Vérifie ton email avant de te connecter.");
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
      openAuthPanel();
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
        const date = new Date(comment.created_at).toLocaleDateString("fr-CA", {
          year: "numeric",
          month: "short",
          day: "numeric"
        });

        return `
          <article class="comment-item">
            <div class="comment-heading">
              <strong>${escapeHtml(author)}</strong>
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

    const { data, error } = await supabaseClient
      .from("comments")
      .select("id, body, user_id, created_at, profiles(display_name)")
      .eq("video_id", getVideoId())
      .order("created_at", { ascending: false });

    if (error) {
      commentsList.innerHTML = `<p class="empty-state">Commentaires indisponibles: exécute supabase-schema.sql dans Supabase.</p>`;
      return;
    }

    renderComments(data || []);
  }

  async function handleCommentSubmit(event) {
    event.preventDefault();
    if (!currentSession) {
      openAuthPanel();
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
      await ensureProfile(currentSession.user);
    }

    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      currentSession = session;
      if (currentSession) {
        await ensureProfile(currentSession.user);
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
