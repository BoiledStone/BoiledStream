(function () {
  const videos = window.BOILED_VIDEOS || [];
  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get("video");
  // Si l'URL vise un film inexistant, on affiche le premier film disponible.
  const video = videos.find((item) => item.id === requestedId) || videos[0];
  const currentIndex = videos.findIndex((item) => item.id === video.id);
  const previousVideo = videos[(currentIndex - 1 + videos.length) % videos.length];
  const nextVideo = videos[(currentIndex + 1) % videos.length];

  const playerMount = document.querySelector("#player-mount");
  const playerPoster = document.querySelector("#player-poster");
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
  const metaList = document.querySelector(".meta-list");
  const relatedGrid = document.querySelector("#related-grid");
  const playerHelp = document.querySelector("#player-help");
  const language = (() => {
    const possible = ["FR","VF","VOSTFR","EN","JP","MULTI","Français"];
    const found = (video.tags || []).filter((tag) => possible.includes(String(tag).toUpperCase()) || String(tag).toLowerCase()==="français");
    return found.length ? found.join(" / ") : "FR";
  })();


  // Les données du catalogue sont injectées dans le HTML du player; on les échappe
  // avant rendu pour garder des attributs et du texte valides.
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

  function isUqloadEmbed(item) {
    const sourceNameMatches = /uqload/i.test(item.sourceName || "");
    try {
      return sourceNameMatches || /(^|\.)uqload\./i.test(new URL(item.embedUrl, window.location.href).hostname);
    } catch (_error) {
      return sourceNameMatches;
    }
  }

  function buildIframePolicy(item) {
    const allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";
    const sandbox = isUqloadEmbed(item)
      ? ' sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"'
      : "";

    return `allow="${allow}"${sandbox}`;
  }

  function renderRelatedCard(item) {
    const poster = item.posterUrl ? `<img src="${escapeHtml(item.posterUrl)}" alt="" loading="lazy">` : "";
    const sourceName = item.sourceName || "Source";

    return `
      <a class="video-card" href="${buildPlayerUrl(item.id)}" data-video-id="${escapeHtml(item.id)}" data-source="${escapeHtml(sourceName.toLowerCase())}" aria-label="Ouvrir ${escapeHtml(item.title)}">
        <div class="thumb">
          <div class="generated-poster" aria-hidden="true"></div>
          ${poster}
          <span class="play-badge" aria-hidden="true"></span>
        </div>
        <div class="card-body">
          <h3>${escapeHtml(item.title)}</h3>
          <div class="card-meta">
            <span class="source-pill">${escapeHtml(sourceName)}</span>
            <span class="duration-pill">${escapeHtml(item.duration)}</span>
          </div>
        </div>
      </a>
    `;
  }

  function renderPlayerPoster(item) {
    if (!playerPoster) {
      return;
    }

    const poster = item.posterUrl
      ? `<img src="${escapeHtml(item.posterUrl)}" alt="" loading="eager">`
      : "";
    playerPoster.innerHTML = `
      <div class="generated-poster" aria-hidden="true"></div>
      ${poster}
    `;
    playerPoster.querySelector("img")?.addEventListener("error", (event) => {
      event.currentTarget.remove();
    });
  }

  function renderPlayer(item) {
    // Priorité à l'embed externe quand il existe, sinon lecture d'un fichier vidéo direct.
    if (item.embedUrl) {
      playerMount.innerHTML = `
        <iframe
          class="main-video"
          src="${escapeHtml(item.embedUrl)}"
          title="${escapeHtml(item.title)}"
          ${buildIframePolicy(item)}
          referrerpolicy="origin"
        ></iframe>
      `;
      playerHelp.innerHTML = "";
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
      playerHelp.innerHTML = "";
      return;
    }

    playerMount.innerHTML = `
      <div class="main-video player-error">
        <p>Aucun player n’est disponible pour cette vidéo.</p>
      </div>
    `;
    playerHelp.innerHTML = item.sourceUrl
      ? `<a class="button primary" href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer">Ouvrir la source</a>`
      : "";
  }

  function bindPosterFallbacks() {
    relatedGrid.querySelectorAll(".thumb img").forEach((image) => {
      image.addEventListener("error", () => {
        image.remove();
      });
    });
  }

  if (!requestedId || requestedId !== video.id) {
    // Normalise l'URL pour que le bouton partage/copier pointe toujours vers le bon id.
    window.history.replaceState(null, "", buildPlayerUrl(video.id));
  }

  document.title = `BoiledStream - ${video.title}`;
  renderPlayerPoster(video);
  renderPlayer(video);
  title.textContent = video.title;
  category.textContent = video.category;
  description.textContent = video.description;

  const infoMeta = document.createElement("div");
  infoMeta.className = "player-extra-meta";
  infoMeta.innerHTML = `
    <span>${escapeHtml(video.category || "Film")}</span>
    <span>${escapeHtml(language)}</span>
  `;
  description.insertAdjacentElement("afterend", infoMeta);
  duration.textContent = video.duration;
  quality.textContent = [video.resolution, video.format].filter(Boolean).join(" - ");
  source.href = video.sourceUrl;
  source.textContent = video.sourceName;
  tags.innerHTML = video.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
  playerActions.hidden = videos.length < 2;
  if (videos.length > 1) {
    previousLink.href = buildPlayerUrl(previousVideo.id);
    previousLink.textContent = `Précédent`;
    previousLink.setAttribute("aria-label", `Lire ${previousVideo.title}`);
    nextLink.href = buildPlayerUrl(nextVideo.id);
    nextLink.textContent = `Suivant`;
    nextLink.setAttribute("aria-label", `Lire ${nextVideo.title}`);
  }
  relatedGrid.innerHTML = videos
    .filter((item) => item.id !== video.id)
    .slice(0, 3)
    .map(renderRelatedCard)
    .join("");
  bindPosterFallbacks();
})();
