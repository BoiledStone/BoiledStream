// Catalogue central: tout film ajouté dans `catalogue` apparaît automatiquement
// sur l'accueil, dans la recherche, dans le player et dans les commentaires.
(function () {
  const PROVIDERS = {
    uqload(item) {
      return {
        sourceName: "Uqload",
        sourceUrl: `https://uqload.is/${item.fileId}.html`,
        embedUrl: `https://uqload.is/embed-${item.fileId}.html`
      };
    },
    youtube(item) {
      return {
        sourceName: "YouTube",
        sourceUrl: `https://www.youtube.com/watch?v=${item.videoId}`,
        embedUrl: `https://www.youtube.com/embed/${item.videoId}`
      };
    },
    dailymotion(item) {
      return {
        sourceName: "Dailymotion",
        sourceUrl: `https://www.dailymotion.com/video/${item.videoId}`,
        embedUrl: `https://geo.dailymotion.com/player.html?video=${item.videoId}`
      };
    },
    embed(item) {
      return {
        sourceName: item.sourceName || "Player externe",
        sourceUrl: item.sourceUrl || item.embedUrl,
        embedUrl: item.embedUrl
      };
    },
    externalPage(item) {
      return {
        sourceName: item.sourceName || "Page externe",
        sourceUrl: item.sourceUrl
      };
    },
    externalpage(item) {
      return PROVIDERS.externalPage(item);
    },
    direct(item) {
      return {
        sourceName: item.sourceName || "Vidéo directe",
        sourceUrl: item.sourceUrl || item.videoUrl,
        videoUrl: item.videoUrl
      };
    },
    googleDrive(item) {
      return {
        sourceName: "Google Drive",
        sourceUrl: `https://drive.google.com/file/d/${item.fileId}/view`,
        embedUrl: `https://drive.google.com/file/d/${item.fileId}/preview`
      };
    }
  };

  const DEFAULT_SERIES_LANGUAGES = Object.freeze(["VF", "VOSTFR"]);

  function normalizeDataKey(value) {
    return String(value ?? "").trim().toLowerCase();
  }

  function uniqueValues(values) {
    const seen = new Set();

    return (values || []).filter((value) => {
      const key = normalizeDataKey(value);

      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  function mergeEpisodeSources(...sourceMaps) {
    const merged = {};

    sourceMaps.filter(Boolean).forEach((sourceMap) => {
      Object.entries(sourceMap).forEach(([episodeNumber, source]) => {
        const previous = merged[episodeNumber] || {};
        const next = source || {};
        const sources = {
          ...(previous.sources || {}),
          ...(next.sources || {})
        };

        merged[episodeNumber] = {
          ...previous,
          ...next,
          sources
        };

        if (!Object.keys(sources).length) {
          delete merged[episodeNumber].sources;
        }
      });
    });

    return merged;
  }

  /*
    Ajouter une serie:
    1. Creer une liste de saisons avec number, posterUrl, description et languages.
    2. Renseigner episodeNumbers pour n'afficher que les episodes disponibles.
    3. Ajouter les players par episode avec episodeSources ou buildProviderEpisodeSources.
    4. Appeler buildSeries({ id, title, date, posterUrl, description, tags, seasons }).
  */
  function buildEpisodes(config, defaults = {}) {
    const seasonNumber = config.number;
    const episodeNumbers = config.episodeNumbers?.length
      ? config.episodeNumbers.map(Number).filter(Boolean)
      : null;
    const availableEpisodes =
      Number(config.availableEpisodes ?? config.episodes ?? config.totalEpisodes ?? episodeNumbers?.length) || 0;
    const sourceName = config.sourceName || defaults.sourceName || "Player";
    const allowExternalSource = defaults.allowExternalSource !== false;
    const sourceUrl = allowExternalSource ? config.sourceUrl || defaults.sourceUrl : "";
    const languages = uniqueValues(config.languages || defaults.languages || DEFAULT_SERIES_LANGUAGES);
    const episodeSources = config.episodeSources || {};
    const numbers = episodeNumbers || Array.from({ length: availableEpisodes }, (_item, index) => index + 1);

    return numbers.map((episodeNumber) => {
      const directSource = episodeSources[episodeNumber] || episodeSources[`e${episodeNumber}`] || {};
      const episodeId =
        directSource.id ||
        (defaults.seriesId
          ? `${defaults.seriesId}-s${String(seasonNumber).padStart(2, "0")}e${String(episodeNumber).padStart(2, "0")}`
          : `s${seasonNumber}e${episodeNumber}`);

      return {
        id: episodeId,
        number: episodeNumber,
        seasonNumber,
        episodeNumber,
        seriesId: defaults.seriesId,
        seriesTitle: defaults.seriesTitle,
        category: "Serie",
        title: `Épisode ${episodeNumber}`,
        sourceName,
        sourceUrl,
        date: defaults.date || "",
        description: config.description || defaults.description || "",
        language: languages.join("+"),
        accentColor: config.accentColor || defaults.accentColor,
        posterUrl: config.posterUrl || defaults.posterUrl,
        tags: Object.freeze([...(defaults.tags || [])]),
        languages: [...languages],
        ...directSource
      };
    });
  }

  function buildSeason(config, defaults = {}) {
    const episodeNumbers = config.episodeNumbers?.length
      ? config.episodeNumbers.map(Number).filter(Boolean)
      : null;
    const availableEpisodes =
      Number(config.availableEpisodes ?? config.episodes ?? config.totalEpisodes ?? episodeNumbers?.length) || 0;
    const totalEpisodes = Number(config.totalEpisodes ?? config.episodes ?? availableEpisodes) || availableEpisodes;
    const sourceName = config.sourceName || defaults.sourceName || "Player";
    const allowExternalSource = defaults.allowExternalSource !== false;
    const sourceUrl = allowExternalSource ? config.sourceUrl || defaults.sourceUrl : "";
    const languages = uniqueValues(config.languages || defaults.languages || DEFAULT_SERIES_LANGUAGES);
    const seasonSourceMaps = defaults.seasonSourceMaps || [];
    const episodeSources = mergeEpisodeSources(
      config.episodeSources,
      ...seasonSourceMaps.map((buildSourceMap) => buildSourceMap(config))
    );

    return {
      id: config.id || `s${config.number}`,
      number: config.number,
      label: config.label || `Saison ${config.number}`,
      availableEpisodes,
      totalEpisodes,
      sourceUrl,
      posterUrl: config.posterUrl || defaults.posterUrl,
      description: config.description || "",
      languages,
      episodes: buildEpisodes(
        {
          ...config,
          availableEpisodes,
          totalEpisodes,
          sourceName,
          sourceUrl,
          languages,
          episodeSources
        },
        defaults
      )
    };
  }

  function buildSeriesSeasons(seasons = [], defaults = {}) {
    return seasons.map((season) => buildSeason(season, defaults));
  }

  function buildSeries(item) {
    const {
      seasons = [],
      seasonSourceMaps = [],
      languages = DEFAULT_SERIES_LANGUAGES,
      ...details
    } = item;
    const sourceName = details.sourceName || "Player";
    const allowExternalSource = item.allowExternalSource !== false;
    const builtSeasons = buildSeriesSeasons(seasons, {
      seriesId: details.id,
      seriesTitle: details.title,
      sourceName,
      languages,
      sourceUrl: details.sourceUrl,
      posterUrl: details.posterUrl,
      date: details.date,
      description: details.description,
      tags: details.tags,
      accentColor: details.accentColor,
      seasonSourceMaps,
      allowExternalSource
    });
    const seasonCount = builtSeasons.length;

    return {
      provider: "externalPage",
      type: "series",
      category: "Série",
      duration: `${seasonCount} saison${seasonCount > 1 ? "s" : ""}`,
      resolution: "HD",
      language: uniqueValues(languages).join("+"),
      ...details,
      sourceName,
      sourceUrl: allowExternalSource ? details.sourceUrl || builtSeasons[0]?.sourceUrl : "",
      seasons: builtSeasons
    };
  }

  function buildProviderEpisodeSources(language, episodes = []) {
    return Object.fromEntries(
      episodes.map((episode) => {
        const provider = String(episode.provider || "").toLowerCase();
        const buildSource = PROVIDERS[provider];
        const source = buildSource ? buildSource(episode) : {};
        const {
          provider: _provider,
          videoId: _videoId,
          fileId: _fileId,
          sources: _sources,
          ...episodeDetails
        } = episode;

        return [
          episode.episodeNumber,
          {
            ...episodeDetails,
            sources: {
              [language]: {
                language,
                ...(episode.videoId !== undefined ? { videoId: episode.videoId } : {}),
                ...(episode.sourceUrl !== undefined && !String(episode.sourceUrl || "").trim()
                  ? { missingSourceUrl: true }
                  : {}),
                ...source
              }
            }
          }
        ];
      })
    );
  }

  const RICK_AND_MORTY_FR_EPISODES = [
    { provider: "dailymotion", seasonNumber: 1, episodeNumber: 1, videoId: "k1G3j2LjU05O2PGy6aG" },
    { provider: "dailymotion", seasonNumber: 1, episodeNumber: 2, videoId: "kmDIC1rww8sCFrGzWts" },
    { provider: "dailymotion", seasonNumber: 1, episodeNumber: 3, videoId: "k4pykpn2tF0lNZGy6ae" },
    { provider: "dailymotion", seasonNumber: 1, episodeNumber: 4, videoId: "kmEu9KkndqlVYqGzWtk" },
    { provider: "dailymotion", seasonNumber: 1, episodeNumber: 5, videoId: "k2tE5U5ETcM8cEGzWtA" },
    { provider: "dailymotion", seasonNumber: 1, episodeNumber: 6, videoId: "k5tY4WPJGkEiP3Gy6ay" },
    { provider: "dailymotion", seasonNumber: 1, episodeNumber: 7, videoId: "k7tbDU1PNgCduwGy6am" },
    { provider: "dailymotion", seasonNumber: 1, episodeNumber: 8, videoId: "k6dfJ8EojkfEhKGzWto" },
    { provider: "dailymotion", seasonNumber: 1, episodeNumber: 9, videoId: "k7l6EsYjYLKx2FGy6au" },
    { provider: "dailymotion", seasonNumber: 1, episodeNumber: 10, videoId: "k7cV5hO5OySHwGGy6a6" },
    { provider: "dailymotion", seasonNumber: 1, episodeNumber: 11, videoId: "kyCrL4XYSJ9IksGzWtw" }
  ];

  const RICK_AND_MORTY_SEASONS = [
    {
      number: 1,
      episodeNumbers: RICK_AND_MORTY_FR_EPISODES.map((episode) => episode.episodeNumber),
      sourceUrl: "",
      posterUrl: "https://image.tmdb.org/t/p/w400/3MYxbw5FNgowfIJ6K0WCW49hjSo.jpg",
      episodeSources: buildProviderEpisodeSources("FR", RICK_AND_MORTY_FR_EPISODES),
      languages: ["FR"],
      description:
        "Rick et Morty rencontrent un prêteur sur gages dans l'espace, vivent dans des univers parallèles et se retrouvent nez à nez avec le diable."
    }
  ];

  const SUPERNATURAL_EN_EPISODES = [
    {
      id: "supernatural-s01e01",
      provider: "dailymotion",
      title: "Pilot",
      seasonNumber: 1,
      episodeNumber: 1,
      videoId: "k4Kgvh7o91dnnrGw7Yi",
      duration: "00:46:21",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s01e02",
      provider: "dailymotion",
      title: "Wendigo",
      seasonNumber: 1,
      episodeNumber: 2,
      videoId: "k4MJDmehjRt5FwGw96m",
      duration: "00:43:07",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s01e03",
      provider: "dailymotion",
      title: "Dead in the Water",
      seasonNumber: 1,
      episodeNumber: 3,
      videoId: "k7CPLjTEgI3VNgGw96q",
      duration: "00:43:31",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s01e04",
      provider: "dailymotion",
      title: "Phantom Traveler",
      seasonNumber: 1,
      episodeNumber: 4,
      videoId: "kWrm8BI2BLThxPGwcAG",
      duration: "00:42:12",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s01e05",
      provider: "dailymotion",
      title: "Bloody Mary",
      seasonNumber: 1,
      episodeNumber: 5,
      videoId: "kqcvwaYDB6184RGwcIC",
      duration: "00:43:14",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s01e06",
      provider: "dailymotion",
      title: "Skin",
      seasonNumber: 1,
      episodeNumber: 6,
      videoId: "k3tNdFLaQpEQMiGwcNc",
      duration: "00:41:50",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s01e07",
      provider: "dailymotion",
      title: "Hook Man",
      seasonNumber: 1,
      episodeNumber: 7,
      videoId: "k4ReTDJSgIJchIGyLe6",
      duration: "00:40:39",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s01e08",
      provider: "dailymotion",
      title: "Bugs",
      seasonNumber: 1,
      episodeNumber: 8,
      videoId: "k9GvOvsnN1YAERGyLjg",
      duration: "00:43:08",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s01e09",
      provider: "dailymotion",
      title: "Home",
      seasonNumber: 1,
      episodeNumber: 9,
      videoId: "ktffjKeR2qENNjGyLjk",
      duration: "00:42:57",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s01e10",
      provider: "dailymotion",
      title: "Asylum",
      seasonNumber: 1,
      episodeNumber: 10,
      videoId: "k33mvqpriQGgtlGyLjo",
      duration: "00:43:18",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s01e11",
      provider: "dailymotion",
      title: "Scarecrow",
      seasonNumber: 1,
      episodeNumber: 11,
      videoId: "k929VNIg1c7yEPGQ9hM",
      duration: "00:42:38",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s01e12",
      provider: "dailymotion",
      title: "Faith",
      seasonNumber: 1,
      episodeNumber: 12,
      videoId: "",
      duration: "--:--:--",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s01e13",
      provider: "dailymotion",
      title: "Route 666",
      seasonNumber: 1,
      episodeNumber: 13,
      videoId: "",
      duration: "--:--:--",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s01e14",
      provider: "dailymotion",
      title: "Nightmare",
      seasonNumber: 1,
      episodeNumber: 14,
      videoId: "k1LQwD9ytCC7vwGQ9hY",
      duration: "00:42:49",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s01e15",
      provider: "dailymotion",
      title: "The Benders",
      seasonNumber: 1,
      episodeNumber: 15,
      videoId: "",
      duration: "--:--:--",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s01e16",
      provider: "dailymotion",
      title: "Shadow",
      seasonNumber: 1,
      episodeNumber: 16,
      videoId: "k2k4mkXKt6CASWGQ9hU",
      duration: "00:41:48",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s01e17",
      provider: "dailymotion",
      title: "Hell House",
      seasonNumber: 1,
      episodeNumber: 17,
      videoId: "k5L6wkLeoV5QF7GQ9ia",
      duration: "00:40:42",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s01e18",
      provider: "dailymotion",
      title: "Somethings Wicked",
      seasonNumber: 1,
      episodeNumber: 18,
      videoId: "kOzUCPsNcLAshoGQ9ie",
      duration: "00:41:50",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s01e19",
      provider: "dailymotion",
      title: "Provenance",
      seasonNumber: 1,
      episodeNumber: 19,
      videoId: "k4NOpXBOtKMFKeGQ9i6",
      duration: "00:43:28",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s01e20",
      provider: "dailymotion",
      title: "Dead Man's Blood",
      seasonNumber: 1,
      episodeNumber: 20,
      videoId: "",
      duration: "--:--:--",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s01e21",
      provider: "dailymotion",
      title: "Salvation",
      seasonNumber: 1,
      episodeNumber: 21,
      videoId: "",
      duration: "--:--:--",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s01e22",
      provider: "dailymotion",
      title: "Devil's Trap",
      seasonNumber: 1,
      episodeNumber: 22,
      videoId: "",
      duration: "--:--:--",
      resolution: "1280x720"
    },
  ];

  const SUPERNATURAL_S02_EPISODES = [
    {
      id: "supernatural-s02e01",
      provider: "dailymotion",
      title: "In My Time of Dying",
      seasonNumber: 2,
      episodeNumber: 1,
      videoId: "",
      duration: "--:--:--",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s02e02",
      provider: "dailymotion",
      title: "Everybody Loves a Clown",
      seasonNumber: 2,
      episodeNumber: 2,
      videoId: "",
      duration: "--:--:--",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s02e03",
      provider: "dailymotion",
      title: "Bloodlust",
      seasonNumber: 2,
      episodeNumber: 3,
      videoId: "",
      duration: "--:--:--",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s02e04",
      provider: "dailymotion",
      title: "Children Shouldn't Play with Dead Things",
      seasonNumber: 2,
      episodeNumber: 4,
      videoId: "",
      duration: "--:--:--",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s02e05",
      provider: "dailymotion",
      title: "Simon Said",
      seasonNumber: 2,
      episodeNumber: 5,
      videoId: "",
      duration: "--:--:--",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s02e06",
      provider: "dailymotion",
      title: "No Exit",
      seasonNumber: 2,
      episodeNumber: 6,
      videoId: "",
      duration: "--:--:--",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s02e07",
      provider: "dailymotion",
      title: "The Usual Suspects",
      seasonNumber: 2,
      episodeNumber: 7,
      videoId: "",
      duration: "--:--:--",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s02e08",
      provider: "dailymotion",
      title: "Crossroad Blues",
      seasonNumber: 2,
      episodeNumber: 8,
      videoId: "",
      duration: "--:--:--",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s02e09",
      provider: "dailymotion",
      title: "Croatoan",
      seasonNumber: 2,
      episodeNumber: 9,
      videoId: "",
      duration: "--:--:--",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s02e10",
      provider: "dailymotion",
      title: "Hunted",
      seasonNumber: 2,
      episodeNumber: 10,
      videoId: "",
      duration: "--:--:--",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s02e11",
      provider: "dailymotion",
      title: "Playthings",
      seasonNumber: 2,
      episodeNumber: 11,
      videoId: "",
      duration: "--:--:--",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s02e12",
      provider: "dailymotion",
      title: "Nightshifter",
      seasonNumber: 2,
      episodeNumber: 12,
      videoId: "",
      duration: "--:--:--",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s02e13",
      provider: "dailymotion",
      title: "Houses of the Holy",
      seasonNumber: 2,
      episodeNumber: 13,
      videoId: "",
      duration: "--:--:--",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s02e14",
      provider: "dailymotion",
      title: "Born Under a Bad Sign",
      seasonNumber: 2,
      episodeNumber: 14,
      videoId: "",
      duration: "--:--:--",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s02e15",
      provider: "dailymotion",
      title: "Tall Tales",
      seasonNumber: 2,
      episodeNumber: 15,
      videoId: "",
      duration: "--:--:--",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s02e16",
      provider: "dailymotion",
      title: "Roadkill",
      seasonNumber: 2,
      episodeNumber: 16,
      videoId: "",
      duration: "--:--:--",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s02e17",
      provider: "dailymotion",
      title: "Heart",
      seasonNumber: 2,
      episodeNumber: 17,
      videoId: "",
      duration: "--:--:--",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s02e18",
      provider: "dailymotion",
      title: "Hollywood Babylon",
      seasonNumber: 2,
      episodeNumber: 18,
      videoId: "",
      duration: "--:--:--",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s02e19",
      provider: "dailymotion",
      title: "Folsom Prison Blues",
      seasonNumber: 2,
      episodeNumber: 19,
      videoId: "",
      duration: "--:--:--",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s02e20",
      provider: "dailymotion",
      title: "What Is and What Should Never Be",
      seasonNumber: 2,
      episodeNumber: 20,
      videoId: "",
      duration: "--:--:--",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s02e21",
      provider: "dailymotion",
      title: "All Hell Breaks Loose: Part 1",
      seasonNumber: 2,
      episodeNumber: 21,
      videoId: "",
      duration: "--:--:--",
      resolution: "1280x720"
    },
    {
      id: "supernatural-s02e22",
      provider: "dailymotion",
      title: "All Hell Breaks Loose: Part 2",
      seasonNumber: 2,
      episodeNumber: 22,
      videoId: "",
      duration: "--:--:--",
      resolution: "1280x720"
    }
  ];

  const SUPERNATURAL_SEASONS = [
    {
      number: 1,
      episodeNumbers: SUPERNATURAL_EN_EPISODES.map((episode) => episode.episodeNumber),
      sourceUrl: "",
      posterUrl: "https://m.media-amazon.com/images/I/91J4-cAmM4L._AC_UF1000,1000_QL80_.jpg",
      episodeSources: buildProviderEpisodeSources("EN", SUPERNATURAL_EN_EPISODES),
      languages: ["EN"],
      description:
        "Sam et Dean Winchester parcourent les États-Unis pour traquer les forces du Mal responsables de la mort de leur mère, vingt ans plus tôt."
    },
    {
      number: 2,
      episodeNumbers: SUPERNATURAL_S02_EPISODES.map(e => e.episodeNumber),
      episodeSources: buildProviderEpisodeSources("EN", SUPERNATURAL_S02_EPISODES),
      posterUrl: "https://m.media-amazon.com/images/I/91ZAdK0wsiL._AC_UF1000,1000_QL80_.jpg",
      languages: ["EN"]
    }
  ];

  const SMILING_FRIENDS_EPISODES = [
    {
      id: "smiling-friends-s01e01",
      title: "Desmonds Big Day Out",
      seasonNumber: 1,
      episodeNumber: 1,
      sources: {
        EN: {
          language: "EN",
          sourceName: "Google Drive",
          sourceUrl:
            "https://drive.google.com/file/d/1lawhqCgnYYPLEesGLM26E1Fm0Prce01b/view",
          embedUrl:
            "https://drive.google.com/file/d/1lawhqCgnYYPLEesGLM26E1Fm0Prce01b/preview"
        }
      }
    },
    {
      id: "smiling-friends-s01e02",
      title: "Mr Frog",
      seasonNumber: 1,
      episodeNumber: 2,
      sources: {
        EN: {
          language: "EN",
          sourceName: "Google Drive",
          sourceUrl:
            "https://drive.google.com/file/d/1dITO7Sj5rXIAjvqqICVNoZZtMfZgBJk5/view",
          embedUrl:
            "https://drive.google.com/file/d/1dITO7Sj5rXIAjvqqICVNoZZtMfZgBJk5/preview"
        }
      }
    },
    {
      id: "smiling-friends-s01e03",
      title: "Shrimps Odyssey",
      seasonNumber: 1,
      episodeNumber: 3,
      sources: {
        EN: {
          language: "EN",
          sourceName: "Google Drive",
          sourceUrl:
            "https://drive.google.com/file/d/1yqhajG3KM0HAA-2t_FEUpNbTQCehA8iM/view",
          embedUrl:
            "https://drive.google.com/file/d/1yqhajG3KM0HAA-2t_FEUpNbTQCehA8iM/preview"
        }
      }
    },
    {
      id: "smiling-friends-s01e04",
      title: "A Silly Halloween Special",
      seasonNumber: 1,
      episodeNumber: 4,
      sources: {
        EN: {
          language: "EN",
          sourceName: "Google Drive",
          sourceUrl:
            "https://drive.google.com/file/d/1qNrjoVSr_oMRFMzLqZhSBmAdVa2RPSnT/view",
          embedUrl:
            "https://drive.google.com/file/d/1qNrjoVSr_oMRFMzLqZhSBmAdVa2RPSnT/preview"
        }
      }
    },
    {
      id: "smiling-friends-s01e05",
      title: "Who Violently Murdered Simon S Salty",
      seasonNumber: 1,
      episodeNumber: 5,
      sources: {
        EN: {
          language: "EN",
          sourceName: "Google Drive",
          sourceUrl:
            "https://drive.google.com/file/d/1Yl7blgYpxyPiYR7Gj4Lg4T5LDUQse3i2/view",
          embedUrl:
            "https://drive.google.com/file/d/1Yl7blgYpxyPiYR7Gj4Lg4T5LDUQse3i2/preview"
        }
      }
    },
    {
      id: "smiling-friends-s01e06",
      title: "Enchanted Forest",
      seasonNumber: 1,
      episodeNumber: 6,
      sources: {
        EN: {
          language: "EN",
          sourceName: "Google Drive",
          sourceUrl:
            "https://drive.google.com/file/d/1qhsNCZzcbbZ7C-0eKzRvo2HggA9Tyi0_/view",
          embedUrl:
            "https://drive.google.com/file/d/1qhsNCZzcbbZ7C-0eKzRvo2HggA9Tyi0_/preview"
        }
      }
    },
    {
      id: "smiling-friends-s01e07",
      title: "Frowning Friends",
      seasonNumber: 1,
      episodeNumber: 7,
      sources: {
        EN: {
          language: "EN",
          sourceName: "Google Drive",
          sourceUrl:
            "https://drive.google.com/file/d/1eVSeDJpjGUIIuE5wR8b0lJ8wqhGXgdXJ/view",
          embedUrl:
            "https://drive.google.com/file/d/1eVSeDJpjGUIIuE5wR8b0lJ8wqhGXgdXJ/preview"
        }
      }
    },
    {
      id: "smiling-friends-s01e08",
      title: "Charlie Dies and Doesnt Come Back",
      seasonNumber: 1,
      episodeNumber: 8,
      sources: {
        EN: {
          language: "EN",
          sourceName: "Google Drive",
          sourceUrl:
            "https://drive.google.com/file/d/1htSCliOMtS-dICrxewkemDuQkw-FSLzE/view",
          embedUrl:
            "https://drive.google.com/file/d/1htSCliOMtS-dICrxewkemDuQkw-FSLzE/preview"
        }
      }
    },
    {
      id: "smiling-friends-s01e09",
      title: "Smiling Friends Go to Brazil",
      seasonNumber: 1,
      episodeNumber: 9,
      sources: {
        EN: {
          language: "EN",
          sourceName: "Google Drive",
          sourceUrl:
            "https://drive.google.com/file/d/1fkgIUEfOoSAS91dhksvo_x_2MKSfcQSq/view",
          embedUrl:
            "https://drive.google.com/file/d/1fkgIUEfOoSAS91dhksvo_x_2MKSfcQSq/preview"
        }
      }
    },
    {
      id: "smiling-friends-s02e01",
      title: "Gwimbly",
      seasonNumber: 2,
      episodeNumber: 1,
      sources: {
        EN: {
          language: "EN",
          sourceName: "Google Drive",
          sourceUrl:
            "https://drive.google.com/file/d/1Tl6j1b4l9wxf-vINl_tW-4KlO9XrzyNS/view",
          embedUrl:
            "https://drive.google.com/file/d/1Tl6j1b4l9wxf-vINl_tW-4KlO9XrzyNS/preview"
        }
      }
    },
    {
      id: "smiling-friends-s02e02",
      title: "Mr President",
      seasonNumber: 2,
      episodeNumber: 2,
      sources: {
        EN: {
          language: "EN",
          sourceName: "Google Drive",
          sourceUrl:
            "https://drive.google.com/file/d/10Ez3BrLDlpuex8r46SHJhN7uSDeYJohT/view",
          embedUrl:
            "https://drive.google.com/file/d/10Ez3BrLDlpuex8r46SHJhN7uSDeYJohT/preview"
        }
      }
    },
    {
      id: "smiling-friends-s02e03",
      title: "A Allan Adventure",
      seasonNumber: 2,
      episodeNumber: 3,
      sources: {
        EN: {
          language: "EN",
          sourceName: "Google Drive",
          sourceUrl:
            "https://drive.google.com/file/d/1yy3qsqD_PxkIbnhDkkqmGB65iSVmdblA/view",
          embedUrl:
            "https://drive.google.com/file/d/1yy3qsqD_PxkIbnhDkkqmGB65iSVmdblA/preview"
        }
      }
    },
    {
      id: "smiling-friends-s02e04",
      title: "Erm the Boss Finds Love",
      seasonNumber: 2,
      episodeNumber: 4,
      sources: {
        EN: {
          language: "EN",
          sourceName: "Google Drive",
          sourceUrl:
            "https://drive.google.com/file/d/1XB6802H-Y_vvK6-qY6quLHn3E2dYfKfy/view",
          embedUrl:
            "https://drive.google.com/file/d/1XB6802H-Y_vvK6-qY6quLHn3E2dYfKfy/preview"
        }
      }
    },
    {
      id: "smiling-friends-s02e05",
      title: "Brothers Egg",
      seasonNumber: 2,
      episodeNumber: 5,
      sources: {
        EN: {
          language: "EN",
          sourceName: "Google Drive",
          sourceUrl:
            "https://drive.google.com/file/d/10hIwqMmeWSbnlnZ-VrpW4E09jv0l6asJ/view",
          embedUrl:
            "https://drive.google.com/file/d/10hIwqMmeWSbnlnZ-VrpW4E09jv0l6asJ/preview"
        }
      }
    },
    {
      id: "smiling-friends-s02e06",
      title: "Charlie Pim and Bill vs The Alien",
      seasonNumber: 2,
      episodeNumber: 6,
      sources: {
        EN: {
          language: "EN",
          sourceName: "Google Drive",
          sourceUrl:
            "https://drive.google.com/file/d/1gzhg6n7Dk1xOAPyujy-QdaIkUZ_9KWLG/view",
          embedUrl:
            "https://drive.google.com/file/d/1gzhg6n7Dk1xOAPyujy-QdaIkUZ_9KWLG/preview"
        }
      }
    },
    {
      id: "smiling-friends-s02e07",
      title: "The Magical Red Jewel (aka Tyler Gets Fired)",
      seasonNumber: 2,
      episodeNumber: 7,
      sources: {
        EN: {
          language: "EN",
          sourceName: "Google Drive",
          sourceUrl:
            "https://drive.google.com/file/d/1h2KIsdRCBfuvPqiktBDRD-DQP7FwDqzk/view",
          embedUrl:
            "https://drive.google.com/file/d/1h2KIsdRCBfuvPqiktBDRD-DQP7FwDqzk/preview"
        }
      }
    },
    {
      id: "smiling-friends-s02e08",
      title: "Pim Finally Turns Green",
      seasonNumber: 2,
      episodeNumber: 8,
      sources: {
        EN: {
          language: "EN",
          sourceName: "Google Drive",
          sourceUrl:
            "https://drive.google.com/file/d/1ypjJ4JZho-NVPCR63qHH82MF_-ni7sOM/view",
          embedUrl:
            "https://drive.google.com/file/d/1ypjJ4JZho-NVPCR63qHH82MF_-ni7sOM/preview"
        }
      }
    },
    {
      id: "smiling-friends-s03e01",
      title: "Silly Samuel",
      seasonNumber: 3,
      episodeNumber: 1,
      sources: {
        EN: {
          language: "EN",
          sourceName: "Google Drive",
          sourceUrl:
            "https://drive.google.com/file/d/1DTpZVAJKtEc35nVolD36r6-RPp2HXjs-/view",
          embedUrl:
            "https://drive.google.com/file/d/1DTpZVAJKtEc35nVolD36r6-RPp2HXjs-/preview"
        }
      }
    },
    {
      id: "smiling-friends-s03e02",
      title: "Le Voyage Incroyable de Monsieur Grenouille",
      seasonNumber: 3,
      episodeNumber: 2,
      sources: {
        EN: {
          language: "EN",
          sourceName: "Google Drive",
          sourceUrl:
            "https://drive.google.com/file/d/1a2-qFGK3lQmS7T38F8c5_PMOc_7gnQiv/view",
          embedUrl:
            "https://drive.google.com/file/d/1a2-qFGK3lQmS7T38F8c5_PMOc_7gnQiv/preview"
        }
      }
    },
    {
      id: "smiling-friends-s03e03",
      title: "Mole Man",
      seasonNumber: 3,
      episodeNumber: 3,
      sources: {
        EN: {
          language: "EN",
          sourceName: "Google Drive",
          sourceUrl:
            "https://drive.google.com/file/d/1di10djT8TRDdyNitBx_26TmlMjTaiD_K/view",
          embedUrl:
            "https://drive.google.com/file/d/1di10djT8TRDdyNitBx_26TmlMjTaiD_K/preview"
        }
      }
    },
    {
      id: "smiling-friends-s03e04",
      title: "Curse of the Green Halloween Witch",
      seasonNumber: 3,
      episodeNumber: 4,
      sources: {
        EN: {
          language: "EN",
          sourceName: "Google Drive",
          sourceUrl:
            "https://drive.google.com/file/d/1fIhVOXU9YJgepJu4w7kLHKi57UsDWJvi/view",
          embedUrl:
            "https://drive.google.com/file/d/1fIhVOXU9YJgepJu4w7kLHKi57UsDWJvi/preview"
        }
      }
    },
    {
      id: "smiling-friends-s03e05",
      title: "Pim and Charlie Save Mother Nature",
      seasonNumber: 3,
      episodeNumber: 5,
      sources: {
        EN: {
          language: "EN",
          sourceName: "Google Drive",
          sourceUrl:
            "https://drive.google.com/file/d/1elmWWO29f4EsRrkB-r2JumaateTFGtv9/view",
          embedUrl:
            "https://drive.google.com/file/d/1elmWWO29f4EsRrkB-r2JumaateTFGtv9/preview"
        }
      }
    },
    {
      id: "smiling-friends-s03e06",
      title: "Squim Returns",
      seasonNumber: 3,
      episodeNumber: 6,
      sources: {
        EN: {
          language: "EN",
          sourceName: "Google Drive",
          sourceUrl:
            "https://drive.google.com/file/d/1VaHIH3YUpCBWiK8Z1OB40SHa3ERLg3Dg/view",
          embedUrl:
            "https://drive.google.com/file/d/1VaHIH3YUpCBWiK8Z1OB40SHa3ERLg3Dg/preview"
        }
      }
    },
    {
      id: "smiling-friends-s03e07",
      title: "Shmaloogles",
      seasonNumber: 3,
      episodeNumber: 7,
      sources: {
        EN: {
          language: "EN",
          sourceName: "Google Drive",
          sourceUrl:
            "https://drive.google.com/file/d/1ULDM01lpyg_1r090YBzmmFvkT4ZE2nkW/view",
          embedUrl:
            "https://drive.google.com/file/d/1ULDM01lpyg_1r090YBzmmFvkT4ZE2nkW/preview"
        }
      }
    },
    {
      id: "smiling-friends-s03e08",
      title: "The Glep Ep",
      seasonNumber: 3,
      episodeNumber: 8,
      sources: {
        EN: {
          language: "EN",
          sourceName: "Google Drive",
          sourceUrl:
            "https://drive.google.com/file/d/1Px2ZVn92yP2udwoZP9YZuDbpEyQYy4ku/view",
          embedUrl:
            "https://drive.google.com/file/d/1Px2ZVn92yP2udwoZP9YZuDbpEyQYy4ku/preview"
        }
      }
    },
    {
      id: "smiling-friends-s03e09",
      title: "Friend-Bot (Version 12589218731809213528796879521)",
      seasonNumber: 3,
      episodeNumber: 9,
      sources: {
        EN: {
          language: "EN",
          sourceName: "Google Drive",
          sourceUrl:
            "https://drive.google.com/file/d/1OdGhIsgJu5VrqO8wmpyImAOU_Ilhu9gf/view",
          embedUrl:
            "https://drive.google.com/file/d/1OdGhIsgJu5VrqO8wmpyImAOU_Ilhu9gf/preview"
        }
      }
    },
    {
      id: "smiling-friends-s03e10",
      title: "Charlie's Uncle Dies and Doesn't Come Back",
      seasonNumber: 3,
      episodeNumber: 10,
      sources: {
        EN: {
          language: "EN",
          sourceName: "Google Drive",
          sourceUrl:
            "https://drive.google.com/file/d/145xPW-Ub4DnHGkG9Xk50igzANPl15BsX/view",
          embedUrl:
            "https://drive.google.com/file/d/145xPW-Ub4DnHGkG9Xk50igzANPl15BsX/preview"
        }
      }
    }
  ];

  const SMILING_FRIENDS_SEASONS = [
    {
      number: 1,
      episodeNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      sourceUrl: "",
      posterUrl:
        "https://m.media-amazon.com/images/I/61lNEhozW-L.jpg",
      episodeSources: {
        1: SMILING_FRIENDS_EPISODES[0],
        2: SMILING_FRIENDS_EPISODES[1],
        3: SMILING_FRIENDS_EPISODES[2],
        4: SMILING_FRIENDS_EPISODES[3],
        5: SMILING_FRIENDS_EPISODES[4],
        6: SMILING_FRIENDS_EPISODES[5],
        7: SMILING_FRIENDS_EPISODES[6],
        8: SMILING_FRIENDS_EPISODES[7],
        9: SMILING_FRIENDS_EPISODES[8]
      },
      languages: ["EN"]
    },
    {
      number: 2,
      episodeNumbers: [1,2,3,4,5,6,7,8],
      sourceUrl: "",
      posterUrl:
        "https://image.tmdb.org/t/p/original/oDJ8HHzFeCH83QyWq86pN5i7nUt.jpg",
      episodeSources: {
        1: SMILING_FRIENDS_EPISODES[9],
        2: SMILING_FRIENDS_EPISODES[10],
        3: SMILING_FRIENDS_EPISODES[11],
        4: SMILING_FRIENDS_EPISODES[12],
        5: SMILING_FRIENDS_EPISODES[13],
        6: SMILING_FRIENDS_EPISODES[14],
        7: SMILING_FRIENDS_EPISODES[15],
        8: SMILING_FRIENDS_EPISODES[16]
      },
      languages: ["EN"],
      description:
        "Charlie et Pim continuent d'aider les gens à retrouver le sourire dans des situations toujours plus absurdes."
    },
    {
      number: 3,
      episodeNumbers: [1,2,3,4,5,6,7,8,9,10],
      sourceUrl: "",
      posterUrl:
        "https://m.media-amazon.com/images/M/MV5BYjNkMjdiZGEtMTg3Mi00YTAzLWJkMGYtMmIxMzNjMmRhOGNmXkEyXkFqcGc@._V1_.jpg",
      episodeSources: {
        1: SMILING_FRIENDS_EPISODES[17],
        2: SMILING_FRIENDS_EPISODES[18],
        3: SMILING_FRIENDS_EPISODES[19],
        4: SMILING_FRIENDS_EPISODES[20],
        5: SMILING_FRIENDS_EPISODES[21],
        6: SMILING_FRIENDS_EPISODES[22],
        7: SMILING_FRIENDS_EPISODES[23],
        8: SMILING_FRIENDS_EPISODES[24],
        9: SMILING_FRIENDS_EPISODES[25],
        10: SMILING_FRIENDS_EPISODES[26]
      },
      languages: ["EN"]
    }
  ];


  const catalogue = [
    {
      provider: "uqload",
      id: "project-hail-mary",
      title: "Project Hail Mary",
      fileId: "9fyok6ttwrgj",
      category: "Film",
      duration: "02:36:22",
      resolution: "1280x720",
      language: "En",
      date: "2026",
      posterUrl: "miniatures/posters/project-hail-mary.webp",
      accentColor: "#2f6e9f",
      description:
        "Science-fiction spatiale tendue autour d'une mission de survie, d'un vaisseau isolé et d'un mystère capable de décider du sort de la Terre.",
      tags: ["Science-fiction", "Espace"]
    },
    {
      provider: "uqload",
      id: "limitless",
      title: "Limitless",
      fileId: "8ipcxujsg26z",
      category: "Film",
      duration: "01:38:39",
      resolution: "1280x720",
      language: "Fr",
      date: "2011",
      posterUrl: "miniatures/posters/limitless.webp",
      accentColor: "#c8892d",
      description:
        "Thriller nerveux où une pilule expérimentale décuple les capacités d'un écrivain et l'entraîne dans un jeu de pouvoir dangereux.",
      tags: ["Thriller"]
    },
    {
      provider: "uqload",
      id: "interstella-5555",
      title: "Interstella 5555",
      fileId: "amvnri9r8u54",
      category: "Film",
      duration: "01:05:35",
      resolution: "512x384",
      language: "En",
      date: "2003",
      posterUrl: "miniatures/posters/interstella-5555.webp",
      accentColor: "#3560c8",
      description:
        "Odyssée animée et musicale portée par Daft Punk, entre enlèvement interstellaire, pop cosmique et aventure sans dialogue.",
      tags: ["Animé", "Musique"]
    },
    {
      provider: "uqload",
      id: "silent-hill",
      title: "Silent Hill",
      fileId: "h67yff6g8a5g",
      category: "Film",
      duration: "02:05:21",
      resolution: "1126x504",
      language: "Fr",
      languages: ["Fr"],
      date: "2006",
      posterUrl: "miniatures/posters/silent-hill.webp",
      accentColor: "#8f3a2f",
      description:
        "Horreur brumeuse et oppressante autour d'une mère qui cherche sa fille dans une ville fantôme hantée par des visions cauchemardesques.",
      tags: ["Horreur", "Survie", "Psychologique"]
    },
    {
      provider: "uqload",
      id: "silent-hill-revelation",
      title: "Silent Hill Revelation",
      fileId: "av5hef1rja8r",
      category: "Film",
      duration: "01:34:47",
      resolution: "872x384",
      language: "Fr",
      languages: ["Fr"],
      date: "2012",
      posterUrl: "miniatures/posters/silent-hill-revelation.webp",
      accentColor: "#8a2f33",
      description:
        "Retour dans l'univers Silent Hill avec une héroïne poursuivie par son passé, des cultes inquiétants et des créatures sorties du brouillard.",
      tags: ["Horreur", "Survie", "Psychologique"]
    },
    {
      provider: "youtube",
      id: "postal-2007",
      title: "Postal",
      videoId: "dBFLgBlm5_E",
      category: "Film",
      duration: "01:57:26",
      resolution: "1920x1080",
      language: "En",
      date: "2007",
      posterUrl: "miniatures/posters/postal-2007.webp",
      accentColor: "#b71825",
      description:
        "Comédie noire volontairement excessive, adaptée du jeu culte, avec satire, chaos et humour provocateur en version YouTube intégrée.",
      tags: ["Action", "Comédie"]
    },
    {
      provider: "embed",
      id: "superbad",
      title: "Superbad",
      category: "Film",
      duration: "1h53",
      resolution: "HD",
      language: "FR+EN",
      languages: ["FR", "EN"],
      date: "2007",
      sourceName: "Vidzy",
      sourceUrl: "https://vidzy.org/embed-6uytjx9c8cta.html",
      embedUrl: "https://vidzy.org/embed-6uytjx9c8cta.html",
      posterUrl: "https://image.tmdb.org/t/p/w400/ek8e8txUyUwd2BNqj6lFEerJfbq.jpg",
      accentColor: "#d96c2f",
      description:
        "Evan et Seth sont deux amis pas très futés qui ne peuvent pas se passer l'un de l'autre. Pourtant, il va bien falloir qu'ils apprennent, parce que cette année, ils sont inscrits dans deux universités différentes ! Evan est craquant, plutôt intelligent et constamment terrifié par la vie - et les filles en particulier. De son côté, Seth parle trop, ne tient pas en place et s'intéresse vraiment beaucoup à tous les aspects de la reproduction humaine... Pour ces deux-là, il est temps d'affronter l'existence, les filles et leur destin, mais pour cela, ils doivent d'abord survivre à cette nuit fatidique, leur première nuit, celle qui vous excite, vous terrifie et dont vous vous souviendrez toute votre vie !",
      tags: ["Comédie"],
      sources: {
        FR: {
          language: "FR",
          sourceName: "Vidzy",
          sourceUrl: "https://vidzy.org/embed-6uytjx9c8cta.html",
          embedUrl: "https://vidzy.org/embed-6uytjx9c8cta.html"
        },
        EN: {
          language: "EN",
          sourceName: "Vaplayer",
          sourceUrl: "https://vaplayer.ru/embed/movie/8363",
          embedUrl: "https://vaplayer.ru/embed/movie/8363"
        }
      }
    },
    {
      provider: "embed",
      id: "project-x-2012",
      title: "Project X",
      category: "Film",
      duration: "1h28",
      resolution: "HD",
      language: "EN",
      date: "2012",
      sourceName: "Vaplayer",
      sourceUrl: "https://vaplayer.ru/embed/movie/57214",
      embedUrl: "https://vaplayer.ru/embed/movie/57214",
      posterUrl: "https://image.tmdb.org/t/p/w500/lUPDGT3lyRrq8SvWuNWG2DP64bR.jpg",
      accentColor: "#c9342f",
      description:
        "Three high school seniors aim to elevate their social status by hosting an unforgettable party. What starts as a simple gathering quickly escalates into an outlandish celebration as excitement builds and more guests arrive. Chaos ensues as the night unfolds, with the trio struggling to manage the growing crowd and the mayhem that follows. Their attempt to create a memorable night spirals into unforeseen consequences, challenging their friendships and reputations while showcasing the unpredictable nature of youth and celebration.",
      tags: ["Comédie"]
    },
    {
      provider: "embed",
      id: "idiocracy",
      title: "Idiocracy",
      category: "Film",
      duration: "1h24",
      resolution: "HD",
      language: "FR+EN",
      languages: ["FR", "EN"],
      date: "2006",
      sourceName: "Vidzy",
      sourceUrl: "https://vidzy.org/embed-s7w75tja413n.html",
      embedUrl: "https://vidzy.org/embed-s7w75tja413n.html",
      posterUrl: "https://image.tmdb.org/t/p/w400/rKsiNxKjhWEwndOgWPs273oy9EZ.jpg",
      accentColor: "#d7bc2f",
      description:
        "Aux États-Unis, l'armée a mis au point des caissons d'hibernation permettant de conserver ses meilleurs soldats pour les réveiller en cas de conflits. Le Pentagone demande un test pour s'assurer de la fiabilité. Deux cobayes sont choisis pour leur Q.I moyen et sans aucune famille : Joe Bowers, un homme sans ambition, et Rita, une prostituée. Le projet est oublié dans un hangar militaire. 500 ans plus tard, le caisson de Joe est accidentellement ouvert et il découvre le résultat de la culture américaine : des débiles gavés de marketing qui ne savent plus rien faire.",
      tags: ["Comédie", "Science-fiction", "Satire"],
      sources: {
        FR: {
          language: "FR",
          sourceName: "Vidzy",
          sourceUrl: "https://vidzy.org/embed-s7w75tja413n.html",
          embedUrl: "https://vidzy.org/embed-s7w75tja413n.html"
        },
        EN: {
          language: "EN",
          sourceName: "Vaplayer",
          sourceUrl: "https://vaplayer.ru/embed/movie/7512",
          embedUrl: "https://vaplayer.ru/embed/movie/7512"
        }
      }
    },
    {
      provider: "uqload",
      id: "blade-runner-2049",
      title: "Blade Runner 2049",
      fileId: "q2m84hf41l6c",
      category: "Film",
      duration: "02:43:27",
      resolution: "864x360",
      language: "Fr",
      date: "2017",
      posterUrl: "https://image.tmdb.org/t/p/w400/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
      accentColor: "#d07a2d",
      description:
        "En 2049, la société est fragilisée par les tensions entre humains et réplicants. L'officier K découvre un secret capable de changer le monde.",
      tags: ["Science-fiction"]
    },
    {
      provider: "uqload",
      id: "blade-runner",
      title: "Blade Runner",
      fileId: "7huxxpyzzxwa",
      category: "Film",
      duration: "01:51:48",
      resolution: "480x272",
      language: "Fr",
      date: "1982",
      posterUrl: "https://image.tmdb.org/t/p/w400/tDR1V8PbwSGrvi9D7eZneku7Rj.jpg",
      accentColor: "#1e6d7d",
      description:
        "Los Angeles, 2019. Rick Deckard traque des réplicants en fuite dans une société déshumanisée.",
      tags: ["Science-fiction"]
    },
    {
      provider: "embed",
      id: "return-to-silent-hill",
      title: "Return to Silent Hill",
      category: "Film",
      duration: "01:45:26",
      resolution: "1080x720",
      language: "En",
      date: "2026",
      sourceName: "Vaplayer",
      sourceUrl: "https://vaplayer.ru/embed/movie/680493",
      embedUrl: "https://vaplayer.ru/embed/movie/680493",
      posterUrl: "https://m.media-amazon.com/images/M/MV5BOWVjYjU0ZTAtNGVlNi00NGM1LTgzZjctNTZjMjAyYTc4N2VlXkEyXkFqcGc@._V1_FMjpg_UY2998_.jpg",
      accentColor: "#8a3038",
      description:
        "Retour dans l'univers Silent Hill, exploration psychologique et horreur atmosphérique centrée sur la mémoire, la perte et les manifestations de la ville.",
      tags: ["Horreur", "Psychologique"]
    },
    buildSeries({
      id: "rick-et-morty-vf",
      title: "Rick et Morty",
      date: "2013",
      sourceName: "Dailymotion",
      allowExternalSource: false,
      posterUrl: "https://image.tmdb.org/t/p/w500/qo07tk7mF3c63G7MktMVA2GApZt.jpg",
      accentColor: "#58b642",
      description:
        "Com\u00e9die de science-fiction anim\u00e9e centr\u00e9e sur les aventures interdimensionnelles de Rick Sanchez et Morty Smith, avec les \u00e9pisodes FR disponibles en player.",
      tags: ["Animation", "Science-fiction", "Com\u00e9die"],
      languages: ["FR"],
      seasons: RICK_AND_MORTY_SEASONS
    }),
    buildSeries({
      id: "supernatural",
      title: "Supernatural",
      date: "2005",
      sourceName: "Dailymotion",
      allowExternalSource: false,
      posterUrl: "https://image.tmdb.org/t/p/w400/rffL4ayOB0NaY3jcD1L2VsVoh0n.jpg",
      accentColor: "#52657d",
      description:
        "Sam et Dean Winchester sillonnent les \u00c9tats-Unis pour enqu\u00eater sur des ph\u00e9nom\u00e8nes paranormaux et affronter des cr\u00e9atures surnaturelles.",
      tags: ["Fantastique", "Horreur", "Surnaturel"],
      languages: ["EN"],
      seasons: SUPERNATURAL_SEASONS
    }),
    buildSeries({
      id: "smiling-friends",
      title: "Smiling Friends",
      date: "2020",
      sourceName: "Google Drive",
      allowExternalSource: false,
      posterUrl:
        "https://m.media-amazon.com/images/M/MV5BYjNkMjdiZGEtMTg3Mi00YTAzLWJkMGYtMmIxMzNjMmRhOGNmXkEyXkFqcGc@._V1_.jpg",
      accentColor: "#f2d74c",
      description:
        "The adventures of the employees of a small company whose goal is to bring joy to a strange world. Charlie, the cynic, Pim, the model employee, and Allan, an organization freak, are on a mission to bring smiles back to people's faces.",
      tags: ["Animation", "Comédie"],
      languages: ["EN"],
      seasons: SMILING_FRIENDS_SEASONS
    }),
    {
      provider: "embed",
      id: "coraline",
      title: "Coraline",
      category: "Film",
      duration: "1h40",
      resolution: "HD",
      language: "VF",
      date: "2009",
      sourceName: "Vidzy",
      sourceUrl: "https://vidzy.org/embed-bk2tw1uqgprz.html",
      embedUrl: "https://vidzy.org/embed-bk2tw1uqgprz.html",
      posterUrl: "https://image.tmdb.org/t/p/w400/4jeFXQYytChdZYE9JYO7Un87IlW.jpg",
      accentColor: "#5e55a3",
      description:
        "Coraline Jones est une fillette intrépide et douée d'une curiosité sans limites. Ses parents, qui ont tout juste emménagé avec elle dans une étrange maison, n'ont guère de temps à lui consacrer. Pour tromper son ennui, Coraline décide donc de jouer les exploratrices. Ouvrant une porte condamnée, elle pénètre dans un appartement identique au sien, mais où tout est différent. Dans cet Autre Monde, chaque chose lui paraît plus belle, plus colorée et plus attrayante. Son Autre Mère est pleinement disponible, son Autre Père prend la peine de lui mitonner des plats exquis, et même le Chat, si hautain dans la Vraie vie, daigne s'entretenir avec elle. Coraline est bien tentée d'élire domicile dans ce Monde merveilleux, qui répond à toutes ses attentes. Mais le rêve va très vite tourner au cauchemar. Prisonnière de l'Autre Mère, Coraline va devoir déployer des trésors de bravoure, d'imagination et de ténacité pour rentrer chez elle et sauver sa Vraie famille.",
      tags: ["Animation", "Familial", "Fantastique"]
    },
    {
      provider: "embed",
      id: "the-substance",
      title: "The Substance",
      category: "Film",
      duration: "2h21",
      resolution: "HD",
      language: "TrueFrench",
      date: "2024",
      sourceName: "Vidzy",
      sourceUrl: "https://vidzy.live/embed-k1qmqmy44x63.html",
      embedUrl: "https://vidzy.live/embed-k1qmqmy44x63.html",
      posterUrl: "https://image.tmdb.org/t/p/w300/noHuScdXjsL9sWkQBOdqCVeTUrY.jpg",
      accentColor: "#b62d39",
      description:
        "Après son licenciement, Elisabeth Sparkle teste une substance promettant une version plus jeune et parfaite d'elle-même, avec des conséquences physiques extrêmes.",
      tags: ["Horreur", "Science-fiction", "Body horror"]
    },
    {
      provider: "embed",
      id: "exit-8",
      title: "Exit 8",
      category: "Film",
      duration: "1h40",
      resolution: "HD",
      language: "Fr",
      date: "2025",
      sourceName: "Vidzy",
      sourceUrl: "https://vidzy.live/embed-u7pmwypb4kp2.html",
      embedUrl: "https://vidzy.live/embed-u7pmwypb4kp2.html",
      posterUrl: "https://image.tmdb.org/t/p/w300/4moIv5Zewxg0gFuNC7m75x3JbDx.jpg",
      accentColor: "#b9a03a",
      description:
        "Un homme piégé dans un couloir de métro cherche la sortie 8 en repérant les anomalies, sous peine de revenir au point de départ.",
      tags: ["Horreur", "Mystère", "Thriller"]
    },
    {
      provider: "uqload",
      id: "the-pick-of-destiny",
      title: "The Pick of Destiny",
      fileId: "acjonillkj0b",
      category: "Film",
      duration: "01:30:14",
      resolution: "672x360",
      language: "Fr",
      date: "2006",
      posterUrl: "https://image.tmdb.org/t/p/w400/kYo7TWASMC3YG3dJVsEsE4CNkd7.jpg",
      accentColor: "#c28b24",
      description:
        "Pas de chance pour le jeune JB. Il est passionné de rock'n'roll dans une famille ultra religieuse qui considère cette musique comme l'œuvre du diable. Lorsque son père lui colle une raclée en arrachant tous les posters de ses idoles, JB s'enfuit et part pour Hollywood y chercher le secret du rock'n'roll... ",
      tags: ["Comédie", "Musique"]
    },
    {
      provider: "embed",
      id: "l-echelle-de-jacob-1990",
      title: "L'Échelle de Jacob",
      category: "Film",
      duration: "1h52",
      resolution: "1080x720",
      language: "Fr",
      date: "1990",
      sourceName: "Vidzy",
      sourceUrl: "https://vidzy.org/embed-woqfe8k3cxj0.html",
      embedUrl: "https://vidzy.org/embed-woqfe8k3cxj0.html",
      posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/kSfvkCE8mwZCxRH0T4GxGz3SfLP.jpg",
      accentColor: "#65715f",
      description:
        "Jacob Singer, un employé des postes new-yorkaises, est assailli par de nombreux cauchemars durant ses journées. Il voit des hommes aux visages déformés et se retrouve dans des lieux qu'il ne connaît pas. Jacob est victime des flashbacks incessants de son premier mariage, de la mort de son fils et de son service au Vietnam. Jours après jours, Jacob s'enfonce dans la folie en essayant de comprendre ce qui lui arrive avec l'aide de Jezebel, son épouse.",
      tags: ["Drame", "Mystère", "Horreur"]
    },
    {
      provider: "embed",
      id: "backrooms",
      title: "Backrooms",
      category: "Film",
      duration: "01:42:56",
      resolution: "1080x720",
      language: "En",
      date: "2026",
      sourceName: "Vidzy",
      sourceUrl: "https://vidzy.org/embed-e525be2gf8bi.html",
      embedUrl: "https://vidzy.org/embed-e525be2gf8bi.html",
      posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/thQQ3BBBhGDtWm3UTtabhyDJd8U.jpg",
      accentColor: "#b99b37",
      description:
        "Un jeune cinéaste bascule dans une autre dimension vide et labyrinthique, qui semble abriter des êtres d'un autre monde.",
      tags: ["Horreur", "Mystère", "Science-Fiction", "CAMRip"]
    },
    {
      provider: "embed",
      id: "obsession",
      title: "Obsession",
      category: "Film",
      duration: "1:45:29",
      resolution: "1080x720",
      language: "Fr",
      date: "2026",
      sourceName: "Vidzy",
      sourceUrl: "https://vidzy.org/embed-kdd8mtwq0j1i.html",
      embedUrl: "https://vidzy.org/embed-kdd8mtwq0j1i.html",
      posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/mDCR1frpUvGfIKksuM440VLb7X9.jpg",
      accentColor: "#b13e5a",
      description:
        "Et si vous pouviez réaliser votre rêve le plus fou ? Un jeune introverti met la main sur un objet magique capable d’exaucer n’importe quel souhait. Son crush de toujours tombe alors raide dingue de lui… jusqu’à l’obsession la plus totale. Faites attention à ce que vous souhaitez !",
      tags: ["Horreur", "CAMRip"]
    },
    {
      provider: "embed",
      id: "numero-9",
      title: "Numéro 9",
      category: "Film",
      duration: "1:19:22",
      resolution: "1080x720",
      language: "Fr",
      date: "2009",
      sourceName: "Vidzy",
      sourceUrl: "https://vidzy.org/embed-7noyoadpqz9r.html",
      embedUrl: "https://vidzy.org/embed-7noyoadpqz9r.html",
      posterUrl: "https://image.tmdb.org/t/p/w400/h7uO28IWKtIIXhPWKvVdFOaPcSq.jpg",
      accentColor: "#72844a",
      description:
        "Dans un futur proche, la Terre a été ravagée par une grande guerre entre les hommes et les puissantes machines qu'ils avaient créées. Sachant l'humanité condamnée, un scientifique crée 9 petites créatures, fragiles et sans défense à partir d'objets divers ramassés dans les décombres. Incapables de s'opposer aux machines, ils ont formé une petite communauté survivant au jour le jour dans les décombres. Mais le dernier né de cette famille, le Numéro 9 a une mission. Il détient en lui la clé de leur survie et devra convaincre ses camarades de quitter leur refuge de fortune pour s'aventurer au coeur du royaume des machines. Ce qu'ils vont découvrir en chemin représente peut-être le dernier espoir de l'Humanité.",
      tags: ["Action", "Aventure", "Animation", "Science-Fiction", "Thriller"]
    },
    {
      provider: "embed",
      id: "fight-club",
      title: "Fight Club",
      category: "Film",
      duration: "2:19:08",
      resolution: "1080x720",
      language: "Fr",
      date: "1999",
      sourceName: "Vidzy",
      sourceUrl: "https://vidzy.org/embed-8bbcxyiitroi.html",
      embedUrl: "https://vidzy.org/embed-8bbcxyiitroi.html",
      posterUrl: "https://image.tmdb.org/t/p/w400/t1i10ptOivG4hV7erkX3tmKpiqm.jpg",
      accentColor: "#c24568",
      description:
        "Le narrateur, sans identité précise, vit seul, travaille seul, dort seul, mange seul ses plateaux‐repas pour une personne comme beaucoup d’autres personnes seules qui connaissent la misère humaine, morale et sexuelle. C’est pourquoi il va devenir membre du Fight club, un lieu clandestin où il va pouvoir retrouver sa virilité, l’échange et la communication. Ce club est dirigé par Tyler Durden, une sorte d’anarchiste entre gourou et philosophe qui prêche l’amour de son prochain.",
      tags: ["Drame"]
    },
    {
      provider: "embed",
      id: "a-minecraft-movie",
      title: "A Minecraft Movie",
      category: "Film",
      duration: "1:41:09",
      resolution: "1080x720",
      language: "En",
      date: "2025",
      sourceName: "vaplayer",
      sourceUrl: "https://vaplayer.ru/embed/movie/950387",
      embedUrl: "https://vaplayer.ru/embed/movie/950387",
      posterUrl: "https://image.tmdb.org/t/p/w500/yFHHfHcUgGAxziP1C3lLt0q2T4s.jpg",
      accentColor: "#509a42",
      description:
        "Four unlikely friends face everyday challenges until a mysterious portal transports them to the Overworld, a whimsical, blocky realm fueled by creativity. To return home, they must navigate this fantastical landscape, tackling unique obstacles along the way. With the help of the skilled crafter, Steve, the group embarks on an enchanting adventure that tests their ingenuity and teamwork. As they explore this vibrant world, they learn to embrace their differences and discover the power of friendship in overcoming adversity.",
      tags: ["Famille", "Aventure", "Comédie"]
    },
    {
      provider: "embed",
      id: "everything-everywhere-all-at-once",
      title: "Everything Everywhere All at Once",
      category: "Film",
      duration: "2h19",
      resolution: "HD",
      language: "FR+EN",
      languages: ["FR", "EN"],
      date: "2022",
      sourceName: "Vidzy",
      sourceUrl: "https://vidzy.org/embed-iglebwn5j0u8.html",
      embedUrl: "https://vidzy.org/embed-iglebwn5j0u8.html",
      posterUrl: "https://image.tmdb.org/t/p/w400/rKvCys0fMIIi1X9rmJBxTPLAtoU.jpg",
      accentColor: "#FF0000",
      description:
        "Evelyn Wang est à bout : elle ne comprend plus sa famille, son travail et croule sous les impôts… Soudain, elle se retrouve plongée dans le multivers, des mondes parallèles où elle explore toutes les vies qu’elle aurait pu mener. Face à des forces obscures, elle seule peut sauver le monde mais aussi préserver la chose la plus précieuse : sa famille.",
      tags: ["Action", "Aventure", "Science-Fiction"],
      sources: {
        FR: {
          language: "FR",
          sourceName: "Vidzy",
          sourceUrl: "https://vidzy.org/embed-iglebwn5j0u8.html",
          embedUrl: "https://vidzy.org/embed-iglebwn5j0u8.html"
        },
        EN: {
          language: "EN",
          sourceName: "Vaplayer",
          sourceUrl: "https://vaplayer.ru/embed/movie/545611",
          embedUrl: "https://vaplayer.ru/embed/movie/545611"
        }
      }
    },
    {
      provider: "embed",
      id: "iron-lung",
      title: "Iron Lung",
      category: "Film",
      duration: "2:07:00",
      resolution: "1080x720",
      language: "En",
      date: "2025",
      sourceName: "",
      sourceUrl: "",
      embedUrl: "",
      posterUrl: "https://m.media-amazon.com/images/M/MV5BYzkxOGU1YmQtNDc0Ni00M2JhLWFlZjktODMzOGU3MjQxMTQ0XkEyXkFqcGc@._V1_.jpg",
      accentColor: "#a00000",
      description:
        "Les étoiles ne sont plus. Les planètes ont disparu. Seuls quelques individus subsistent, à bord de stations spatiales ou de vaisseaux errants. Ils ont survécu pour assister à la fin et lui donner un nom : Le Rapt silencieux. Après des années de déclin et d'infrastructures en perdition, l'Iron Consolidation fait une découverte sur une lune désolée, AT-5. Un océan de sang. L'Iron Consolidation lance immédiatement une expédition, avec l'espoir d'y trouver des ressources cruciales.",
      tags: ["Horreur", "Science-Fiction", "Psychologique"]
    }
  ];

  function buildStandaloneEpisode(episode) {
    const provider = String(episode.provider || "").toLowerCase();
    const buildSource = PROVIDERS[provider];

    if (!buildSource) {
      throw new Error(`Provider episode inconnu: ${episode.provider}`);
    }

    const { provider: _provider, videoId, fileId, ...details } = episode;

    return Object.freeze({
      ...details,
      ...buildSource(episode),
      category: "Serie",
      seriesId: "supernatural",
      seriesTitle: "Supernatural",
      language: "EN",
      date: "2005",
      posterUrl: "miniatures/posters/Supernatural.jpg",
      accentColor: "#52657d",
      description:
        "Sam et Dean Winchester parcourent les États-Unis pour traquer les forces du Mal.",
      tags: Object.freeze(["Fantastique", "Horreur", "Surnaturel"])
    });
  }

  function buildVideo(item) {
    const provider = String(item.provider || "").toLowerCase();
    const buildSource = PROVIDERS[provider];
    if (!buildSource) {
      throw new Error(`Provider vidéo inconnu: ${item.provider}`);
    }

    const { provider: _provider, fileId, videoId, ...details } = item;
    const video = {
      ...details,
      ...(videoId !== undefined ? { videoId } : {}),
      ...buildSource(item),
      ...(item.sourceUrl !== undefined && !String(item.sourceUrl || "").trim()
        ? { missingSourceUrl: true }
        : {}),
      tags: Object.freeze([...(item.tags || [])])
    };

    return Object.freeze(video);
  }

  const videos = catalogue.map(buildVideo);
  window.BOILED_VIDEOS = Object.freeze(videos);
  window.BOILED_EPISODES = Object.freeze(
    videos.flatMap((item) => item.seasons?.flatMap((season) => season.episodes || []) || [])
  );
})();
