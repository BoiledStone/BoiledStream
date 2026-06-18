(function () {
  const videos = window.BOILED_VIDEOS || [];
  const utils = window.BOILED_UTILS;
  const grid = document.querySelector("#video-grid");
  const searchInput = document.querySelector("#search-input");
  const sortSelect = document.querySelector("#sort-select");
  const resultCount = document.querySelector("#result-count");
  const videoCount = document.querySelector("#video-count");
  const videoCountLabel = document.querySelector("#video-count-label");
  const movieCount = document.querySelector("#movie-count");
  const seriesCount = document.querySelector("#series-count");
  const heroPosterRail = document.querySelector("#hero-poster-rail");
  const homeHoverBackdrop = document.querySelector("#home-hover-backdrop");
  const emptyState = document.querySelector("#empty-state");
  const browseTags = document.querySelector("#browse-tags");
  const browseLanguages = document.querySelector("#browse-languages");
  const browseYears = document.querySelector("#browse-years");
  const activeFilters = document.querySelector("#active-filters");
  const state = {
    view: "all",
    query: "",
    tag: "",
    year: "",
    lang: "",
    sort: "catalogue"
  };

  if (!utils || !grid || !searchInput) {
    return;
  }

  const {
    buildSearchUrl,
    escapeHtml,
    formatLanguage,
    getDisplayTags,
    getVideoLanguages,
    normalizeKey,
    renderPosterImage,
    renderVideoCard,
    bindImageFallbacks
  } = utils;

  const seriesItems = videos.filter((video) => video.type === "series");
  const movieItems = videos.filter((video) => video.type !== "series");
  const initialParams = new URLSearchParams(window.location.search);
  const initialType = normalizeKey(initialParams.get("type") || "");
  const legacyCategory = initialParams.get("category") || "";
  state.query = initialParams.get("q") || "";
  state.tag = initialParams.get("tag") || "";
  state.year = initialParams.get("year") || "";
  state.lang = initialParams.get("lang") || "";
  if (["films", "film", "movie", "movies"].includes(initialType)) {
    state.view = "films";
  } else if (["series", "serie", "série", "séries"].includes(initialType)) {
    state.view = "series";
  }
  if (normalizeKey(legacyCategory) === "anime") {
    state.tag = state.tag || "Animé";
  } else if (normalizeKey(legacyCategory) === "film") {
    state.view = "films";
  } else if (["serie", "series", "série", "séries"].includes(normalizeKey(legacyCategory))) {
    state.view = "series";
  }

  if (searchInput) {
    searchInput.value = state.query;
  }
  if (sortSelect) {
    sortSelect.value = state.view === "all" ? state.sort : state.view;
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

  function matchesView(video) {
    if (state.view === "films") {
      return video.type !== "series";
    }
    if (state.view === "series") {
      return video.type === "series";
    }

    return true;
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
      videos.filter(
        (video) =>
          matchesView(video) &&
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
    const tags = uniqueSorted(videos.flatMap((video) => getDisplayTags(video))).slice(0, 36);
    const languages = uniqueSorted(
      videos
        .flatMap((video) => getVideoLanguages(video))
        .map(formatLanguage)
    );
    const years = uniqueSorted(
      videos.map((video) => String(getReleaseYear(video) || "")),
      (first, second) => Number(second) - Number(first)
    ).slice(0, 14);

    renderBrowseSelect(browseTags, tags, "tag", state.tag, "Choisir un genre ou thème");
    renderBrowseSelect(browseLanguages, languages, "lang", state.lang, "Choisir une langue");
    renderBrowseSelect(browseYears, years, "year", state.year, "Choisir une année");
  }

  function renderHeroPosterRail() {
    if (!heroPosterRail) {
      return;
    }

    const posterSource = videos.filter((video) => video.posterUrl);

    if (!posterSource.length) {
      heroPosterRail.innerHTML = "";
      return;
    }

    const featuredItems = Array.from(
      { length: Math.max(28, posterSource.length) },
      (_item, index) => posterSource[index % posterSource.length]
    );
    const posterItems = [...featuredItems, ...featuredItems];

    heroPosterRail.innerHTML = `
        <div class="hero-poster-track">
          ${posterItems
      .map(
        (video, index) => `
          <div class="hero-poster" style="--poster-index: ${index};">
            <div class="generated-poster" aria-hidden="true"></div>
            ${renderPosterImage(video.posterUrl, index < 2 ? "eager" : "lazy")}
          </div>
        `
      )
      .join("")}
        </div>
      `;

    bindImageFallbacks(heroPosterRail, ".hero-poster img");
  }

  function bindHomeHoverBackdrop() {
    if (!homeHoverBackdrop || homeHoverBackdrop.dataset.hoverBackdropBound === "true") {
      return;
    }

    homeHoverBackdrop.dataset.hoverBackdropBound = "true";

    document.addEventListener("pointermove", (event) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }

      homeHoverBackdrop.style.setProperty("--home-hover-x", `${Math.round((event.clientX / window.innerWidth) * 100)}%`);
      homeHoverBackdrop.style.setProperty("--home-hover-y", `${Math.round((event.clientY / window.innerHeight) * 100)}%`);
    });
  }

  function bindCardHoverEffects(root) {
    if (!root || root.dataset.hoverEffectsBound === "true") {
      return;
    }

    root.dataset.hoverEffectsBound = "true";

    const resetCard = (card) => {
      card?.classList.remove("is-hovered");
      card?.style.removeProperty("--hover-x");
      card?.style.removeProperty("--hover-y");
      card?.style.removeProperty("--tilt-x");
      card?.style.removeProperty("--tilt-y");
    };

    root.addEventListener("pointermove", (event) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }

      const card = event.target.closest(".video-card");
      if (!card || !root.contains(card)) {
        return;
      }

      const rect = card.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
      const tiltY = (x - 0.5) * 2.4;
      const tiltX = (0.5 - y) * 1.8;

      card.classList.add("is-hovered");
      card.style.setProperty("--hover-x", `${Math.round(x * 100)}%`);
      card.style.setProperty("--hover-y", `${Math.round(y * 100)}%`);
      card.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`);
      card.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`);
    });

    root.addEventListener("pointerout", (event) => {
      const card = event.target.closest(".video-card");
      if (!card || card.contains(event.relatedTarget)) {
        return;
      }

      resetCard(card);
    });

    root.addEventListener("focusout", (event) => {
      resetCard(event.target.closest(".video-card"));
    });
  }

  function renderActiveFilters() {
    if (!activeFilters) {
      return;
    }

    const filters = [
      state.query ? `Recherche: ${state.query}` : "",
      state.view === "films" ? "Affichage: Films" : "",
      state.view === "series" ? "Affichage: Séries" : "",
      state.tag ? `Tag: ${state.tag}` : "",
      state.year ? `Année: ${state.year}` : "",
      state.lang ? `Langue: ${state.lang}` : ""
    ].filter(Boolean);

    activeFilters.hidden = filters.length === 0;
    activeFilters.innerHTML = filters.length
      ? `${filters.map((filter) => `<span>${escapeHtml(filter)}</span>`).join("")}<a href="${escapeHtml(buildSearchUrl())}">Réinitialiser</a>`
      : "";
  }

  function renderVideos() {
    const filteredVideos = getFilteredVideos();
    grid.innerHTML = filteredVideos.map((video) => renderVideoCard(video)).join("");
    if (resultCount) {
      resultCount.textContent = `${filteredVideos.length} résultat${filteredVideos.length > 1 ? "s" : ""}`;
    }
    if (emptyState) {
      emptyState.hidden = filteredVideos.length > 0;
    }
    bindImageFallbacks(grid);
    bindCardHoverEffects(grid);
    renderActiveFilters();
  }

  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderVideos();
  });

  sortSelect?.addEventListener("change", (event) => {
    const value = event.target.value || "catalogue";

    if (value === "films" || value === "series") {
      state.view = value;
      state.sort = "catalogue";
    } else {
      state.view = "all";
      state.sort = value;
    }

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
  renderBrowseGroups();
  renderHeroPosterRail();
  bindHomeHoverBackdrop();
  renderVideos();
})();
