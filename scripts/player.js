(function () {
  const videos = window.BOILED_VIDEOS || [];
  const utils = window.BOILED_UTILS;
  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get("video");
  const playerMount = document.querySelector("#player-mount");
  const playerPoster = document.querySelector("#player-poster");
  const title = document.querySelector("#player-title");
  const category = document.querySelector("#player-category");
  const description = document.querySelector("#player-description");
  const playerDate = document.querySelector("#player-date");
  const duration = document.querySelector("#player-duration");
  const quality = document.querySelector("#player-quality");
  const source = document.querySelector("#player-source");
  const playerLanguage = document.querySelector("#player-language");
  const tags = document.querySelector("#player-tags");
  const previousLink = document.querySelector("#previous-link");
  const nextLink = document.querySelector("#next-link");
  const playerActions = document.querySelector("#player-actions");
  const relatedGrid = document.querySelector("#related-grid");
  const playerHelp = document.querySelector("#player-help");

  if (!utils || !playerMount || !videos.length) {
    if (playerMount) {
      playerMount.innerHTML = `
        <div class="main-video player-error">
          <p>Aucune vidéo n'est disponible.</p>
        </div>
      `;
    }
    return;
  }

  const {
    buildPlayerUrl,
    escapeHtml,
    formatLanguage,
    getDisplayTags,
    normalizeKey,
    renderPosterImage,
    renderVideoCard,
    bindImageFallbacks
  } = utils;
  const video = videos.find((item) => item.id === requestedId) || videos[0];
  const currentIndex = videos.findIndex((item) => item.id === video.id);
  const previousVideo = videos[(currentIndex - 1 + videos.length) % videos.length];
  const nextVideo = videos[(currentIndex + 1) % videos.length];

  function inferLanguage(item) {
    if (item.language) {
      return formatLanguage(item.language);
    }

    const languageTags = (item.tags || [])
      .filter((tag) => ["fr", "vf", "vostfr", "en", "jp", "multi", "francais"].includes(normalizeKey(tag)))
      .map(formatLanguage);

    return languageTags.length ? languageTags.join(" / ") : "Français";
  }

  function isUqloadEmbed(item) {
    try {
      return /(^|\.)uqload\./i.test(new URL(item.embedUrl, window.location.href).hostname);
    } catch (_error) {
      return /uqload/i.test(item.sourceName || "");
    }
  }

  function getSafeUqloadEmbedUrl(item) {
    try {
      const embedUrl = new URL(item.embedUrl, window.location.href);
      const isUqloadHost = /(^|\.)uqload\./i.test(embedUrl.hostname);

      return embedUrl.protocol === "https:" && isUqloadHost ? embedUrl.toString() : "";
    } catch (_error) {
      return "";
    }
  }

  function buildIframePolicy() {
    const allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";

    return `allow="${allow}" allowfullscreen`;
  }

  function renderUqloadProxy(item) {
    const embedUrl = getSafeUqloadEmbedUrl(item);

    if (!embedUrl) {
      playerMount.innerHTML = `
        <div class="main-video player-error">
          <p>Le player Uqload n'a pas pu être validé.</p>
        </div>
      `;
      if (playerHelp) {
        playerHelp.innerHTML = item.sourceUrl
          ? `<a class="button primary" href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer">Ouvrir la source</a>`
          : "";
      }
      return;
    }

    playerMount.innerHTML = `
      <div class="main-video custom-embed-player" data-provider="uqload">
        <div class="embed-gate">
          <div class="embed-gate-content">
            <span class="embed-provider">Uqload strict</span>
            <h2>${escapeHtml(item.title)}</h2>
            <p>Lecture isolée par BoiledStream: pop-ups, redirections externes et referrer bloqués.</p>
            <button class="button primary embed-launch" type="button">Lancer la lecture</button>
          </div>
        </div>
      </div>
    `;

    const customPlayer = playerMount.querySelector(".custom-embed-player");
    const launchButton = playerMount.querySelector(".embed-launch");
    if (playerHelp) {
      playerHelp.innerHTML = "";
    }

    launchButton?.addEventListener("click", () => {
      const iframe = document.createElement("iframe");
      iframe.className = "custom-embed-frame";
      iframe.src = embedUrl;
      iframe.title = item.title;
      iframe.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";
      iframe.sandbox = "allow-scripts allow-presentation";
      iframe.referrerPolicy = "no-referrer";
      iframe.allowFullscreen = true;
      if ("credentialless" in iframe) {
        iframe.credentialless = true;
      }
      customPlayer?.replaceChildren(iframe);
    });
  }

  function renderPlayerPoster(item) {
    if (!playerPoster) {
      return;
    }

    playerPoster.innerHTML = `
      <div class="generated-poster" aria-hidden="true"></div>
      ${renderPosterImage(item.posterUrl, "eager")}
    `;
    bindImageFallbacks(playerPoster, "img");
  }

  function renderPlayer(item) {
    if (item.embedUrl) {
      if (isUqloadEmbed(item)) {
        renderUqloadProxy(item);
        return;
      }

      playerMount.innerHTML = `
        <iframe
          class="main-video"
          src="${escapeHtml(item.embedUrl)}"
          title="${escapeHtml(item.title)}"
          ${buildIframePolicy()}
          referrerpolicy="origin"
        ></iframe>
      `;
      if (playerHelp) {
        playerHelp.innerHTML = "";
      }
      return;
    }

    if (item.videoUrl) {
      const posterAttribute = item.posterUrl ? ` poster="${escapeHtml(item.posterUrl)}"` : "";
      playerMount.innerHTML = `
        <video class="main-video" controls preload="metadata" playsinline${posterAttribute}>
          <source src="${escapeHtml(item.videoUrl)}" type="video/mp4">
          Votre navigateur ne prend pas en charge la lecture vidéo HTML5.
        </video>
      `;
      if (playerHelp) {
        playerHelp.innerHTML = "";
      }
      return;
    }

    playerMount.innerHTML = `
      <div class="main-video player-error">
        <p>Aucun player n'est disponible pour cette vidéo.</p>
      </div>
    `;
    if (playerHelp) {
      playerHelp.innerHTML = item.sourceUrl
        ? `<a class="button primary" href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer">Ouvrir la source</a>`
        : "";
    }
  }

  function renderMetadata(item) {
    document.title = `BoiledStream - ${item.title}`;
    if (title) {
      title.textContent = item.title;
    }
    if (category) {
      category.textContent = "Lecture";
    }
    if (description) {
      description.textContent = item.description || "";
    }
    if (playerDate) {
      playerDate.textContent = item.date || "Non renseignée";
    }
    if (duration) {
      duration.textContent = item.duration || "Non renseignée";
    }
    if (quality) {
      quality.textContent = [item.resolution, item.format].filter(Boolean).join(" - ") || "Non renseignée";
    }
    if (playerLanguage) {
      playerLanguage.textContent = inferLanguage(item);
    }
    if (source) {
      source.href = item.sourceUrl || "#";
      source.textContent = item.sourceName || "Source";
    }

    const visibleTags = getDisplayTags(item);
    if (tags) {
      tags.hidden = visibleTags.length === 0;
      tags.innerHTML = visibleTags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
    }
  }

  function renderNavigation() {
    if (!playerActions) {
      return;
    }

    playerActions.hidden = videos.length < 2;
    if (videos.length < 2) {
      return;
    }

    previousLink.href = buildPlayerUrl(previousVideo.id);
    previousLink.textContent = "Précédent";
    previousLink.setAttribute("aria-label", `Lire ${previousVideo.title}`);
    nextLink.href = buildPlayerUrl(nextVideo.id);
    nextLink.textContent = "Suivant";
    nextLink.setAttribute("aria-label", `Lire ${nextVideo.title}`);
  }

  function renderRelated() {
    if (!relatedGrid) {
      return;
    }

    relatedGrid.innerHTML = videos
      .filter((item) => item.id !== video.id)
      .slice(0, 3)
      .map((item) => renderVideoCard(item, { related: true, tagLimit: 0 }))
      .join("");
    bindImageFallbacks(relatedGrid);
  }

  if (!requestedId || requestedId !== video.id) {
    window.history.replaceState(null, "", buildPlayerUrl(video.id));
  }

  renderPlayerPoster(video);
  renderPlayer(video);
  renderMetadata(video);
  renderNavigation();
  renderRelated();
})();
