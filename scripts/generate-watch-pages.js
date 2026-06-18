const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const SITE_URL = "https://boiledstone.github.io/BoiledStream";
const WATCH_DIR = path.join(ROOT, "watch");
const ASSET_VERSION = "20260618-series-watch-embeds";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function absoluteUrl(url) {
  const value = String(url || "").trim();

  if (!value) {
    return `${SITE_URL}/favicon.svg`;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `${SITE_URL}/${value.replace(/^\.?\//, "")}`;
}

function loadCatalogue() {
  const sandbox = { window: {} };
  const source = fs.readFileSync(path.join(ROOT, "scripts", "videos.js"), "utf8");

  vm.runInNewContext(source, sandbox, { filename: "videos.js" });

  return [
    ...(sandbox.window.BOILED_VIDEOS || []),
    ...(sandbox.window.BOILED_EPISODES || [])
  ];
}

function loadPlayerBody() {
  const source = fs.readFileSync(path.join(ROOT, "player.html"), "utf8");
  const body = source.match(/<body>([\s\S]*)<\/body>/i)?.[1] || "";

  return body
    .replaceAll('href="index.html', 'href="../index.html')
    .replaceAll('src="favicon.svg', 'src="../favicon.svg');
}

function padEpisodeNumber(value) {
  return String(value || 0).padStart(2, "0");
}

function getWatchTitle(video) {
  if (video.seriesId) {
    const episodeCode =
      video.seasonNumber && video.episodeNumber
        ? `S${padEpisodeNumber(video.seasonNumber)}E${padEpisodeNumber(video.episodeNumber)}`
        : "";
    return [video.seriesTitle, episodeCode, video.title].filter(Boolean).join(" - ");
  }

  return video.title;
}

function getWatchDescription(video, title) {
  if (video.description) {
    return video.description;
  }

  if (video.seriesId) {
    const season = video.seasonNumber ? ` saison ${video.seasonNumber}` : "";
    const episode = video.episodeNumber ? ` episode ${video.episodeNumber}` : "";
    return `Regarder ${video.seriesTitle || "la serie"}${season}${episode} sur BoiledStream.`;
  }

  if (video.type === "series") {
    const seasonCount = video.seasons?.length || 0;
    const episodeCount = (video.seasons || []).reduce((total, season) => total + (season.episodes || []).length, 0);
    const countText = [
      seasonCount ? `${seasonCount} saison${seasonCount > 1 ? "s" : ""}` : "",
      episodeCount ? `${episodeCount} episode${episodeCount > 1 ? "s" : ""}` : ""
    ]
      .filter(Boolean)
      .join(", ");

    return `Serie disponible sur BoiledStream${countText ? `: ${countText}.` : "."}`;
  }

  return `Regarder ${title} sur BoiledStream.`;
}

function getOgType(video) {
  if (video.seriesId) {
    return "video.episode";
  }

  if (video.type === "series") {
    return "video.tv_show";
  }

  return "video.movie";
}

function renderWatchPage(video) {
  const watchUrl = `${SITE_URL}/watch/${encodeURIComponent(video.id)}.html`;
  const watchTitle = getWatchTitle(video);
  const title = `${watchTitle} | BoiledStream`;
  const description = getWatchDescription(video, watchTitle);
  const image = absoluteUrl(video.posterUrl);
  const ogType = getOgType(video);
  const body = loadPlayerBody();

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(watchUrl)}">
    <meta property="og:site_name" content="BoiledStream">
    <meta property="og:type" content="${escapeHtml(ogType)}">
    <meta property="og:url" content="${escapeHtml(watchUrl)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${escapeHtml(image)}">
    <meta property="og:image:secure_url" content="${escapeHtml(image)}">
    <meta property="og:image:alt" content="${escapeHtml(video.title)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(image)}">
    <link rel="icon" href="../favicon.svg?v=${ASSET_VERSION}" type="image/svg+xml">
    <link rel="stylesheet" href="../css/styles.css?v=${ASSET_VERSION}">
    <script src="../scripts/app-utils.js?v=${ASSET_VERSION}" defer></script>
    <script src="../scripts/videos.js?v=${ASSET_VERSION}" defer></script>
    <script src="../scripts/player.js?v=${ASSET_VERSION}" defer></script>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" defer></script>
    <script src="../scripts/supabase-config.js?v=${ASSET_VERSION}" defer></script>
    <script src="../scripts/community.js?v=${ASSET_VERSION}" defer></script>
  </head>
  <body>${body}</body>
</html>
`;
}

fs.rmSync(WATCH_DIR, { recursive: true, force: true });
fs.mkdirSync(WATCH_DIR, { recursive: true });

for (const video of loadCatalogue()) {
  fs.writeFileSync(path.join(WATCH_DIR, `${video.id}.html`), renderWatchPage(video));
}
