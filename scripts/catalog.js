(function () {
  const videos = window.BOILED_VIDEOS || [];
  const utils = window.BOILED_UTILS;
  const grid = document.querySelector("#video-grid");
  const filterGroup = document.querySelector("#filter-group");
  const searchInput = document.querySelector("#search-input");
  const resultCount = document.querySelector("#result-count");
  const videoCount = document.querySelector("#video-count");
  const videoCountLabel = document.querySelector("#video-count-label");
  const emptyState = document.querySelector("#empty-state");
  const FILTER_ALL = "Tout";
  const FILTER_ANIMATED = "Animé";
  const state = {
    category: FILTER_ALL,
    query: ""
  };

  if (!utils || !grid || !filterGroup || !searchInput) {
    return;
  }

  const { escapeHtml, hasCategoryOrTag, normalizeKey, renderVideoCard, bindImageFallbacks } = utils;

  function searchableText(video) {
    return [
      video.title,
      video.category,
      video.description,
      video.sourceName,
      video.language,
      video.date,
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
        FILTER_ANIMATED,
        ...videos.map((video) => video.category).filter(Boolean)
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

  renderFilters();
  renderVideos();
})();
