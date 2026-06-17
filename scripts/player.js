(function () {
  const videos = window.BOILED_VIDEOS || [];
  const episodes = window.BOILED_EPISODES || [];
  const allVideos = [...videos, ...episodes];
  const utils = window.BOILED_UTILS;
  const params = new URLSearchParams(window.location.search);
  const watchMatch = window.location.pathname.match(/\/watch\/([^/]+)\.html$/);
  const requestedId = params.get("video") || (watchMatch ? decodeURIComponent(watchMatch[1]) : "");
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
  const seriesPanel = document.querySelector("#series-panel");

  if (!utils || !playerMount || !allVideos.length) {
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
    getAssetUrl,
    getEpisodeCount,
    getDisplayTags,
    normalizeKey,
    renderPosterImage,
    renderVideoCard,
    bindImageFallbacks
  } = utils;
  const video = allVideos.find((item) => item.id === requestedId) || videos[0] || episodes[0];
  const currentIndex = allVideos.findIndex((item) => item.id === video.id);
  const previousVideo = allVideos[(currentIndex - 1 + allVideos.length) % allVideos.length];
  const nextVideo = allVideos[(currentIndex + 1) % allVideos.length];
  let fullscreenButtons = [];
  let isPseudoFullscreen = false;
  let isMiniPlayer = false;
  let controlsIdleTimer = null;
  let hasBoundPlayerActivity = false;

  function showPlayerMount() {
    playerMount.hidden = false;
  }

  function hidePlayerMount() {
    const fullscreenElement = getFullscreenElement();

    if (fullscreenElement === playerMount) {
      const exitFullscreen = document.exitFullscreen?.() || document.webkitExitFullscreen?.();
      Promise.resolve(exitFullscreen).catch(() => {});
    }
    if (isPseudoFullscreen) {
      exitPseudoFullscreen();
    }

    setMiniPlayer(false);
    window.clearTimeout(controlsIdleTimer);
    fullscreenButtons = fullscreenButtons.filter((button) => document.contains(button));
    playerMount.hidden = true;
    playerMount.innerHTML = "";
    playerMount.classList.remove("controls-idle");
    if (playerHelp) {
      playerHelp.innerHTML = "";
    }
  }

  function inferLanguage(item) {
    if (item.language) {
      return formatLanguage(item.language);
    }

    const languageTags = (item.tags || [])
      .filter((tag) => ["fr", "vf", "vostfr", "en", "jp", "multi", "francais"].includes(normalizeKey(tag)))
      .map(formatLanguage);

    return languageTags.length ? languageTags.join(" / ") : "Français";
  }

  function getSeriesForEpisode(item) {
    return item.seriesId ? videos.find((candidate) => candidate.id === item.seriesId && candidate.type === "series") : null;
  }

  function getSeriesEpisodes(series) {
    return series?.seasons?.flatMap((season) => season.episodes) || [];
  }

  function getNextEpisode(item) {
    const series = getSeriesForEpisode(item);
    const seriesEpisodes = getSeriesEpisodes(series);
    const episodeIndex = seriesEpisodes.findIndex((episode) => episode.id === item.id);

    return episodeIndex >= 0 ? seriesEpisodes[episodeIndex + 1] || null : null;
  }

  function getPreviousEpisode(item) {
    const series = getSeriesForEpisode(item);
    const seriesEpisodes = getSeriesEpisodes(series);
    const episodeIndex = seriesEpisodes.findIndex((episode) => episode.id === item.id);

    return episodeIndex > 0 ? seriesEpisodes[episodeIndex - 1] : null;
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

  function buildAutoplayEmbedUrl(url) {
    try {
      const embedUrl = new URL(url, window.location.href);

      embedUrl.searchParams.set("autoplay", "1");
      if (/(^|\.)youtube(-nocookie)?\.com$/i.test(embedUrl.hostname)) {
        embedUrl.searchParams.set("playsinline", "1");
      }

      return embedUrl.toString();
    } catch (_error) {
      return url;
    }
  }

  function buildIframePolicy() {
    const allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";

    return `allow="${allow}" allowfullscreen`;
  }

  function getFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function updateFullscreenButton() {
    fullscreenButtons = fullscreenButtons.filter((button) => document.contains(button));
    const isFullscreen = getFullscreenElement() === playerMount || isPseudoFullscreen;

    fullscreenButtons.forEach((button) => {
      const isCompact = button.classList.contains("player-control-button");
      button.textContent = isCompact
        ? isFullscreen
          ? "×"
          : "⛶"
        : isFullscreen
          ? "Quitter"
          : "Plein écran";
      button.setAttribute(
        "aria-label",
        isFullscreen ? "Quitter le plein écran" : "Afficher le player en plein écran"
      );
      button.title = isFullscreen ? "Quitter le plein écran" : "Plein écran";
    });
  }

  function setFloatingControlsIdle(isIdle) {
    playerMount.classList.toggle("controls-idle", isIdle);
    playerMount
      .querySelector(".player-floating-controls")
      ?.classList.toggle("controls-idle", isIdle);
  }

  function scheduleFloatingControlsIdle() {
    window.clearTimeout(controlsIdleTimer);
    controlsIdleTimer = window.setTimeout(() => {
      setFloatingControlsIdle(true);
    }, 3000);
  }

  function showFloatingControls() {
    setFloatingControlsIdle(false);
    scheduleFloatingControlsIdle();
  }

  function bindPlayerActivity() {
    if (hasBoundPlayerActivity) {
      return;
    }

    hasBoundPlayerActivity = true;
    ["mousemove", "pointermove", "pointerdown", "touchstart", "focusin"].forEach((eventName) => {
      playerMount.addEventListener(eventName, showFloatingControls, { passive: true });
    });
    document.addEventListener("keydown", showFloatingControls);
  }

  function enterPseudoFullscreen() {
    isPseudoFullscreen = true;
    document.body.classList.add("player-pseudo-fullscreen-active");
    playerMount.classList.add("player-pseudo-fullscreen");
    updateFullscreenButton();
  }

  function exitPseudoFullscreen() {
    isPseudoFullscreen = false;
    document.body.classList.remove("player-pseudo-fullscreen-active");
    playerMount.classList.remove("player-pseudo-fullscreen");
    updateFullscreenButton();
  }

  async function togglePlayerFullscreen() {
    if (!playerMount || playerMount.hidden) {
      return;
    }

    try {
      if (isPseudoFullscreen) {
        exitPseudoFullscreen();
        return;
      }

      if (getFullscreenElement()) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
        return;
      }

      setMiniPlayer(false);
      if (playerMount.requestFullscreen) {
        await playerMount.requestFullscreen();
      } else if (playerMount.webkitRequestFullscreen) {
        playerMount.webkitRequestFullscreen();
      } else {
        enterPseudoFullscreen();
      }
    } catch (_error) {
      enterPseudoFullscreen();
    } finally {
      updateFullscreenButton();
    }
  }

  function renderPlayerChrome() {
    playerMount.querySelector(".player-floating-controls")?.remove();
    playerMount.querySelector(".player-activity-capture")?.remove();
    const needsActivityCapture = Boolean(playerMount.querySelector("iframe"));

    playerMount.insertAdjacentHTML(
      "beforeend",
      `
        ${
          needsActivityCapture
            ? '<div class="player-activity-capture" aria-hidden="true"></div>'
            : ""
        }
        <div class="player-floating-controls" aria-label="Contrôles du player">
          <button class="player-control-button" type="button" data-player-fullscreen>Plein écran</button>
        </div>
      `
    );
    bindFullscreenButton(playerMount.querySelector("[data-player-fullscreen]"));
    bindPlayerActivity();
    showFloatingControls();
    updateFullscreenButton();
  }

  function bindFullscreenButton(button) {
    if (!button) {
      return;
    }

    fullscreenButtons.push(button);
    button.addEventListener("click", (event) => {
      if (event.detail > 0) {
        button.blur();
      }

      togglePlayerFullscreen();
    });
  }

  function getSourceLanguages(sources) {
    if (Array.isArray(sources)) {
      return sources.map((entry) => entry.language).filter(Boolean);
    }

    if (sources && typeof sources === "object") {
      return Object.keys(sources);
    }

    return [];
  }

  function hasSelectableSources(item) {
    return getSourceLanguages(item?.sources).length > 1;
  }

  function uniqueNormalizedValues(values) {
    return values.filter(
      (entry, index, list) =>
        entry && list.findIndex((value) => normalizeKey(value) === normalizeKey(entry)) === index
    );
  }

  function formatCountLabel(count, singular, plural = `${singular}s`) {
    return `${count} ${count > 1 ? plural : singular}`;
  }

  function centerActiveOption(containerSelector, activeSelector) {
    const container = seriesPanel?.querySelector(containerSelector);
    const activeOption = container?.querySelector(activeSelector);

    if (!container || !activeOption) {
      return;
    }

    const activeTop = activeOption.offsetTop - container.offsetTop;
    const centeredTop = activeTop - container.clientHeight / 2 + activeOption.clientHeight / 2;
    container.scrollTop = Math.max(0, centeredTop);
  }

  function getSeriesState(item) {
    const seasons = item.seasons || [];
    const currentParams = new URLSearchParams(window.location.search);
    const requestedSeason = Number(currentParams.get("season"));
    const requestedEpisode = Number(currentParams.get("episode"));
    const requestedLanguage = currentParams.get("lang") || "";
    const season = seasons.find((entry) => entry.number === requestedSeason) || seasons[0];
    const selectedEpisode =
      season?.episodes?.find((entry) => entry.number === requestedEpisode) || null;
    const episode = currentParams.has("episode") ? selectedEpisode : null;
    const languages = uniqueNormalizedValues([
      ...(episode?.languages || season?.languages || [item.language].filter(Boolean)),
      ...getSourceLanguages(episode?.sources)
    ]);
    const language =
      languages.find((entry) => normalizeKey(entry) === normalizeKey(requestedLanguage)) ||
      languages[0] ||
      item.language ||
      "";

    return { season, episode, language, languages };
  }

  function getMovieState(item) {
    const currentParams = new URLSearchParams(window.location.search);
    const requestedLanguage = currentParams.get("lang") || "";
    const sourceLanguages = getSourceLanguages(item.sources);
    const languages = uniqueNormalizedValues(
      sourceLanguages.length
        ? [...(item.languages || []), ...sourceLanguages]
        : [...(item.languages || []), item.language].filter(Boolean)
    );
    const language =
      languages.find((entry) => normalizeKey(entry) === normalizeKey(requestedLanguage)) ||
      languages[0] ||
      item.language ||
      "";

    return { language, languages };
  }

  function updateSeriesAddress(item, season, episode, language) {
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.set("video", item.id);
    nextParams.set("season", String(season.number));
    if (episode) {
      nextParams.set("episode", String(episode.number));
    } else {
      nextParams.delete("episode");
    }
    if (language) {
      nextParams.set("lang", language);
    } else {
      nextParams.delete("lang");
    }
    const nextUrl = new URL(window.location.href);
    nextUrl.search = nextParams.toString();
    window.history.replaceState(null, "", nextUrl);
  }

  function updateMovieAddress(item, language) {
    const nextParams = new URLSearchParams(window.location.search);

    if (!watchMatch || nextParams.has("video")) {
      nextParams.set("video", item.id);
    }
    nextParams.delete("season");
    nextParams.delete("episode");
    if (language) {
      nextParams.set("lang", language);
    } else {
      nextParams.delete("lang");
    }

    const nextUrl = new URL(window.location.href);
    nextUrl.search = nextParams.toString();
    window.history.replaceState(null, "", nextUrl);
  }

  function renderEmptyPlayer(item, options = {}) {
    showPlayerMount();

    const titleText = options.title || item.title;
    const contextText =
      options.context || "Aucun player n'est encore renseigné pour cette sélection.";
    const meta = [options.language ? formatLanguage(options.language) : "", options.quality || item.resolution]
      .filter(Boolean)
      .map((value) => `<span>${escapeHtml(value)}</span>`)
      .join("");

    playerMount.innerHTML = `
      <div class="main-video source-gate source-gate-empty">
        <div class="source-gate-content">
          <div class="embed-meta-row" aria-label="Informations de lecture">
            ${meta}
          </div>
          <h2>${escapeHtml(titleText)}</h2>
          <p>${escapeHtml(contextText)}</p>
        </div>
      </div>
    `;

    if (playerHelp) {
      playerHelp.innerHTML = "";
    }
  }

  function renderExternalGate(item, options = {}) {
    showPlayerMount();

    const sourceUrl = options.sourceUrl || item.sourceUrl || "";
    const sourceName = options.sourceName || item.sourceName || "Source externe";
    const gateTitle = options.title || item.title;
    const gateContext = options.context || "Source externe";
    const sourceAction = sourceUrl
      ? `<a class="button primary" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">Ouvrir la source</a>`
      : "";
    const gateMeta = [sourceName, options.language || item.language, options.quality || item.resolution]
      .filter(Boolean)
      .map((value) => `<span>${escapeHtml(formatLanguage(value))}</span>`)
      .join("");

    playerMount.innerHTML = `
      <div class="main-video source-gate">
        <div class="source-gate-content">
          <div class="embed-meta-row" aria-label="Informations de lecture">
            ${gateMeta}
          </div>
          <h2>${escapeHtml(gateTitle)}</h2>
          <p>${escapeHtml(gateContext)}</p>
          ${sourceAction}
        </div>
      </div>
    `;

    if (playerHelp) {
      playerHelp.innerHTML =
        "<p><strong>Source externe.</strong> BoiledStream affiche la fiche et les sélections disponibles.</p>";
    }
  }

  function renderSeriesPanel(item) {
    if (!seriesPanel) {
      return;
    }

    const { season, episode, language, languages } = getSeriesState(item);
    if (!season) {
      seriesPanel.hidden = true;
      seriesPanel.innerHTML = "";
      return;
    }

    const seasons = item.seasons || [];
    const hasEpisodeSelection = Boolean(episode);
    const playback = hasEpisodeSelection ? getEpisodePlaybackSource(episode, language) : {};
    const selectedPosterUrl = season.posterUrl || item.posterUrl;
    const hasSelectedPlayer = hasEpisodeSelection && Boolean(playback.embedUrl || playback.videoUrl);
    const selectedSourceUrl = hasEpisodeSelection
      ? hasSelectedPlayer
        ? ""
        : playback.sourceUrl || episode.sourceUrl || season.sourceUrl || item.sourceUrl || ""
      : "";
    const selectedSourceName = hasEpisodeSelection
      ? playback.sourceName || episode.sourceName || item.sourceName || "Player"
      : item.sourceName || "Player";
    const sourceAction = selectedSourceUrl
      ? `<a class="button secondary" href="${escapeHtml(selectedSourceUrl)}" target="_blank" rel="noreferrer">Fiche source</a>`
      : "";
    const availableEpisodes = season.availableEpisodes || (season.episodes || []).length;
    const totalEpisodes = season.totalEpisodes || availableEpisodes;
    const episodeCountText =
      availableEpisodes === totalEpisodes
        ? formatCountLabel(availableEpisodes, "épisode", "épisodes")
        : `${availableEpisodes}/${totalEpisodes} épisodes`;
    const panelMeta = [selectedSourceName, formatLanguage(language), episodeCountText]
      .filter(Boolean)
      .map((entry) => `<span>${escapeHtml(entry)}</span>`)
      .join("");
    const episodeButtons = (season.episodes || [])
      .map((entry) => {
        const isActive = hasEpisodeSelection && entry.number === episode.number;
        return `
          <button class="episode-button${isActive ? " active" : ""}" type="button" data-episode="${entry.number}" aria-pressed="${isActive}">
            <span>Ep ${entry.number}</span>
          </button>
        `;
      })
      .join("");
    const seasonButtons = seasons
      .map((entry) => {
        const isActive = entry.number === season.number;
        const countText =
          entry.availableEpisodes === entry.totalEpisodes
            ? `${entry.availableEpisodes}/${entry.totalEpisodes}`
            : `${entry.availableEpisodes} dispo / ${entry.totalEpisodes}`;
        return `
          <button class="season-button${isActive ? " active" : ""}" type="button" data-season="${entry.number}" aria-pressed="${isActive}">
            <span>${escapeHtml(entry.label)}</span>
            <small>${escapeHtml(countText)}</small>
          </button>
        `;
      })
      .join("");
    const languageButtons = languages
      .map((entry) => {
        const isActive = normalizeKey(entry) === normalizeKey(language);
        return `
          <button class="language-button${isActive ? " active" : ""}" type="button" data-language="${escapeHtml(entry)}" aria-pressed="${isActive}">
            ${escapeHtml(entry)}
          </button>
        `;
      })
      .join("");

    const panelTitle = hasEpisodeSelection
      ? `${season.label} - ${episode.title}`
      : `${season.label} - Choisir un épisode`;
    const nowKicker = hasEpisodeSelection ? "Sélection active" : "Épisode";
    const nowTitle = hasEpisodeSelection
      ? `${item.title} - ${season.label} - ${episode.title}`
      : `${item.title} - ${season.label}`;

    seriesPanel.hidden = false;
    seriesPanel.innerHTML = `
      <div class="series-panel-head">
        <div>
          <p class="section-kicker">Player série</p>
          <h2>${escapeHtml(panelTitle)}</h2>
        </div>
        ${sourceAction}
      </div>
      <div class="series-now">
        <div class="series-now-poster" aria-hidden="true">
          <div class="generated-poster"></div>
          ${renderPosterImage(selectedPosterUrl, "eager")}
        </div>
        <div class="series-now-copy">
          <p class="section-kicker">${escapeHtml(nowKicker)}</p>
          <h3>${escapeHtml(nowTitle)}</h3>
          <div class="series-now-meta" aria-label="Détails de la sélection">
            ${panelMeta}
          </div>
        </div>
      </div>
      <div class="series-controls" aria-label="Sélection saison langue épisode">
        <section class="series-control-block" aria-label="Saisons">
          <h3>Saisons <span>${seasons.length}</span></h3>
          <div class="season-list">${seasonButtons}</div>
        </section>
        <section class="series-control-block" aria-label="Langues">
          <h3>Langues <span>${languages.length}</span></h3>
          <div class="language-list">${languageButtons}</div>
        </section>
        <section class="series-control-block episode-block" aria-label="Épisodes">
          <h3>Épisodes <span>${(season.episodes || []).length}</span></h3>
          <div class="episode-list">${episodeButtons}</div>
        </section>
      </div>
      <p class="season-description">${escapeHtml(season.description || item.description || "")}</p>
    `;

    bindImageFallbacks(seriesPanel, ".series-now-poster img");
    centerActiveOption(".season-list", ".season-button.active");
    centerActiveOption(".episode-list", ".episode-button.active");

    seriesPanel.querySelectorAll("[data-season]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextSeason =
          seasons.find((entry) => entry.number === Number(button.dataset.season)) || season;
        updateSeriesAddress(item, nextSeason, null, language);
        renderSeriesExperience(item);
        renderMetadata(item);
        renderPlayerPoster(item);
      });
    });

    seriesPanel.querySelectorAll("[data-episode]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextEpisode =
          season.episodes?.find((entry) => entry.number === Number(button.dataset.episode));
        if (!nextEpisode) {
          return;
        }
        updateSeriesAddress(item, season, nextEpisode, language);
        renderSeriesExperience(item);
        renderMetadata(item);
      });
    });

    seriesPanel.querySelectorAll("[data-language]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextLanguage = button.dataset.language || language;
        updateSeriesAddress(item, season, episode, nextLanguage);
        renderSeriesExperience(item);
        renderMetadata(item);
      });
    });
  }

  function renderMovieSourcePanel(item) {
    if (!seriesPanel) {
      return;
    }

    const { language, languages } = getMovieState(item);
    if (!hasSelectableSources(item)) {
      seriesPanel.hidden = true;
      seriesPanel.innerHTML = "";
      return;
    }

    const playback = getMoviePlaybackSource(item, language);
    const selectedSourceName = playback.sourceName || item.sourceName || "Player";
    const panelMeta = [selectedSourceName, formatLanguage(language), playback.resolution || item.resolution]
      .filter(Boolean)
      .map((entry) => `<span>${escapeHtml(entry)}</span>`)
      .join("");
    const languageButtons = languages
      .map((entry) => {
        const isActive = normalizeKey(entry) === normalizeKey(language);
        return `
          <button class="language-button${isActive ? " active" : ""}" type="button" data-language="${escapeHtml(entry)}" aria-pressed="${isActive}">
            ${escapeHtml(entry)}
          </button>
        `;
      })
      .join("");

    seriesPanel.hidden = false;
    seriesPanel.innerHTML = `
      <div class="series-panel-head">
        <div>
          <p class="section-kicker">Player film</p>
          <h2>${escapeHtml(item.title)}</h2>
        </div>
      </div>
      <div class="series-now">
        <div class="series-now-poster" aria-hidden="true">
          <div class="generated-poster"></div>
          ${renderPosterImage(item.posterUrl, "eager")}
        </div>
        <div class="series-now-copy">
          <p class="section-kicker">Sélection active</p>
          <h3>${escapeHtml(item.title)} - ${escapeHtml(formatLanguage(language))}</h3>
          <div class="series-now-meta" aria-label="Détails de la sélection">
            ${panelMeta}
          </div>
        </div>
      </div>
      <div class="movie-source-controls" aria-label="Sélection langue film">
        <section class="series-control-block" aria-label="Langues">
          <h3>Langues <span>${languages.length}</span></h3>
          <div class="language-list">${languageButtons}</div>
        </section>
      </div>
    `;

    bindImageFallbacks(seriesPanel, ".series-now-poster img");
    seriesPanel.querySelectorAll("[data-language]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextLanguage = button.dataset.language || language;
        updateMovieAddress(item, nextLanguage);
        renderPlayer(item);
        renderMetadata(item);
      });
    });
  }

  function getEpisodePlaybackSource(episode, language) {
    const sources = episode?.sources;

    if (Array.isArray(sources) && sources.length) {
      const selected = sources.find((entry) => normalizeKey(entry.language) === normalizeKey(language));

      if (!selected) {
        return episode || {};
      }

      return {
        ...episode,
        ...selected,
        sourceName: selected.sourceName || episode.sourceName,
        sourceUrl: selected.sourceUrl || episode.sourceUrl
      };
    }

    if (sources && typeof sources === "object") {
      const selectedKey = Object.keys(sources).find(
        (key) => normalizeKey(key) === normalizeKey(language)
      );
      if (!selectedKey) {
        return episode || {};
      }
      const selected = sources[selectedKey] || {};

      return {
        ...episode,
        ...selected,
        language: selected.language || selectedKey,
        sourceName: selected.sourceName || episode.sourceName,
        sourceUrl: selected.sourceUrl || episode.sourceUrl
      };
    }

    return episode || {};
  }

  function getMoviePlaybackSource(item, language) {
    const sources = item?.sources;

    if (Array.isArray(sources) && sources.length) {
      const selected = sources.find((entry) => normalizeKey(entry.language) === normalizeKey(language));

      if (!selected) {
        return item || {};
      }

      return {
        ...item,
        ...selected,
        sourceName: selected.sourceName || item.sourceName,
        sourceUrl: selected.sourceUrl || item.sourceUrl
      };
    }

    if (sources && typeof sources === "object") {
      const selectedKey = Object.keys(sources).find(
        (key) => normalizeKey(key) === normalizeKey(language)
      );
      if (!selectedKey) {
        return item || {};
      }
      const selected = sources[selectedKey] || {};

      return {
        ...item,
        ...selected,
        language: selected.language || selectedKey,
        sourceName: selected.sourceName || item.sourceName,
        sourceUrl: selected.sourceUrl || item.sourceUrl
      };
    }

    return item || {};
  }

  function renderEpisodePlayback(item, season, episode, language) {
    showPlayerMount();

    const playback = getEpisodePlaybackSource(episode, language);
    const playbackTitle = `${item.title} - ${season.label} - ${episode.title}`;
    const playbackItem = {
      ...item,
      ...playback,
      title: playback.title || playbackTitle,
      posterUrl: season.posterUrl || item.posterUrl,
      resolution: playback.resolution || item.resolution,
      duration: playback.duration || item.duration,
      sourceName: playback.sourceName || item.sourceName,
      sourceUrl: playback.sourceUrl || episode.sourceUrl || season.sourceUrl || item.sourceUrl
    };

    if (playback.embedUrl) {
      if (isUqloadEmbed(playbackItem)) {
        renderUqloadProxy(playbackItem);
      } else {
        playerMount.innerHTML = `
          <iframe
            class="main-video"
            src="${escapeHtml(buildAutoplayEmbedUrl(playback.embedUrl))}"
            title="${escapeHtml(playbackTitle)}"
            ${buildIframePolicy()}
            referrerpolicy="origin"
          ></iframe>
        `;
        renderPlayerChrome();
        if (playerHelp) {
          playerHelp.innerHTML = "";
        }
      }
      renderSeriesPanel(item);
      return true;
    }

    if (playback.videoUrl) {
      const posterAttribute = playbackItem.posterUrl ? ` poster="${escapeHtml(playbackItem.posterUrl)}"` : "";
      playerMount.innerHTML = `
        <video class="main-video" controls preload="metadata" playsinline${posterAttribute}>
          <source src="${escapeHtml(playback.videoUrl)}" type="${escapeHtml(playback.mimeType || "video/mp4")}">
          Votre navigateur ne prend pas en charge la lecture vidéo HTML5.
        </video>
      `;
      renderPlayerChrome();
      if (playerHelp) {
        playerHelp.innerHTML = "";
      }
      renderSeriesPanel(item);
      return true;
    }

    return false;
  }

  function renderSeriesExperience(item) {
    const { season, episode, language } = getSeriesState(item);
    if (!season) {
      renderExternalGate(item, {
        context: "Aucun épisode n'est référencé pour cette série."
      });
      return;
    }

    if (!episode) {
      updateSeriesAddress(item, season, null, language);
      hidePlayerMount();
      renderSeriesPanel(item);
      return;
    }

    updateSeriesAddress(item, season, episode, language);
    if (renderEpisodePlayback(item, season, episode, language)) {
      return;
    }

    const playback = getEpisodePlaybackSource(episode, language);
    const sourceUrl = playback.sourceUrl || episode.sourceUrl || season.sourceUrl || item.sourceUrl || "";
    if (!sourceUrl) {
      renderEmptyPlayer(item, {
        title: `${item.title} - ${season.label} - ${episode.title}`,
        language,
        quality: item.resolution,
        context: "Aucun player n'est encore renseigné pour cet épisode."
      });
      renderSeriesPanel(item);
      return;
    }

    renderExternalGate(item, {
      title: `${item.title} - ${season.label} - ${episode.title}`,
      sourceUrl,
      sourceName: playback.sourceName || episode.sourceName || item.sourceName,
      language,
      quality: item.resolution,
      context: `${formatLanguage(language)} sélectionné. Ouvre la fiche source pour utiliser le lecteur associé à cet épisode.`
    });
    renderSeriesPanel(item);
  }

  function renderUqloadProxy(item) {
    showPlayerMount();

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
            <div class="embed-meta-row" aria-label="Informations de lecture">
              <span class="embed-provider">Uqload</span>
              <span>${escapeHtml(item.resolution || "Qualité externe")}</span>
              <span>${escapeHtml(item.duration || "Durée externe")}</span>
            </div>
            <h2>${escapeHtml(item.title)}</h2>
            <p>Player Externe</p>
            <div class="embed-actions">
              <button class="button primary embed-launch" type="button">Lancer</button>
              <button class="button secondary embed-fullscreen" type="button">Plein écran</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const customPlayer = playerMount.querySelector(".custom-embed-player");
    const launchButton = playerMount.querySelector(".embed-launch");
    const fullscreenGateButton = playerMount.querySelector(".embed-fullscreen");
    if (playerHelp) {
      playerHelp.innerHTML = "";
    }

    bindFullscreenButton(fullscreenGateButton);
    updateFullscreenButton();

    launchButton?.addEventListener("click", () => {
      const iframe = document.createElement("iframe");
      iframe.className = "custom-embed-frame";
      iframe.src = buildAutoplayEmbedUrl(embedUrl);
      iframe.title = item.title;
      iframe.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";
      iframe.allowFullscreen = true;
      iframe.sandbox = "allow-scripts allow-presentation";
      iframe.referrerPolicy = "no-referrer";
      if ("credentialless" in iframe) {
        iframe.credentialless = true;
      }
      customPlayer?.replaceChildren(iframe);
      renderPlayerChrome();
    });
  }

  function renderPlayerPoster(item) {
    if (!playerPoster) {
      return;
    }

    const seriesState = item.type === "series" ? getSeriesState(item) : null;
    const posterUrl = seriesState?.season?.posterUrl || item.posterUrl;

    playerPoster.innerHTML = `
      <div class="generated-poster" aria-hidden="true"></div>
      ${renderPosterImage(posterUrl, "eager")}
    `;
    bindImageFallbacks(playerPoster, "img");
  }

  function renderPlayer(item) {
    if (item.type === "series") {
      renderSeriesExperience(item);
      return;
    }

    showPlayerMount();
    const movieState = getMovieState(item);
    const hasMovieSourceChoices = hasSelectableSources(item);
    const playback = hasMovieSourceChoices ? getMoviePlaybackSource(item, movieState.language) : item;
    const playbackItem = {
      ...item,
      ...playback,
      title: item.title,
      posterUrl: item.posterUrl,
      sourceName: playback.sourceName || item.sourceName,
      sourceUrl: playback.sourceUrl || item.sourceUrl,
      resolution: playback.resolution || item.resolution,
      duration: playback.duration || item.duration
    };

    if (hasMovieSourceChoices) {
      updateMovieAddress(item, movieState.language);
      renderMovieSourcePanel(item);
    } else if (seriesPanel) {
      seriesPanel.hidden = true;
      seriesPanel.innerHTML = "";
    }

    if (playbackItem.embedUrl) {
      if (isUqloadEmbed(playbackItem)) {
        renderUqloadProxy(playbackItem);
        return;
      }

      playerMount.innerHTML = `
        <iframe
          class="main-video"
          src="${escapeHtml(buildAutoplayEmbedUrl(playbackItem.embedUrl))}"
          title="${escapeHtml(playbackItem.title)}"
          ${buildIframePolicy()}
          referrerpolicy="origin"
        ></iframe>
      `;
      renderPlayerChrome();
      if (playerHelp) {
        playerHelp.innerHTML = "";
      }
      return;
    }

    if (playbackItem.videoUrl) {
      const posterUrl = getAssetUrl(playbackItem.posterUrl);
      const posterAttribute = posterUrl ? ` poster="${escapeHtml(posterUrl)}"` : "";
      playerMount.innerHTML = `
        <video class="main-video" controls preload="metadata" playsinline${posterAttribute}>
          <source src="${escapeHtml(playbackItem.videoUrl)}" type="${escapeHtml(playbackItem.mimeType || "video/mp4")}">
          Votre navigateur ne prend pas en charge la lecture vidéo HTML5.
        </video>
      `;
      renderPlayerChrome();
      if (playerHelp) {
        playerHelp.innerHTML = "";
      }
      return;
    }

    if (playbackItem.sourceUrl) {
      renderExternalGate(playbackItem, {
        context: "Fiche source externe référencée dans BoiledStream."
      });
      return;
    }

    playerMount.innerHTML = `
      <div class="main-video player-error">
        <p>Aucun player n'est disponible pour cette vidéo.</p>
      </div>
    `;
    renderPlayerChrome();
    if (playerHelp) {
      playerHelp.innerHTML = playbackItem.sourceUrl
        ? `<a class="button primary" href="${escapeHtml(playbackItem.sourceUrl)}" target="_blank" rel="noreferrer">Ouvrir la source</a>`
        : "";
    }
  }

  function renderMetadata(item) {
    const seriesState = item.type === "series" ? getSeriesState(item) : null;
    const seriesPlayback = seriesState?.episode
      ? getEpisodePlaybackSource(seriesState.episode, seriesState.language)
      : null;
    const seriesSource =
      seriesPlayback?.sourceUrl || seriesState?.episode?.sourceUrl || seriesState?.season?.sourceUrl || item.sourceUrl;
    const movieState = item.type === "series" ? null : getMovieState(item);
    const moviePlayback = movieState ? getMoviePlaybackSource(item, movieState.language) : null;
    const movieSource = moviePlayback?.sourceUrl || item.sourceUrl;
    const episodeDuration = seriesPlayback?.duration || seriesState?.episode?.duration || "";
    const episodeResolution = seriesPlayback?.resolution || seriesState?.episode?.resolution || "";
    const episodeFormat = seriesPlayback?.format || seriesState?.episode?.format || "";
    const movieResolution = moviePlayback?.resolution || item.resolution || "";
    const movieFormat = moviePlayback?.format || item.format || "";

    document.title = `BoiledStream - ${item.title}`;
    if (title) {
      title.textContent = item.title;
    }
    if (category) {
      category.textContent = seriesState?.season
        ? `Série / ${seriesState.season.label}`
        : item.seriesId
          ? "Épisode"
          : "Lecture";
    }
    if (description) {
      description.textContent = seriesState?.season?.description || item.description || "";
    }
    if (playerDate) {
      playerDate.textContent = item.date || "Non renseignée";
    }
    if (duration) {
      const seriesDuration = `${formatCountLabel(item.seasons?.length || 0, "saison")} / ${formatCountLabel(
        getEpisodeCount(item),
        "épisode",
        "épisodes"
      )}`;

      duration.textContent =
        item.type === "series"
          ? seriesState?.episode
            ? episodeDuration || "Non renseignée"
            : seriesDuration
          : item.duration || "Non renseignée";
    }
    if (quality) {
      quality.textContent =
        (item.type === "series"
          ? [
              seriesState?.episode ? episodeResolution || item.resolution : item.resolution,
              seriesState?.episode ? episodeFormat || item.format : item.format
            ]
          : [movieResolution, movieFormat])
          .filter(Boolean)
          .join(" - ") || "Non renseignée";
    }
    if (playerLanguage) {
      playerLanguage.textContent = seriesState?.language
        ? formatLanguage(seriesState.language)
        : movieState?.language
          ? formatLanguage(movieState.language)
          : inferLanguage(item);
    }
    if (source) {
      const sourceLabel = seriesPlayback?.sourceName || moviePlayback?.sourceName || item.sourceName || "Source";
      source.href = seriesState ? seriesSource || item.sourceUrl || "#" : movieSource || "#";
      source.textContent = seriesState?.episode
        ? `${sourceLabel} - ${seriesState.season.label} épisode ${seriesState.episode.number}`
        : sourceLabel;
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

    if (video.type === "series") {
      playerActions.hidden = true;
      return;
    }

    const previousEpisode = getPreviousEpisode(video);
    const nextEpisode = getNextEpisode(video);

    if (video.seriesId) {
      playerActions.hidden = !previousEpisode && !nextEpisode;
      previousLink.hidden = !previousEpisode;
      nextLink.hidden = !nextEpisode;

      if (previousEpisode) {
        previousLink.href = buildPlayerUrl(previousEpisode.id);
        previousLink.textContent = "Épisode précédent";
        previousLink.setAttribute("aria-label", `Lire ${previousEpisode.title}`);
      }
      if (nextEpisode) {
        nextLink.href = buildPlayerUrl(nextEpisode.id);
        nextLink.textContent = "Épisode suivant";
        nextLink.setAttribute("aria-label", `Lire ${nextEpisode.title}`);
      }
      return;
    }

    playerActions.hidden = allVideos.length < 2;
    if (allVideos.length < 2) {
      return;
    }

    previousLink.hidden = false;
    nextLink.hidden = false;
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

    const relatedItems = video.seriesId
      ? getSeriesEpisodes(getSeriesForEpisode(video)).filter((item) => item.id !== video.id)
      : videos.filter((item) => item.id !== video.id);

    relatedGrid.innerHTML = relatedItems
      .slice(0, 3)
      .map((item) => renderVideoCard(item, { related: true, tagLimit: 0 }))
      .join("");
    bindImageFallbacks(relatedGrid);
  }

  function isTypingTarget(target) {
    return Boolean(target?.closest?.("input, textarea, select, [contenteditable='true']"));
  }

  function getNativeVideo() {
    return playerMount.querySelector("video");
  }

  function toggleNativePlayback(videoElement) {
    if (!videoElement) {
      playerMount.querySelector(".embed-launch")?.click();
      return;
    }

    if (videoElement.paused) {
      videoElement.play?.();
    } else {
      videoElement.pause?.();
    }
  }

  function seekNativeVideo(videoElement, seconds) {
    if (!videoElement || !Number.isFinite(videoElement.duration)) {
      return;
    }

    videoElement.currentTime = Math.min(
      Math.max(0, videoElement.currentTime + seconds),
      videoElement.duration
    );
  }

  function handlePlayerShortcuts(event) {
    if (playerMount.hidden) {
      return;
    }

    if (isTypingTarget(event.target)) {
      return;
    }

    const key = event.key.toLowerCase();
    const videoElement = getNativeVideo();

    if (key === "f") {
      event.preventDefault();
      togglePlayerFullscreen();
      return;
    }

    if (key === "escape" && isPseudoFullscreen) {
      exitPseudoFullscreen();
      return;
    }

    if (key === " " || key === "k") {
      event.preventDefault();
      toggleNativePlayback(videoElement);
      return;
    }

    if (key === "arrowleft" || key === "j") {
      event.preventDefault();
      seekNativeVideo(videoElement, -10);
      return;
    }

    if (key === "arrowright" || key === "l") {
      event.preventDefault();
      seekNativeVideo(videoElement, 10);
      return;
    }

    if (key === "m" && videoElement) {
      event.preventDefault();
      videoElement.muted = !videoElement.muted;
    }
  }

  function setMiniPlayer(active) {
    if (active === isMiniPlayer || getFullscreenElement() === playerMount || isPseudoFullscreen) {
      return;
    }

    isMiniPlayer = active;
    playerMount.classList.toggle("player-mini", active);
    playerMount.parentElement?.classList.toggle("mini-player-active", active);

    if (active) {
      playerMount.parentElement?.style.setProperty("--mini-placeholder-height", `${playerMount.offsetHeight}px`);
      showFloatingControls();
    } else {
      playerMount.parentElement?.style.removeProperty("--mini-placeholder-height");
    }
  }

  function updateMiniPlayer() {
    const communitySection = document.querySelector("#community-section");
    if (!communitySection || !playerMount || playerMount.hidden || playerMount.querySelector(".source-gate")) {
      setMiniPlayer(false);
      return;
    }

    const stageRect = playerMount.parentElement?.getBoundingClientRect();
    const placeholderHeight =
      Number.parseFloat(playerMount.parentElement?.style.getPropertyValue("--mini-placeholder-height")) ||
      playerMount.offsetHeight;
    const communityRect = communitySection.getBoundingClientRect();
    const shouldMini =
      stageRect &&
      stageRect.top + placeholderHeight < 0 &&
      communityRect.top < window.innerHeight * 0.82 &&
      communityRect.bottom > 120;

    setMiniPlayer(shouldMini);
  }

  function bindMiniPlayer() {
    window.addEventListener("scroll", updateMiniPlayer, { passive: true });
    window.addEventListener("resize", updateMiniPlayer);
    updateMiniPlayer();
  }

  if (!requestedId || requestedId !== video.id) {
    window.history.replaceState(null, "", buildPlayerUrl(video.id));
  }

  renderPlayerPoster(video);
  renderPlayer(video);
  renderMetadata(video);
  renderNavigation();
  renderRelated();
  bindMiniPlayer();

  document.addEventListener("fullscreenchange", updateFullscreenButton);
  document.addEventListener("webkitfullscreenchange", updateFullscreenButton);
  document.addEventListener("fullscreenchange", updateMiniPlayer);
  document.addEventListener("webkitfullscreenchange", updateMiniPlayer);
  document.addEventListener("keydown", handlePlayerShortcuts);
})();
