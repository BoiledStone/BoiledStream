(function () {
  const videos = window.BOILED_VIDEOS || [];
  const grid = document.querySelector("#video-grid");
  const filterGroup = document.querySelector("#filter-group");
  const searchInput = document.querySelector("#search-input");
  const resultCount = document.querySelector("#result-count");
  const videoCount = document.querySelector("#video-count");
  const videoCountLabel = document.querySelector("#video-count-label");
  const emptyState = document.querySelector("#empty-state");
  const state = {
    category: "Toutes",
    query: ""
  };

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
      const categoryMatches = state.category === "Toutes" || video.category === state.category;
      return categoryMatches && matchesSearch(video);
    });
  }

  function renderFilters() {
    const categories = ["Toutes", ...new Set(videos.map((video) => video.category))];
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
    const quality = [video.resolution, video.format].filter(Boolean).join(" - ");

    return `
      <a class="video-card" href="${buildPlayerUrl(video.id)}" aria-label="Ouvrir ${escapeHtml(video.title)}">
        <div class="thumb">
          <div class="generated-poster" aria-hidden="true"></div>
          ${poster}
          <span class="play-badge">Lire</span>
          <span class="duration-pill">${escapeHtml(video.duration)}</span>
        </div>
        <div class="card-body">
          <div class="card-meta">
            <span class="category-dot">${escapeHtml(video.category)}</span>
            <span>${escapeHtml(quality)}</span>
          </div>
          <h3>${escapeHtml(video.title)}</h3>
        </div>
      </a>
    `;
  }

  function bindPosterFallbacks() {
    grid.querySelectorAll(".thumb img").forEach((image) => {
      image.addEventListener("error", () => {
        image.remove();
      });
    });
  }

  function renderVideos() {
    const filteredVideos = getFilteredVideos();
    grid.innerHTML = filteredVideos.map(renderCard).join("");
    resultCount.textContent = `${filteredVideos.length} resultat${filteredVideos.length > 1 ? "s" : ""}`;
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
  videoCountLabel.textContent = videos.length > 1 ? "videos disponibles" : "video disponible";
  renderFilters();
  renderVideos();
})();
