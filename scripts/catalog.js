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
  const emptyState = document.querySelector("#empty-state");
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

  function bindCardHoverEffects(root) {
    if (!root || root.dataset.hoverEffectsBound === "true") {
      return;
    }

    root.dataset.hoverEffectsBound = "true";
    root.classList.add("is-grid-glowing");
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let activeCard = null;
    let pendingPointer = null;
    let hoverFrame = 0;

    const getCardFromTarget = (target) =>
      target instanceof Element ? target.closest(".video-card") : null;
    const resetCard = (card) => {
      card?.classList.remove("is-hovered");
      card?.style.removeProperty("--hover-x");
      card?.style.removeProperty("--hover-y");
      card?.style.removeProperty("--tilt-x");
      card?.style.removeProperty("--tilt-y");
    };
    const setCursorGlow = (pointer) => {
      const gridRect = root.getBoundingClientRect();
      root.classList.add("is-cursor-glowing");
      root.style.setProperty("--poster-cursor-glow-x", `${Math.round(pointer.clientX - gridRect.left)}px`);
      root.style.setProperty("--poster-cursor-glow-y", `${Math.round(pointer.clientY - gridRect.top)}px`);
    };
    const resetCursorGlow = () => {
      root.classList.remove("is-cursor-glowing");
    };
    const resetActiveCard = () => {
      resetCard(activeCard);
      activeCard = null;
    };
    const resetHoverState = () => {
      if (hoverFrame) {
        window.cancelAnimationFrame(hoverFrame);
        hoverFrame = 0;
      }
      pendingPointer = null;
      resetActiveCard();
      resetCursorGlow();
    };
    const applyHoverFrame = () => {
      hoverFrame = 0;
      const pointer = pendingPointer;
      pendingPointer = null;

      if (!pointer) {
        return;
      }

      setCursorGlow(pointer);

      const card = getCardFromTarget(pointer.target);
      if (!card || !root.contains(card)) {
        resetActiveCard();
        return;
      }

      if (activeCard && activeCard !== card) {
        resetCard(activeCard);
      }
      activeCard = card;

      const rect = card.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (pointer.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (pointer.clientY - rect.top) / rect.height));
      const tiltY = (x - 0.5) * 2.4;
      const tiltX = (0.5 - y) * 1.8;

      card.classList.add("is-hovered");
      card.style.setProperty("--hover-x", `${Math.round(x * 100)}%`);
      card.style.setProperty("--hover-y", `${Math.round(y * 100)}%`);
      card.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`);
      card.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`);
    };

    root.addEventListener("pointermove", (event) => {
      if (reducedMotionQuery.matches) {
        return;
      }

      if (!root.contains(event.target)) {
        return;
      }

      pendingPointer = {
        clientX: event.clientX,
        clientY: event.clientY,
        target: event.target
      };
      if (!hoverFrame) {
        hoverFrame = window.requestAnimationFrame(applyHoverFrame);
      }
    });

    root.addEventListener("pointerout", (event) => {
      const card = getCardFromTarget(event.target);
      if (!card) {
        if (!root.contains(event.relatedTarget)) {
          resetHoverState();
        }
        return;
      }
      if (card.contains(event.relatedTarget)) {
        return;
      }

      resetCard(card);
      if (activeCard === card) {
        activeCard = null;
      }
      if (!root.contains(event.relatedTarget)) {
        resetHoverState();
      }
    });

    root.addEventListener("pointerleave", resetHoverState);

    root.addEventListener("focusout", (event) => {
      const card = getCardFromTarget(event.target);
      resetCard(card);
      if (activeCard === card) {
        activeCard = null;
      }
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
  renderHeroPosterRail();
  renderVideos();
})();
