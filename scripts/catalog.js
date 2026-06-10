(function () {
  const videos = window.BOILED_VIDEOS || [];
  const utils = window.BOILED_UTILS;
  const grid = document.querySelector("#video-grid");
  const filterGroup = document.querySelector("#filter-group");
  const searchInput = document.querySelector("#search-input");
  const resultCount = document.querySelector("#result-count");
  const videoCount = document.querySelector("#video-count");
  const videoCountLabel = document.querySelector("#video-count-label");
  const movieCount = document.querySelector("#movie-count");
  const seriesCount = document.querySelector("#series-count");
  const episodeCount = document.querySelector("#episode-count");
  const seriesRow = document.querySelector("#series-row");
  const featuredPosters = document.querySelector("#featured-posters");
  const emptyState = document.querySelector("#empty-state");
  const FILTER_ALL = "Tout";
  const FILTER_SERIES = "Série";
  const FILTER_ANIMATED = "Animé";
  const state = {
    category: FILTER_ALL,
    query: ""
  };

  if (!utils || !grid || !filterGroup || !searchInput) {
    return;
  }

  const {
    buildDirectPlayerUrl,
    escapeHtml,
    formatLanguage,
    getDisplayTags,
    getEpisodeCount,
    getSeasonLabel,
    hasCategoryOrTag,
    normalizeKey,
    renderPosterImage,
    renderVideoCard,
    bindImageFallbacks
  } = utils;

  const seriesItems = videos.filter((video) => video.type === "series");
  const movieItems = videos.filter((video) => video.type !== "series");

  function searchableText(video) {
    return [
      video.title,
      video.category,
      video.description,
      video.sourceName,
      video.language,
      video.date,
      ...(video.seasons || []).map((season) => season.label),
      ...(video.tags || [])
    ]
      .filter(Boolean)
      .join(" ");
  }

  function matchesSearch(video) {
    const query = normalizeKey(state.query.trim());

    return !query || normalizeKey(searchableText(video)).includes(query);
  }

  function matchesCategory(video) {
    if (state.category === FILTER_ALL) {
      return true;
    }

    if (state.category === FILTER_SERIES) {
      return video.type === "series";
    }

    return state.category === FILTER_ANIMATED
      ? hasCategoryOrTag(video, "anime")
      : video.category === state.category;
  }

  function getFilteredVideos() {
    return videos.filter((video) => matchesCategory(video) && matchesSearch(video));
  }

  function renderFilters() {
    const categories = [
      ...new Set([
        FILTER_ALL,
        FILTER_SERIES,
        FILTER_ANIMATED,
        ...videos
          .map((video) => video.category)
          .filter(Boolean)
          .filter((category) => normalizeKey(category) !== normalizeKey(FILTER_SERIES))
      ])
    ];

    filterGroup.innerHTML = categories
      .map((category) => {
        const isActive = category === state.category;
        return `
          <button
            class="filter-button${isActive ? " active" : ""}"
            type="button"
            data-category="${escapeHtml(category)}"
            aria-pressed="${isActive}"
          >
            ${escapeHtml(category)}
          </button>
        `;
      })
      .join("");
  }

  function renderVideos() {
    const filteredVideos = getFilteredVideos();
    grid.innerHTML = filteredVideos.map((video) => renderVideoCard(video)).join("");
    if (resultCount) {
      resultCount.textContent = `${filteredVideos.length} titre${filteredVideos.length > 1 ? "s" : ""}`;
    }
    if (emptyState) {
      emptyState.hidden = filteredVideos.length > 0;
    }
    bindImageFallbacks(grid);
  }

  function renderFeaturedPosters() {
    if (!featuredPosters) {
      return;
    }

    const featured = [...seriesItems, ...movieItems].filter((video) => video.posterUrl).slice(0, 5);
    featuredPosters.innerHTML = featured
      .map(
        (video) => `
          <span class="featured-poster" title="${escapeHtml(video.title)}">
            ${renderPosterImage(video.posterUrl)}
          </span>
        `
      )
      .join("");
    bindImageFallbacks(featuredPosters, ".featured-poster img");
  }

  function renderSeriesRow() {
    if (!seriesRow) {
      return;
    }

    seriesRow.innerHTML = seriesItems
      .map((series) => {
        const sourceName = series.sourceName || "Player";
        const seasonLabel = getSeasonLabel(series) || "Série";
        const episodes = getEpisodeCount(series);
        const languages = (series.languages || []).map(formatLanguage).filter(Boolean);
        const languagePill = languages.length ? `<span>${escapeHtml(languages.join(" + "))}</span>` : "";
        const tags = getDisplayTags(series, 3)
          .map((tag) => `<span>${escapeHtml(tag)}</span>`)
          .join("");

        return `
          <a class="series-card" href="${buildDirectPlayerUrl(series.id)}" data-source="${escapeHtml(normalizeKey(sourceName))}" aria-label="Ouvrir ${escapeHtml(series.title)}">
            <div class="series-card-poster">
              <div class="generated-poster" aria-hidden="true"></div>
              ${renderPosterImage(series.posterUrl)}
            </div>
            <div class="series-card-copy">
              <div class="series-card-meta">
                <span>${escapeHtml(sourceName)}</span>
                ${languagePill}
              </div>
              <h3>${escapeHtml(series.title)}</h3>
              <p>${escapeHtml(series.description || "")}</p>
              <div class="series-card-stats">
                <span>${escapeHtml(seasonLabel)}</span>
                <span>${episodes} épisode${episodes > 1 ? "s" : ""}</span>
              </div>
              <div class="series-card-tags">${tags}</div>
            </div>
          </a>
        `;
      })
      .join("");

    bindImageFallbacks(seriesRow, ".series-card-poster img");
  }

  filterGroup.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) {
      return;
    }

    state.category = button.dataset.category;
    renderFilters();
    renderVideos();
  });

  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderVideos();
  });

  if (videoCount) {
    videoCount.textContent = String(videos.length);
  }
  if (videoCountLabel) {
    videoCountLabel.textContent = videos.length > 1 ? "médias disponibles" : "média disponible";
  }
  if (movieCount) {
    movieCount.textContent = String(movieItems.length);
  }
  if (seriesCount) {
    seriesCount.textContent = String(seriesItems.length);
  }
  if (episodeCount) {
    episodeCount.textContent = String(seriesItems.reduce((total, series) => total + getEpisodeCount(series), 0));
  }

  renderFeaturedPosters();
  renderSeriesRow();
  renderFilters();
  renderVideos();
})();
