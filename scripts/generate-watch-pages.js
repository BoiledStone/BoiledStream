const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const SITE_URL = "https://boiledstone.github.io/BoiledStream";
const WATCH_DIR = path.join(ROOT, "watch");
const ASSET_VERSION = "20260720-red-logo";

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

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(value, maxLength) {
  const text = cleanText(value);

  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}…` : text;
}

function formatLanguage(value) {
  const labels = {
    en: "EN",
    english: "EN",
    fr: "FR",
    francais: "FR",
    french: "FR",
    vf: "VF",
    vostfr: "VOSTFR",
    truefrench: "TrueFrench"
  };
  const key = String(value || "").trim().toLowerCase();

  return labels[key] || String(value || "").trim();
}

function getLanguages(video) {
  const values = [
    ...(video.languages || []),
    video.language,
    ...Object.keys(video.sources || {})
  ];
  const seen = new Set();

  return values
    .flatMap((value) => String(value || "").split(/[+/|,]/))
    .map(formatLanguage)
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function getEpisodeCount(video) {
  return (video.seasons || []).reduce((total, season) => total + (season.episodes || []).length, 0);
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

function getEmbedSummary(video) {
  const source = video.sourceName || "";
  const year = String(video.date || "").match(/\d{4}/)?.[0] || "";
  const languages = getLanguages(video).join(" + ");

  if (video.seriesId) {
    return [
      "Épisode",
      video.seasonNumber && video.episodeNumber
        ? `S${padEpisodeNumber(video.seasonNumber)}E${padEpisodeNumber(video.episodeNumber)}`
        : "",
      languages,
      source,
      year
    ].filter(Boolean).join(" • ");
  }

  if (video.type === "series") {
    const seasonCount = video.seasons?.length || 0;
    const episodeCount = getEpisodeCount(video);

    return [
      "Série",
      seasonCount ? `${seasonCount} saison${seasonCount > 1 ? "s" : ""}` : "",
      episodeCount ? `${episodeCount} épisodes` : "",
      languages,
      year
    ].filter(Boolean).join(" • ");
  }

  return ["Film", languages, source, year].filter(Boolean).join(" • ");
}

function getWatchDescription(video, title) {
  const summary = getEmbedSummary(video);
  const fallback = video.seriesId
    ? `Regarder ${video.seriesTitle || title} sur BoiledStream.`
    : video.type === "series"
      ? "Série disponible sur BoiledStream."
      : `Regarder ${title} sur BoiledStream.`;
  const description = video.description || fallback;

  return truncateText([summary, description].filter(Boolean).join(" — "), 220);
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

function getImageSize(imageUrl) {
  if (/\/w(300|400|500|600|780|1280)\//i.test(imageUrl) || /\/w600_and_h900/i.test(imageUrl)) {
    return { width: 600, height: 900 };
  }

  if (/miniatures\/posters\//i.test(imageUrl) || /media-amazon\.com/i.test(imageUrl)) {
    return { width: 600, height: 900 };
  }

  return { width: 1200, height: 630 };
}

function getThemeColor(video) {
  const color = String(video.accentColor || "").trim();

  return /^#[0-9a-f]{6}$/i.test(color) ? color : "#d95b43";
}

function hexToRgb(color) {
  const value = String(color || "").trim();
  const match = value.match(/^#?([a-f\d]{6})$/i);

  if (!match) {
    return [217, 45, 62];
  }

  const hex = match[1];

  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16)
  ];
}

function adjustHexColor(color, amount) {
  const [red, green, blue] = hexToRgb(color);
  const mix = (channel) => Math.max(0, Math.min(255, Math.round(channel + (amount > 0 ? 255 - channel : channel) * amount)));

  return `#${[mix(red), mix(green), mix(blue)]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function mixHexColors(color, baseColor, amount) {
  const [red, green, blue] = hexToRgb(color);
  const [baseRed, baseGreen, baseBlue] = hexToRgb(baseColor);
  const blend = (channel, baseChannel) => Math.round(channel * amount + baseChannel * (1 - amount));

  return `#${[blend(red, baseRed), blend(green, baseGreen), blend(blue, baseBlue)]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function getThemeStyle(video) {
  const accent = getThemeColor(video);
  const [red, green, blue] = hexToRgb(accent);
  const accentStrong = adjustHexColor(accent, 0.16);

  return [
    `--accent:${accent}`,
    `--accent-strong:${accentStrong}`,
    `--accent-rgb:${red}, ${green}, ${blue}`,
    `--accent-strong-rgb:${hexToRgb(accentStrong).join(", ")}`
  ].join("; ");
}

function renderOptionalMeta(video) {
  const tags = (video.tags || [])
    .slice(0, 6)
    .map((tag) => `    <meta property="video:tag" content="${escapeHtml(tag)}">`)
    .join("\n");
  const seriesMeta = video.seriesId
    ? [
        `    <meta property="video:series" content="${escapeHtml(video.seriesTitle || "")}">`,
        video.seasonNumber ? `    <meta property="video:season" content="${escapeHtml(video.seasonNumber)}">` : "",
        video.episodeNumber ? `    <meta property="video:episode" content="${escapeHtml(video.episodeNumber)}">` : ""
      ].filter(Boolean).join("\n")
    : "";

  return [tags, seriesMeta].filter(Boolean).join("\n");
}

function renderWatchPage(video) {
  const watchUrl = `${SITE_URL}/watch/${encodeURIComponent(video.id)}.html`;
  const watchTitle = getWatchTitle(video);
  const title = `${watchTitle} | BoiledStream`;
  const description = getWatchDescription(video, watchTitle);
  const image = absoluteUrl(video.posterUrl);
  const ogType = getOgType(video);
  const imageSize = getImageSize(image);
  const themeColor = getThemeColor(video);
  const optionalMeta = renderOptionalMeta(video);
  const body = loadPlayerBody();

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="theme-color" content="${escapeHtml(themeColor)}">
    <link rel="canonical" href="${escapeHtml(watchUrl)}">
    <meta property="og:site_name" content="BoiledStream">
    <meta property="og:locale" content="fr_CA">
    <meta property="og:type" content="${escapeHtml(ogType)}">
    <meta property="og:url" content="${escapeHtml(watchUrl)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${escapeHtml(image)}">
    <meta property="og:image:secure_url" content="${escapeHtml(image)}">
    <meta property="og:image:width" content="${imageSize.width}">
    <meta property="og:image:height" content="${imageSize.height}">
    <meta property="og:image:alt" content="${escapeHtml(video.title)}">
${optionalMeta ? `${optionalMeta}\n` : ""}    <meta name="twitter:site" content="@BoiledStream">
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
  <body style="${getThemeStyle(video)}">${body}</body>
</html>
`;
}

fs.rmSync(WATCH_DIR, { recursive: true, force: true });
fs.mkdirSync(WATCH_DIR, { recursive: true });

for (const video of loadCatalogue()) {
  fs.writeFileSync(path.join(WATCH_DIR, `${video.id}.html`), renderWatchPage(video));
}
