(function () {
  const HIDDEN_TAGS = new Set([
    "film",
    "serie",
    "series",
    "anime",
    "animation",
    "francais",
    "anglais",
    "english",
    "vf",
    "vostfr",
    "multi",
    "hevc",
    "sd",
    "hd",
    "uhd",
    "4k",
    "youtube",
    "uqload"
  ]);

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeKey(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function buildPlayerUrl(id) {
    const encodedId = encodeURIComponent(id);

    if (window.location.protocol === "file:") {
      return buildDirectPlayerUrl(id);
    }

    return window.location.pathname.includes("/watch/") ? `${encodedId}.html` : `watch/${encodedId}.html`;
  }

  function buildDirectPlayerUrl(id) {
    const url = `player.html?video=${encodeURIComponent(id)}`;

    return window.location.pathname.includes("/watch/") ? `../${url}` : url;
  }

  function buildIndexUrl() {
    return window.location.pathname.includes("/watch/") ? "../index.html" : "index.html";
  }

  function buildSearchUrl(filters = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      const cleanValue = String(value || "").trim();
      if (cleanValue) {
        params.set(key, cleanValue);
      }
    });

    const query = params.toString();

    return `${buildIndexUrl()}${query ? `?${query}` : ""}#catalogue`;
  }

  function formatLanguage(value) {
    const labels = {
      en: "Anglais",
      english: "Anglais",
      fr: "Français",
      francais: "Français",
      vf: "Français",
      jp: "Japonais",
      multi: "Multi",
      vostfr: "VOSTFR",
      "vf+vostfr": "VF + VOSTFR",
      french: "French",
      truefrench: "TrueFrench"
    };
    const key = normalizeKey(value);

    return labels[key] || String(value || "").trim() || "Français";
  }

  function isDisplayTag(tag) {
    const key = normalizeKey(tag);

    return (
      Boolean(key) &&
      !HIDDEN_TAGS.has(key) &&
      !/^\d+x\d+$/i.test(key) &&
      !/^(19|20)\d{2}$/.test(key)
    );
  }

  function getDisplayTags(video, limit = Infinity) {
    return (video.tags || [])
      .filter((tag) => String(tag || "").trim())
      .filter(isDisplayTag)
      .slice(0, limit);
  }

  function hasCategoryOrTag(video, expectedKey) {
    return (
      normalizeKey(video.category) === expectedKey ||
      (video.tags || []).some((tag) => normalizeKey(tag) === expectedKey)
    );
  }

  function getAssetUrl(url) {
    const value = String(url || "").trim();

    if (
      !value ||
      /^(https?:|data:|blob:|#|\/)/i.test(value) ||
      value.startsWith("../")
    ) {
      return value;
    }

    return window.location.pathname.includes("/watch/") ? `../${value}` : value;
  }

  function getEpisodeCount(video) {
    return (
      video.episodeCount ||
      (video.seasons || []).reduce((total, season) => total + (season.episodes || []).length, 0)
    );
  }

  function getSeasonLabel(video) {
    const count = video.seasonCount || (video.seasons || []).length;

    if (!count) {
      return "";
    }

    return `${count} saison${count > 1 ? "s" : ""}`;
  }

  function getCardTypeLabel(video) {
    return video.type === "series" ? "Série" : "Film";
  }

  function splitLanguageTokens(value) {
    return String(value || "")
      .split(/[+/,&|]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  function getSourceLanguages(sources) {
    if (Array.isArray(sources)) {
      return sources.map((entry) => entry.language).filter(Boolean);
    }

    if (sources && typeof sources === "object") {
      return Object.keys(sources);
    }

    return [];
  }

  function getVideoLanguages(video) {
    const values = [
      ...(video.languages || []),
      ...splitLanguageTokens(video.language),
      ...getSourceLanguages(video.sources)
    ];

    return values.filter(
      (entry, index, list) =>
        entry && list.findIndex((value) => normalizeKey(value) === normalizeKey(entry)) === index
    );
  }

  function renderPosterImage(posterUrl, loading = "lazy") {
    const resolvedPosterUrl = getAssetUrl(posterUrl);

    return resolvedPosterUrl
      ? `<img src="${escapeHtml(resolvedPosterUrl)}" alt="" loading="${escapeHtml(loading)}">`
      : "";
  }

  function renderCardTags(video, limit) {
    const tagList = getDisplayTags(video, limit)
      .map((tag) => `<span class="card-tag">${escapeHtml(tag)}</span>`)
      .join("");

    return `<div class="card-tags" aria-label="Tags">${tagList}</div>`;
  }

  function renderVideoCard(video, options = {}) {
    const { related = false, tagLimit = 2 } = options;
    const cardType = getCardTypeLabel(video);
    const playerHref = video.type === "series" ? buildDirectPlayerUrl(video.id) : buildPlayerUrl(video.id);
    const accentStyle = buildAccentStyle(video.accentColor);
    const accentLock = video.accentColor ? ' data-accent-lock="true"' : "";

    return `
      <a class="video-card${related ? " related-card" : ""}" href="${playerHref}" data-video-id="${escapeHtml(video.id)}" data-type="${escapeHtml(video.type || "movie")}"${accentLock}${accentStyle} aria-label="Ouvrir ${escapeHtml(video.title)}">
        <div class="thumb">
          <div class="generated-poster" aria-hidden="true"></div>
          ${renderPosterImage(video.posterUrl)}
          <span class="play-badge" aria-hidden="true"></span>
        </div>
        <div class="card-body">
          <h3>${escapeHtml(video.title)}</h3>
          <div class="card-meta">
            <span class="type-pill">${escapeHtml(cardType)}</span>
          </div>
          ${tagLimit > 0 ? renderCardTags(video, tagLimit) : ""}
        </div>
      </a>
    `;
  }

  function parseHexColor(value) {
    const match = String(value || "").trim().match(/^#?([a-f\d]{6})$/i);

    if (!match) {
      return null;
    }

    const hex = match[1];

    return {
      red: Number.parseInt(hex.slice(0, 2), 16),
      green: Number.parseInt(hex.slice(2, 4), 16),
      blue: Number.parseInt(hex.slice(4, 6), 16)
    };
  }

  function buildAccentStyle(accentColor) {
    const color = parseHexColor(accentColor);

    if (!color) {
      return "";
    }

    const textColor = getTextColorForRgb(color.red, color.green, color.blue);

    return ` style="--poster-color: ${escapeHtml(accentColor)}; --poster-ink: ${textColor};"`;
  }

  function fallbackPosterColor(seed) {
    let hash = 0;
    const value = String(seed || "");

    for (let index = 0; index < value.length; index += 1) {
      hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }

    return `hsl(${hash % 360} 62% 42%)`;
  }

  function getTextColorForRgb(red, green, blue) {
    const luminance = (red * 299 + green * 587 + blue * 114) / 1000;

    return luminance > 150 ? "#090909" : "#fff";
  }

  function getRgbStats(red, green, blue) {
    const r = red / 255;
    const g = green / 255;
    const b = blue / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const lightness = (max + min) / 2;
    const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
    let hue = 0;

    if (delta) {
      if (max === r) {
        hue = ((g - b) / delta) % 6;
      } else if (max === g) {
        hue = (b - r) / delta + 2;
      } else {
        hue = (r - g) / delta + 4;
      }
      hue *= 60;
      if (hue < 0) {
        hue += 360;
      }
    }

    return { hue, lightness, saturation };
  }

  function hslToRgb(hue, saturation, lightness) {
    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const huePrime = hue / 60;
    const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
    const m = lightness - chroma / 2;
    const channels =
      huePrime < 1
        ? [chroma, x, 0]
        : huePrime < 2
          ? [x, chroma, 0]
          : huePrime < 3
            ? [0, chroma, x]
            : huePrime < 4
              ? [0, x, chroma]
              : huePrime < 5
                ? [x, 0, chroma]
                : [chroma, 0, x];

    return channels.map((channel) => Math.round((channel + m) * 255));
  }

  function normalizeAccentColor(red, green, blue) {
    const stats = getRgbStats(red, green, blue);
    const saturation = Math.min(0.9, Math.max(0.46, stats.saturation * 1.08));
    let lightness = stats.lightness;

    if (lightness > 0.62) {
      lightness = 0.46;
    } else if (lightness < 0.28) {
      lightness = 0.36;
    } else {
      lightness = Math.min(0.52, Math.max(0.36, lightness));
    }

    const [accentRed, accentGreen, accentBlue] = hslToRgb(stats.hue, saturation, lightness);

    return {
      color: `rgb(${accentRed} ${accentGreen} ${accentBlue})`,
      textColor: getTextColorForRgb(accentRed, accentGreen, accentBlue)
    };
  }

  function setPosterColor(target, color, textColor = "#fff") {
    target?.style.setProperty("--poster-color", color);
    target?.style.setProperty("--poster-ink", textColor);
  }

  function sampleDominantImageColor(image, target) {
    const probe = new Image();
    const source = image.currentSrc || image.src;

    if (!source || !target) {
      return;
    }

    probe.crossOrigin = "anonymous";
    probe.decoding = "async";
    probe.onload = () => {
      try {
        const width = 48;
        const height = 72;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });

        if (!context) {
          return;
        }

        canvas.width = width;
        canvas.height = height;
        context.drawImage(probe, 0, 0, width, height);

        const pixels = context.getImageData(0, 0, width, height).data;
        const buckets = new Map();

        for (let index = 0; index < pixels.length; index += 4) {
          const alpha = pixels[index + 3];
          const red = pixels[index];
          const green = pixels[index + 1];
          const blue = pixels[index + 2];
          const { lightness, saturation } = getRgbStats(red, green, blue);

          if (alpha < 180 || lightness < 0.1 || lightness > 0.88 || saturation < 0.16) {
            continue;
          }

          const key = `${red >> 5}-${green >> 5}-${blue >> 5}`;
          const bucket = buckets.get(key) || { count: 0, red: 0, green: 0, blue: 0, score: 0 };
          const contrastScore = 1 - Math.abs(lightness - 0.48) * 0.75;
          const colorScore = Math.max(0.08, Math.pow(saturation, 1.7) * contrastScore);

          bucket.count += 1;
          bucket.red += red;
          bucket.green += green;
          bucket.blue += blue;
          bucket.score += colorScore;
          buckets.set(key, bucket);
        }

        const dominant = [...buckets.values()].sort((first, second) => second.score - first.score)[0];

        if (!dominant) {
          return;
        }

        const red = Math.round(dominant.red / dominant.count);
        const green = Math.round(dominant.green / dominant.count);
        const blue = Math.round(dominant.blue / dominant.count);
        const accent = normalizeAccentColor(red, green, blue);

        setPosterColor(target, accent.color, accent.textColor);
      } catch (_error) {
        setPosterColor(target, fallbackPosterColor(source));
      }
    };
    probe.onerror = () => setPosterColor(target, fallbackPosterColor(source));
    probe.src = source;
  }

  function bindPosterColorPills(root, selector = ".thumb img") {
    root?.querySelectorAll(selector).forEach((image) => {
      const target = image.closest(".video-card, .series-card");
      const applyColor = () => sampleDominantImageColor(image, target);

      if (!target) {
        return;
      }

      if (target.dataset.accentLock === "true") {
        return;
      }

      setPosterColor(target, fallbackPosterColor(image.currentSrc || image.src));

      if (image.complete && image.naturalWidth > 0) {
        applyColor();
      } else {
        image.addEventListener("load", applyColor, { once: true });
      }
    });
  }

  function bindImageFallbacks(root, selector = ".thumb img") {
    bindPosterColorPills(root, selector);

    root?.querySelectorAll(selector).forEach((image) => {
      image.addEventListener("error", () => image.remove(), { once: true });
      if (image.complete && image.naturalWidth === 0) {
        image.remove();
      }
    });
  }

  window.BOILED_UTILS = Object.freeze({
    buildPlayerUrl,
    buildDirectPlayerUrl,
    buildSearchUrl,
    buildAccentStyle,
    escapeHtml,
    formatLanguage,
    getAssetUrl,
    getEpisodeCount,
    getCardTypeLabel,
    getSeasonLabel,
    getDisplayTags,
    getVideoLanguages,
    hasCategoryOrTag,
    normalizeKey,
    renderPosterImage,
    renderVideoCard,
    bindImageFallbacks
  });
})();
