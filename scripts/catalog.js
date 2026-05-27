(function () {
  const videos = window.BOILED_VIDEOS || [];
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

  // Les titres, tags et URLs viennent du catalogue; on les échappe avant
  // injection dans des templates HTML pour éviter de casser la page.
  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function buildPlayerUrl(id) {
    return `player.html?video=${encodeURIComponent(id)}`;
  }

  const TECH_TAGS = ["Film","Série","Serie","Animé","Anime","FR","VOSTFR","EN","VF","HD","SD","HEVC","BluRay","WEB-DL","YouTube","1080p","720p","2160p"];

  function getVideoType(video) {
    if (video.type) return video.type;
    if (video.tags.includes("Animé")) return "Animé";
    return video.category || "Film";
  }

  function getVideoYear(video) {
    return video.year || (video.tags.find((tag) => /^\d{4}$/.test(tag)) || "—");
  }

  function getVideoLanguages(video) {
    if (Array.isArray(video.languages) && video.languages.length) {
      return video.languages.join("/");
    }

    const languageTags = video.tags.filter((tag) =>
      ["FR","EN","VF","VOSTFR","JP"].includes(tag) ||
      /fran/i.test(tag)
    );

    return languageTags.length ? languageTags.join("/") : "Multi";
  }

  function getDisplayTags(video) {
    return video.tags.filter((tag) =>
      !TECH_TAGS.includes(tag) &&
      !/^\d{3,4}x\d{3,4}$/.test(tag) &&
      !/^\d{4}$/.test(tag)
    ).slice(0, 3);
  }


  function hasAnimatedTag(video) {
    return video.tags.includes("Animé");
  }

  // La recherche couvre les champs visibles et les tags pour rester simple à maintenir.
  function matchesSearch(video) {
    const query = state.query.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return [video.title, video.category, video.description, ...video.tags]
      .join(" ")
      .toLowerCase()
      .includes(query);
  }

  function getFilteredVideos() {
    return videos.filter((video) => {
      const categoryMatches =
        state.category === FILTER_ALL ||
        (state.category === FILTER_ANIMATED ? hasAnimatedTag(video) : video.category === state.category);
      return categoryMatches && matchesSearch(video);
    });
  }

  function renderFilters() {
    // Le filtre Animé est basé sur le tag exact; les autres viennent des catégories.
    const categories = [FILTER_ALL, FILTER_ANIMATED, ...new Set(videos.map((video) => video.category))];
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

  function renderCard(video) {
    const poster = video.posterUrl
      ? `<img src="${escapeHtml(video.posterUrl)}" alt="" loading="lazy">`
      : "";
    const quality = [video.resolution, video.format].filter(Boolean).join(" • ");
    const sourceName = video.sourceName || "Source";
    const tagList = getDisplayTags(video)
      .map((tag) => `<span class="card-tag">${escapeHtml(tag)}</span>`)
      .join("");
    const metadataLine = `${getVideoType(video)} • ${getVideoYear(video)} • ${getVideoLanguages(video)}`;

    return `
      <a class="video-card" href="${buildPlayerUrl(video.id)}" data-video-id="${escapeHtml(video.id)}" data-source="${escapeHtml(sourceName.toLowerCase())}" aria-label="Ouvrir ${escapeHtml(video.title)}">
        <div class="thumb">
          <div class="generated-poster" aria-hidden="true"></div>
          ${poster}
          <span class="play-badge" aria-hidden="true"></span>
        </div>
        <div class="card-body">
          <h3>${escapeHtml(video.title)}</h3>
          <div class="card-meta">
            <span class="source-pill">${escapeHtml(sourceName)}</span>
            <span class="duration-pill">${escapeHtml(video.duration)}</span>
          </div>
          <div class="card-tags" aria-label="Tags">${tagList}</div>
          <p class="quality-text">${escapeHtml(quality)}</p><p class="media-text">${escapeHtml(metadataLine)}</p>
        </div>
      </a>
    `;
  }

  function bindPosterFallbacks() {
    // Si une image externe disparaît, le fond généré reste visible à la place.
    grid.querySelectorAll(".thumb img").forEach((image) => {
      image.addEventListener("error", () => {
        image.remove();
      });
    });
  }

  function renderVideos() {
    // Toute modification de recherche ou de filtre reconstruit uniquement la grille.
    const filteredVideos = getFilteredVideos();
    grid.innerHTML = filteredVideos.map(renderCard).join("");
    resultCount.textContent = `${filteredVideos.length} titre${filteredVideos.length > 1 ? "s" : ""}`;
    emptyState.hidden = filteredVideos.length > 0;
    bindPosterFallbacks();
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

  videoCount.textContent = String(videos.length);
  videoCountLabel.textContent = videos.length > 1 ? "médias disponibles" : "média disponible";
  renderFilters();
  renderVideos();
})();
