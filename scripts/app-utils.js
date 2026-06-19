(function () {
  const HIDDEN_TAGS = new Set([
    "film",
    "serie",
    "series",
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
    "uqload",
    "camrip"
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
    const fetchPriority = loading === "eager" ? "high" : "low";

    return resolvedPosterUrl
      ? `<img src="${escapeHtml(resolvedPosterUrl)}" alt="" loading="${escapeHtml(loading)}" decoding="async" fetchpriority="${fetchPriority}">`
      : "";
  }

  function renderCardTags(video, limit) {
    const tagList = getDisplayTags(video, limit)
      .map((tag) => `<span class="card-tag">${escapeHtml(tag)}</span>`)
      .join("");

    return `<div class="card-tags" aria-label="Tags">${tagList}</div>`;
  }

  function hasUsableMediaValue(value) {
    const text = String(value || "").trim();

    return Boolean(text) && !/(?:[?&]video=|\/video\/|\/embed-|\/d\/|watch\?v=)$/.test(text);
  }

  function hasEmptySourceField(item) {
    if (!item) {
      return false;
    }

    if (item.missingSourceUrl) {
      return true;
    }

    return (
      Object.prototype.hasOwnProperty.call(item, "videoId") && !String(item.videoId || "").trim()
    ) || (
      Object.prototype.hasOwnProperty.call(item, "sourceUrl") && !String(item.sourceUrl || "").trim()
    );
  }

  function hasPlayableSource(item) {
    if (!item) {
      return false;
    }

    if (item.type === "series") {
      return (item.seasons || []).some((season) =>
        (season.episodes || []).some((episode) => hasPlayableSource(episode))
      );
    }

    if (
      hasUsableMediaValue(item.embedUrl) ||
      hasUsableMediaValue(item.videoUrl) ||
      hasUsableMediaValue(item.sourceUrl)
    ) {
      return true;
    }

    if (Array.isArray(item.sources)) {
      return item.sources.some((source) => hasPlayableSource(source));
    }

    if (item.sources && typeof item.sources === "object") {
      return Object.values(item.sources).some((source) => hasPlayableSource(source));
    }

    return false;
  }

  function hasMissingPlayableSource(item) {
    if (!item) {
      return true;
    }

    if (item.type === "series") {
      return false;
    }

    if (hasEmptySourceField(item)) {
      return true;
    }

    if (Array.isArray(item.sources) && item.sources.length) {
      return item.sources.some((source) => hasEmptySourceField(source) || !hasPlayableSource(source));
    }

    if (item.sources && typeof item.sources === "object") {
      const sources = Object.values(item.sources);

      return sources.length
        ? sources.some((source) => hasEmptySourceField(source) || !hasPlayableSource(source))
        : !hasPlayableSource(item);
    }

    return !hasPlayableSource(item);
  }

  function isCamrip(video) {
    const values = [
      video?.title,
      video?.sourceName,
      video?.resolution,
      video?.quality,
      video?.format,
      ...(video?.tags || [])
    ];

    return values.some((value) => normalizeKey(value).includes("camrip"));
  }

  function renderVideoCard(video, options = {}) {
    const { related = false, tagLimit = 2 } = options;
    const cardType = getCardTypeLabel(video);
    const playerHref = buildPlayerUrl(video.id);
    const accentStyle = buildAccentStyle(video.accentColor);
    const accentLock = video.accentColor ? ' data-accent-lock="true"' : "";
    const missingSource = hasMissingPlayableSource(video);
    const stateClass = `${missingSource ? " missing-source" : ""}${isCamrip(video) ? " camrip-source" : ""}`;

    return `
      <a class="video-card${related ? " related-card" : ""}${stateClass}" href="${playerHref}" data-video-id="${escapeHtml(video.id)}" data-type="${escapeHtml(video.type || "movie")}"${accentLock}${accentStyle} aria-label="Ouvrir ${escapeHtml(video.title)}">
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

    const containsNode = (target) => target instanceof Node && root.contains(target);
    const getCardFromTarget = (target) =>
      target instanceof Element ? target.closest(".video-card") : null;
    const resetCard = (card) => {
      card?.classList.remove("is-hovered");
      card?.style.removeProperty("--hover-x");
      card?.style.removeProperty("--hover-y");
      card?.style.removeProperty("--tilt-x");
      card?.style.removeProperty("--tilt-y");
    };
    const resetCursorGlow = () => {
      root.classList.remove("is-cursor-glowing");
      root.style.removeProperty("--poster-cursor-glow-x");
      root.style.removeProperty("--poster-cursor-glow-y");
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
    const setCursorGlow = (clientX, clientY) => {
      const gridRect = root.getBoundingClientRect();
      const gridStyles = window.getComputedStyle(root);
      const effectWidth = Math.max(gridRect.width, window.innerWidth);
      const effectLeft = gridRect.left + (gridRect.width - effectWidth) / 2;
      const effectTop = Number.parseFloat(gridStyles.getPropertyValue("--poster-grid-effect-top")) || 0;

      root.classList.add("is-cursor-glowing");
      root.style.setProperty("--poster-cursor-glow-x", `${Math.round(clientX - effectLeft)}px`);
      root.style.setProperty("--poster-cursor-glow-y", `${Math.round(clientY - gridRect.top - effectTop)}px`);
    };
    const activateCard = (card, clientX, clientY, useTilt = true) => {
      if (!card || !root.contains(card)) {
        resetActiveCard();
        return;
      }

      if (activeCard && activeCard !== card) {
        resetCard(activeCard);
      }
      activeCard = card;

      const rect = card.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
      const tiltY = useTilt ? (x - 0.5) * 2.2 : 0;
      const tiltX = useTilt ? (0.5 - y) * 1.65 : 0;

      card.classList.add("is-hovered");
      card.style.setProperty("--hover-x", `${Math.round(x * 100)}%`);
      card.style.setProperty("--hover-y", `${Math.round(y * 100)}%`);
      card.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`);
      card.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`);
    };
    const applyHoverFrame = () => {
      hoverFrame = 0;
      const pointer = pendingPointer;
      pendingPointer = null;

      if (!pointer) {
        return;
      }

      setCursorGlow(pointer.clientX, pointer.clientY);
      activateCard(getCardFromTarget(pointer.target), pointer.clientX, pointer.clientY);
    };

    root.addEventListener("pointermove", (event) => {
      if (reducedMotionQuery.matches || !root.contains(event.target)) {
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
      const nextTargetIsInside = containsNode(event.relatedTarget);

      if (!card) {
        if (!nextTargetIsInside) {
          resetHoverState();
        }
        return;
      }
      if (containsNode(event.relatedTarget) && card.contains(event.relatedTarget)) {
        return;
      }

      resetCard(card);
      if (activeCard === card) {
        activeCard = null;
      }
      if (!nextTargetIsInside) {
        resetHoverState();
      }
    });

    root.addEventListener("pointerleave", resetHoverState);

    root.addEventListener("focusin", (event) => {
      const card = getCardFromTarget(event.target);
      if (!card) {
        return;
      }

      const rect = card.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * 0.38;

      setCursorGlow(centerX, centerY);
      activateCard(card, centerX, centerY, false);
    });

    root.addEventListener("focusout", (event) => {
      const card = getCardFromTarget(event.target);
      resetCard(card);
      if (activeCard === card) {
        activeCard = null;
      }
      if (!containsNode(event.relatedTarget)) {
        resetHoverState();
      }
    });
  }

  function initCustomCursor() {
    if (!document.body || document.body.dataset.customCursorBound === "true") {
      return;
    }

    const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointerQuery.matches || reducedMotionQuery.matches) {
      return;
    }

    const cursorZoneSelector = ".video-grid";
    if (!document.querySelector(cursorZoneSelector)) {
      return;
    }

    const dot = document.createElement("div");
    const ring = document.createElement("div");
    const interactiveSelector = ".video-grid a, .video-grid button, .video-grid [role='button'], .video-grid .video-card";
    const particles = new Set();
    const maxParticles = 8;
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let dotX = mouseX;
    let dotY = mouseY;
    let ringX = mouseX;
    let ringY = mouseY;
    let lastParticleTime = 0;

    dot.className = "site-cursor-dot";
    ring.className = "site-cursor-ring";
    document.body.append(dot, ring);
    document.body.dataset.customCursorBound = "true";
    document.body.classList.add("has-custom-cursor");

    function createParticle(x, y) {
      if (particles.size >= maxParticles) {
        return;
      }

      const particle = document.createElement("span");
      const angle = Math.random() * Math.PI * 2;
      const drift = 5 + Math.random() * 8;
      const size = 1.4 + Math.random() * 1.5;

      particle.className = "site-cursor-particle";
      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;
      particle.style.setProperty("--cursor-particle-size", `${size.toFixed(1)}px`);
      particle.style.setProperty("--cursor-particle-drift-x", `${(Math.cos(angle) * drift).toFixed(1)}px`);
      particle.style.setProperty("--cursor-particle-drift-y", `${(Math.sin(angle) * drift).toFixed(1)}px`);
      particles.add(particle);
      document.body.append(particle);
      window.setTimeout(() => {
        particles.delete(particle);
        particle.remove();
      }, 540);
    }

    function setCursorVisibility(isVisible) {
      document.body.classList.toggle("custom-cursor-ready", isVisible);
      dot.style.opacity = isVisible ? "0.68" : "0";
      ring.style.opacity = isVisible ? "0.72" : "0";
    }

    function setCursorActive(isActive) {
      document.body.classList.toggle("custom-cursor-active", isActive);
    }

    function updateCursor() {
      dotX += (mouseX - dotX) * 0.32;
      dotY += (mouseY - dotY) * 0.32;
      ringX += (mouseX - ringX) * 0.16;
      ringY += (mouseY - ringY) * 0.16;

      dot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      window.requestAnimationFrame(updateCursor);
    }

    document.addEventListener("pointermove", (event) => {
      if (event.pointerType && event.pointerType !== "mouse") {
        return;
      }

      mouseX = event.clientX;
      mouseY = event.clientY;
      const cursorZone =
        event.target instanceof Element ? event.target.closest(cursorZoneSelector) : null;
      const isInCursorZone = Boolean(cursorZone);

      setCursorVisibility(isInCursorZone);
      setCursorActive(
        isInCursorZone &&
          event.target instanceof Element &&
          Boolean(event.target.closest(interactiveSelector)),
      );

      if (!cursorZone) {
        return;
      }

      const now = Date.now();
      if (now - lastParticleTime > 92 && Math.random() > 0.56) {
        createParticle(mouseX, mouseY);
        lastParticleTime = now;
      }
    });

    document.addEventListener("pointerover", (event) => {
      if (
        event.target instanceof Element &&
        event.target.closest(cursorZoneSelector) &&
        event.target.closest(interactiveSelector)
      ) {
        setCursorVisibility(true);
        setCursorActive(true);
      }
    });

    document.addEventListener("pointerout", (event) => {
      const nextTarget = event.relatedTarget;
      if (nextTarget instanceof Element && nextTarget.closest(cursorZoneSelector)) {
        setCursorVisibility(true);
        setCursorActive(Boolean(nextTarget.closest(interactiveSelector)));
        return;
      }
      setCursorVisibility(false);
      setCursorActive(false);
    });

    document.addEventListener("pointerleave", () => {
      setCursorVisibility(false);
      setCursorActive(false);
    });

    updateCursor();
  }

  initCustomCursor();

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
    hasPlayableSource,
    hasMissingPlayableSource,
    isCamrip,
    hasCategoryOrTag,
    normalizeKey,
    renderPosterImage,
    renderVideoCard,
    bindImageFallbacks,
    bindCardHoverEffects
  });
})();
