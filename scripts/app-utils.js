(function () {
  const HIDDEN_TAGS = new Set([
    "film",
    "serie",
    "series",
    "anime",
    "animation",
    "francais",
    "anglais",
    "english",
    "vf",
    "vostfr",
    "multi",
    "hevc",
    "sd",
    "hd",
    "uhd",
    "4k",
    "youtube",
    "uqload"
  ]);

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeKey(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function buildPlayerUrl(id) {
    const encodedId = encodeURIComponent(id);

    if (window.location.protocol === "file:") {
      return buildDirectPlayerUrl(id);
    }

    return window.location.pathname.includes("/watch/") ? `${encodedId}.html` : `watch/${encodedId}.html`;
  }

  function buildDirectPlayerUrl(id) {
    const url = `player.html?video=${encodeURIComponent(id)}`;

    return window.location.pathname.includes("/watch/") ? `../${url}` : url;
  }

  function formatLanguage(value) {
    const labels = {
      en: "Anglais",
      english: "Anglais",
      fr: "Français",
      francais: "Français",
      vf: "Français",
      jp: "Japonais",
      multi: "Multi",
      vostfr: "VOSTFR",
      "vf+vostfr": "VF + VOSTFR",
      french: "French",
      truefrench: "TrueFrench"
    };
    const key = normalizeKey(value);

    return labels[key] || String(value || "").trim() || "Français";
  }

  function isDisplayTag(tag) {
    const key = normalizeKey(tag);

    return (
      Boolean(key) &&
      !HIDDEN_TAGS.has(key) &&
      !/^\d+x\d+$/i.test(key) &&
      !/^(19|20)\d{2}$/.test(key)
    );
  }

  function getDisplayTags(video, limit = Infinity) {
    return (video.tags || [])
      .filter((tag) => String(tag || "").trim())
      .filter(isDisplayTag)
      .slice(0, limit);
  }

  function hasCategoryOrTag(video, expectedKey) {
    return (
      normalizeKey(video.category) === expectedKey ||
      (video.tags || []).some((tag) => normalizeKey(tag) === expectedKey)
    );
  }

  function sourceKey(sourceName) {
    return normalizeKey(sourceName || "source");
  }

  function getAssetUrl(url) {
    const value = String(url || "").trim();

    if (
      !value ||
      /^(https?:|data:|blob:|#|\/)/i.test(value) ||
      value.startsWith("../")
    ) {
      return value;
    }

    return window.location.pathname.includes("/watch/") ? `../${value}` : value;
  }

  function getEpisodeCount(video) {
    return (
      video.episodeCount ||
      (video.seasons || []).reduce((total, season) => total + (season.episodes || []).length, 0)
    );
  }

  function getSeasonLabel(video) {
    const count = video.seasonCount || (video.seasons || []).length;

    if (!count) {
      return "";
    }

    return `${count} saison${count > 1 ? "s" : ""}`;
  }

  function getCardSourceName(video) {
    return video.type === "series" ? video.sourceName || "Serie" : video.sourceName || "Source";
  }

  function getCardStat(video) {
    if (video.type === "series") {
      const seasonLabel = getSeasonLabel(video);

      return seasonLabel;
    }

    return video.duration || "";
  }

  function renderPosterImage(posterUrl, loading = "lazy") {
    const resolvedPosterUrl = getAssetUrl(posterUrl);

    return resolvedPosterUrl
      ? `<img src="${escapeHtml(resolvedPosterUrl)}" alt="" loading="${escapeHtml(loading)}">`
      : "";
  }

  function renderCardTags(video, limit) {
    const tagList = getDisplayTags(video, limit)
      .map((tag) => `<span class="card-tag">${escapeHtml(tag)}</span>`)
      .join("");

    return `<div class="card-tags" aria-label="Tags">${tagList}</div>`;
  }

  function renderVideoCard(video, options = {}) {
    const { related = false, tagLimit = 2 } = options;
    const sourceName = getCardSourceName(video);
    const cardStat = getCardStat(video);
    const cardType = video.type === "series" ? "Série" : video.category || "Film";
    const playerHref = video.type === "series" ? buildDirectPlayerUrl(video.id) : buildPlayerUrl(video.id);

    return `
      <a class="video-card${related ? " related-card" : ""}" href="${playerHref}" data-video-id="${escapeHtml(video.id)}" data-source="${escapeHtml(sourceKey(sourceName))}" data-type="${escapeHtml(video.type || "movie")}" aria-label="Ouvrir ${escapeHtml(video.title)}">
        <div class="thumb">
          <div class="generated-poster" aria-hidden="true"></div>
          ${renderPosterImage(video.posterUrl)}
          <span class="card-kind">${escapeHtml(cardType)}</span>
          <span class="play-badge" aria-hidden="true"></span>
        </div>
        <div class="card-body">
          <h3>${escapeHtml(video.title)}</h3>
          <div class="card-meta">
            <span class="source-pill">${escapeHtml(sourceName)}</span>
            <span class="duration-pill">${escapeHtml(cardStat)}</span>
          </div>
          ${tagLimit > 0 ? renderCardTags(video, tagLimit) : ""}
        </div>
      </a>
    `;
  }

  function bindImageFallbacks(root, selector = ".thumb img") {
    root?.querySelectorAll(selector).forEach((image) => {
      image.addEventListener("error", () => image.remove(), { once: true });
      if (image.complete && image.naturalWidth === 0) {
        image.remove();
      }
    });
  }

  window.BOILED_UTILS = Object.freeze({
    buildPlayerUrl,
    buildDirectPlayerUrl,
    escapeHtml,
    formatLanguage,
    getAssetUrl,
    getEpisodeCount,
    getSeasonLabel,
    getDisplayTags,
    hasCategoryOrTag,
    normalizeKey,
    renderPosterImage,
    renderVideoCard,
    bindImageFallbacks
  });
})();
