(function () {
  const HIDDEN_TAGS = new Set([
    "film",
    "serie",
    "series",
    "anime",
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
    return `player.html?video=${encodeURIComponent(id)}`;
  }

  function getCardSourceName(video) {
    return video.type === "series" ? "Serie" : video.sourceName || "Source";
  }

  function getCardDuration(video) {
    if (video.type === "series") {
      return `${video.episodeCount || 0} ep.`;
    }

    return video.duration || "";
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
      vostfr: "VOSTFR"
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

  function renderPosterImage(posterUrl, loading = "lazy") {
    return posterUrl
      ? `<img src="${escapeHtml(posterUrl)}" alt="" loading="${escapeHtml(loading)}">`
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
    const duration = getCardDuration(video);

    return `
      <a class="video-card${related ? " related-card" : ""}" href="${buildPlayerUrl(video.id)}" data-video-id="${escapeHtml(video.id)}" data-source="${escapeHtml(sourceKey(sourceName))}" aria-label="Ouvrir ${escapeHtml(video.title)}">
        <div class="thumb">
          <div class="generated-poster" aria-hidden="true"></div>
          ${renderPosterImage(video.posterUrl)}
          <span class="play-badge" aria-hidden="true"></span>
        </div>
        <div class="card-body">
          <h3>${escapeHtml(video.title)}</h3>
          <div class="card-meta">
            <span class="source-pill">${escapeHtml(sourceName)}</span>
            <span class="duration-pill">${escapeHtml(duration)}</span>
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
    escapeHtml,
    formatLanguage,
    getDisplayTags,
    hasCategoryOrTag,
    normalizeKey,
    renderPosterImage,
    renderVideoCard,
    bindImageFallbacks
  });
})();
