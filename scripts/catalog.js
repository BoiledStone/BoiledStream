(function () {
  const videos = window.BOILED_VIDEOS || [];
  const utils = window.BOILED_UTILS;
  const grid = document.querySelector("#video-grid");
  const filterGroup = document.querySelector("#filter-group");
  const searchInput = document.querySelector("#search-input");
  const sortSelect = document.querySelector("#sort-select");
  const resultCount = document.querySelector("#result-count");
  const videoCount = document.querySelector("#video-count");
  const videoCountLabel = document.querySelector("#video-count-label");
  const movieCount = document.querySelector("#movie-count");
  const seriesCount = document.querySelector("#series-count");
  const seriesSearchInput = document.querySelector("#series-search-input");
  const seriesResultCount = document.querySelector("#series-result-count");
  const seriesRow = document.querySelector("#series-row");
  const seriesEmptyState = document.querySelector("#series-empty-state");
  const emptyState = document.querySelector("#empty-state");
  const browseTags = document.querySelector("#browse-tags");
  const browseLanguages = document.querySelector("#browse-languages");
  const browseYears = document.querySelector("#browse-years");
  const activeFilters = document.querySelector("#active-filters");
  const FILTER_ALL = "Tout";
  const FILTER_ANIMATED = "Animé";
  const state = {
    category: FILTER_ALL,
    query: "",
    tag: "",
    year: "",
    lang: "",
    sort: "catalogue"
  };
  const seriesState = {
    query: ""
  };

  if (!utils || !grid || !filterGroup || !searchInput) {
    return;
  }

  const {
    buildAccentStyle,
    buildDirectPlayerUrl,
    buildSearchUrl,
    escapeHtml,
    formatLanguage,
    getCardTypeLabel,
    getDisplayTags,
    getVideoLanguages,
    getSeasonLabel,
    hasCategoryOrTag,
    normalizeKey,
    renderPosterImage,
    renderVideoCard,
    bindImageFallbacks
  } = utils;

  const seriesItems = videos.filter((video) => video.type === "series");
  const movieItems = videos.filter((video) => video.type !== "series");
  const initialParams = new URLSearchParams(window.location.search);
  state.query = initialParams.get("q") || "";
  state.tag = initialParams.get("tag") || "";
  state.year = initialParams.get("year") || "";
  state.lang = initialParams.get("lang") || "";
  state.category = initialParams.get("category") || FILTER_ALL;

  if (searchInput) {
    searchInput.value = state.query;
  }

  function getReleaseYear(video) {
    const match = String(video.date || "").match(/\d{4}/);

    return match ? Number(match[0]) : 0;
  }

  function compareTitle(first, second) {
    return String(first.title || "").localeCompare(String(second.title || ""), "fr", {
      sensitivity: "base"
    });
  }

  function searchableText(video) {
    return [
      video.title,
      video.category,
      video.description,
      video.language,
      video.date,
      ...(video.seasons || []).map((season) => season.label),
      ...(video.tags || [])
    ]
      .filter(Boolean)
      .join(" ");
  }

  function matchesSearch(video, queryValue = state.query) {
    const query = normalizeKey(queryValue.trim());

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

  function matchesTag(video) {
    if (!state.tag) {
      return true;
    }

    const expected = normalizeKey(state.tag);

    return (
      normalizeKey(video.category) === expected ||
      getDisplayTags(video).some((tag) => normalizeKey(tag) === expected)
    );
  }

  function matchesYear(video) {
    if (!state.year) {
      return true;
    }

    return String(getReleaseYear(video)) === String(state.year);
  }

  function matchesLanguage(video) {
    if (!state.lang) {
      return true;
    }

    const expected = normalizeKey(state.lang);

    return getVideoLanguages(video).some(
      (language) =>
        normalizeKey(language) === expected ||
        normalizeKey(formatLanguage(language)) === expected
    );
  }

  function sortVideos(items) {
    const sortedItems = [...items];

    if (state.sort === "title") {
      sortedItems.sort(compareTitle);
    } else if (state.sort === "year-desc") {
      sortedItems.sort(
        (first, second) => getReleaseYear(second) - getReleaseYear(first) || compareTitle(first, second)
      );
    } else if (state.sort === "year-asc") {
      sortedItems.sort(
        (first, second) => getReleaseYear(first) - getReleaseYear(second) || compareTitle(first, second)
      );
    }

    return sortedItems;
  }

  function getFilteredVideos() {
    return sortVideos(
      movieItems.filter(
        (video) =>
          matchesCategory(video) &&
          matchesTag(video) &&
          matchesYear(video) &&
          matchesLanguage(video) &&
          matchesSearch(video)
      )
    );
  }

  function uniqueSorted(values, compare = (first, second) => first.localeCompare(second, "fr")) {
    return values
      .filter(Boolean)
      .filter(
        (entry, index, list) =>
          list.findIndex((value) => normalizeKey(value) === normalizeKey(entry)) === index
      )
      .sort(compare);
  }

  function renderBrowseSelect(select, values, key, activeValue = "", placeholder = "Choisir") {
    if (!select) {
      return;
    }

    select.innerHTML = [
      `<option value="">${escapeHtml(placeholder)}</option>`,
      ...values
      .map((value) => {
        const isActive = normalizeKey(value) === normalizeKey(activeValue);
        const href = buildSearchUrl({ [key]: value });

        return `<option value="${escapeHtml(href)}"${isActive ? " selected" : ""}>${escapeHtml(value)}</option>`;
      })
    ].join("");

    select.onchange = () => {
      if (select.value) {
        window.location.href = select.value;
      }
    };
  }

  function renderBrowseGroups() {
    const allItems = [...movieItems, ...seriesItems];
    const tags = uniqueSorted(allItems.flatMap((video) => getDisplayTags(video))).slice(0, 36);
    const languages = uniqueSorted(
      allItems
        .flatMap((video) => getVideoLanguages(video))
        .map(formatLanguage)
    );
    const years = uniqueSorted(
      allItems.map((video) => String(getReleaseYear(video) || "")),
      (first, second) => Number(second) - Number(first)
    ).slice(0, 14);

    renderBrowseSelect(browseTags, tags, "tag", state.tag, "Choisir un genre ou thème");
    renderBrowseSelect(browseLanguages, languages, "lang", state.lang, "Choisir une langue");
    renderBrowseSelect(browseYears, years, "year", state.year, "Choisir une année");
  }

  function renderActiveFilters() {
    if (!activeFilters) {
      return;
    }

    const filters = [
      state.query ? `Recherche: ${state.query}` : "",
      state.tag ? `Tag: ${state.tag}` : "",
      state.year ? `Année: ${state.year}` : "",
      state.lang ? `Langue: ${state.lang}` : "",
      state.category !== FILTER_ALL ? `Catégorie: ${state.category}` : ""
    ].filter(Boolean);

    activeFilters.hidden = filters.length === 0;
    activeFilters.innerHTML = filters.length
      ? `${filters.map((filter) => `<span>${escapeHtml(filter)}</span>`).join("")}<a href="${escapeHtml(buildSearchUrl())}">Réinitialiser</a>`
      : "";
  }

  function renderFilters() {
    const categories = [
      ...new Set([
        FILTER_ALL,
        FILTER_ANIMATED,
        ...movieItems
          .map((video) => video.category)
          .filter(Boolean)
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
    renderActiveFilters();
  }

  function renderSeriesRow() {
    if (!seriesRow) {
      return;
    }

    const filteredSeries = seriesItems.filter((series) => matchesSearch(series, seriesState.query));

    if (seriesResultCount) {
      seriesResultCount.textContent = `${filteredSeries.length} série${filteredSeries.length > 1 ? "s" : ""}`;
    }
    if (seriesEmptyState) {
      seriesEmptyState.hidden = filteredSeries.length > 0;
    }

    seriesRow.innerHTML = filteredSeries
      .map((series) => {
        const typeLabel = getCardTypeLabel(series);
        const seasonLabel = getSeasonLabel(series) || "Série";
        const accentStyle = buildAccentStyle(series.accentColor);
        const accentLock = series.accentColor ? ' data-accent-lock="true"' : "";
        const languages = (series.languages || []).map(formatLanguage).filter(Boolean);
        const languagePill = languages.length ? `<span>${escapeHtml(languages.join(" + "))}</span>` : "";
        const tags = getDisplayTags(series, 3)
          .map((tag) => `<span>${escapeHtml(tag)}</span>`)
          .join("");

        return `
          <a class="series-card" href="${buildDirectPlayerUrl(series.id)}"${accentLock}${accentStyle} aria-label="Ouvrir ${escapeHtml(series.title)}">
            <div class="series-card-poster">
              <div class="generated-poster" aria-hidden="true"></div>
              ${renderPosterImage(series.posterUrl)}
            </div>
            <div class="series-card-copy">
              <h3>${escapeHtml(series.title)}</h3>
              <div class="series-card-meta">
                <span class="type-pill">${escapeHtml(typeLabel)}</span>
                ${languagePill}
              </div>
              <p>${escapeHtml(series.description || "")}</p>
              <div class="series-card-stats">
                <span>${escapeHtml(seasonLabel)}</span>
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

  sortSelect?.addEventListener("change", (event) => {
    state.sort = event.target.value || "catalogue";
    renderVideos();
  });

  seriesSearchInput?.addEventListener("input", (event) => {
    seriesState.query = event.target.value;
    renderSeriesRow();
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
  renderBrowseGroups();
  renderSeriesRow();
  renderFilters();
  renderVideos();
})();
