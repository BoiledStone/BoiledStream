(function () {
  const videos = window.BOILED_VIDEOS || [];
  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get("video");
  const video = videos.find((item) => item.id === requestedId) || videos[0];
  const currentIndex = videos.findIndex((item) => item.id === video.id);
  const previousVideo = videos[(currentIndex - 1 + videos.length) % videos.length];
  const nextVideo = videos[(currentIndex + 1) % videos.length];

  const playerMount = document.querySelector("#player-mount");
  const title = document.querySelector("#player-title");
  const category = document.querySelector("#player-category");
  const description = document.querySelector("#player-description");
  const duration = document.querySelector("#player-duration");
  const quality = document.querySelector("#player-quality");
  const source = document.querySelector("#player-source");
  const tags = document.querySelector("#player-tags");
  const previousLink = document.querySelector("#previous-link");
  const nextLink = document.querySelector("#next-link");
  const playerActions = document.querySelector("#player-actions");
  const relatedGrid = document.querySelector("#related-grid");

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

  function renderRelatedCard(item) {
    const poster = item.posterUrl ? `<img src="${escapeHtml(item.posterUrl)}" alt="" loading="lazy">` : "";
    const itemQuality = [item.resolution, item.format].filter(Boolean).join(" - ");

    return `
      <a class="video-card" href="${buildPlayerUrl(item.id)}" aria-label="Ouvrir ${escapeHtml(item.title)}">
        <div class="thumb">
          <div class="generated-poster" aria-hidden="true"></div>
          ${poster}
          <span class="poster-label">${escapeHtml(item.category)}</span>
          <span class="play-badge">Lire</span>
          <span class="duration-pill">${escapeHtml(item.duration)}</span>
        </div>
        <div class="card-body">
          <div class="card-meta">
            <span class="category-dot">${escapeHtml(item.category)}</span>
            <span>${escapeHtml(itemQuality)}</span>
          </div>
          <h3>${escapeHtml(item.title)}</h3>
        </div>
      </a>
    `;
  }

  function renderPlayer(item) {
    if (item.embedUrl) {
      playerMount.innerHTML = `
        <iframe
          class="main-video"
          src="${escapeHtml(item.embedUrl)}"
          title="${escapeHtml(item.title)}"
          allow="fullscreen; picture-in-picture; encrypted-media"
          allowfullscreen
        ></iframe>
      `;
      return;
    }

    if (item.videoUrl) {
      const posterAttribute = item.posterUrl ? ` poster="${escapeHtml(item.posterUrl)}"` : "";
      playerMount.innerHTML = `
        <video class="main-video" controls preload="metadata" playsinline${posterAttribute}>
          <source src="${escapeHtml(item.videoUrl)}" type="video/mp4">
          Votre navigateur ne prend pas en charge la lecture vidéo HTML5.
        </video>
      `;
      return;
    }

    playerMount.innerHTML = `
      <div class="main-video player-error">
        <p>Aucun player n’est disponible pour cette vidéo.</p>
      </div>
    `;
  }

  function bindPosterFallbacks() {
    relatedGrid.querySelectorAll(".thumb img").forEach((image) => {
      image.addEventListener("error", () => {
        image.remove();
      });
    });
  }

  if (!requestedId || requestedId !== video.id) {
    window.history.replaceState(null, "", buildPlayerUrl(video.id));
  }

  document.title = `BoiledStream - ${video.title}`;
  renderPlayer(video);
  title.textContent = video.title;
  category.textContent = video.category;
  description.textContent = video.description;
  duration.textContent = video.duration;
  quality.textContent = [video.resolution, video.format].filter(Boolean).join(" - ");
  source.href = video.sourceUrl;
  source.textContent = video.sourceName;
  tags.innerHTML = video.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
  playerActions.hidden = videos.length < 2;
  if (videos.length > 1) {
    previousLink.href = buildPlayerUrl(previousVideo.id);
    previousLink.textContent = `Précédente`;
    previousLink.setAttribute("aria-label", `Lire ${previousVideo.title}`);
    nextLink.href = buildPlayerUrl(nextVideo.id);
    nextLink.textContent = `Suivante`;
    nextLink.setAttribute("aria-label", `Lire ${nextVideo.title}`);
  }
  relatedGrid.innerHTML = videos
    .filter((item) => item.id !== video.id)
    .slice(0, 3)
    .map(renderRelatedCard)
    .join("");
  bindPosterFallbacks();
})();
