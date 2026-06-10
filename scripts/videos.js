// Catalogue central: tout film ajouté dans `catalogue` apparaît automatiquement
// sur l'accueil, dans la recherche, dans le player et dans les avis.
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
        embedUrl: `https://www.dailymotion.com/embed/video/${item.videoId}`
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
    1. Creer une liste de saisons avec number, episodes, sourceUrl, posterUrl et description.
    2. Appeler buildSeries({ id, title, date, posterUrl, description, tags, seasons }).
    3. Ajouter seasonSourceMaps seulement si une langue/source supplementaire existe.
  */
  function buildEpisodes(config, defaults = {}) {
    const seasonNumber = config.number;
    const availableEpisodes = Number(config.availableEpisodes ?? config.episodes ?? config.totalEpisodes) || 0;
    const sourceName = config.sourceName || defaults.sourceName || "Player";
    const allowExternalSource = defaults.allowExternalSource !== false;
    const sourceUrl = allowExternalSource ? config.sourceUrl || defaults.sourceUrl : "";
    const languages = uniqueValues(config.languages || defaults.languages || DEFAULT_SERIES_LANGUAGES);
    const episodeSources = config.episodeSources || {};

    return Array.from({ length: availableEpisodes }, (_item, index) => {
      const episodeNumber = index + 1;
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
        posterUrl: config.posterUrl || defaults.posterUrl,
        languages: [...languages],
        ...directSource
      };
    });
  }

  function buildSeason(config, defaults = {}) {
    const availableEpisodes = Number(config.availableEpisodes ?? config.episodes ?? config.totalEpisodes) || 0;
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

        return [
          episode.episodeNumber,
          {
            sources: {
              [language]: {
                language,
                ...source
              }
            }
          }
        ];
      })
    );
  }

  const RICK_AND_MORTY_SEASONS = [
    {
      number: 1,
      episodes: 11,
      sourceUrl: "",
      posterUrl: "https://image.tmdb.org/t/p/w400/3MYxbw5FNgowfIJ6K0WCW49hjSo.jpg",
      description:
        "Rick et Morty rencontrent un prêteur sur gages dans l'espace, vivent dans des univers parallèles et se retrouvent nez à nez avec le diable."
    },
    {
      number: 2,
      episodes: 10,
      sourceUrl: "",
      posterUrl: "https://image.tmdb.org/t/p/w400/pZSkjWs5m9ew5OmpoFUvsnnEfKj.jpg",
      description:
        "Rick et Morty remettent le temps en marche, mais doivent survivre dans une autre dimension en ruines qui n'existe peut-être même pas."
    },
    {
      number: 3,
      episodes: 10,
      sourceUrl: "",
      posterUrl: "https://image.tmdb.org/t/p/w400/qAI9rbMSqGUqxsq2DxJE46PWTQA.jpg",
      description:
        "Le duo voyage, se la coule douce, croise des dilemmes familiaux et Rick se transforme en cornichon."
    },
    {
      number: 4,
      episodes: 10,
      sourceUrl: "",
      posterUrl: "https://image.tmdb.org/t/p/w400/92EMKUuiCTS72TxcmHbneUzILRE.jpg",
      description:
        "Rick et Morty repartent dans des aventures interdimensionnelles qui défient le temps, l'espace et la logique familiale."
    },
    {
      number: 5,
      episodes: 10,
      sourceUrl: "",
      posterUrl: "https://image.tmdb.org/t/p/w400/lC5QlHFnB0MAigxnzuCWDTVLXKE.jpg",
      description:
        "Un brillant inventeur et son petit-fils un peu à l'Ouest repartent pour une nouvelle salve d'aventures absurdes."
    },
    {
      number: 6,
      episodes: 10,
      sourceUrl: "",
      posterUrl: "https://image.tmdb.org/t/p/w400/cvhNj9eoRBe5SxjCbQTkh05UP5K.jpg",
      description:
        "Fatigués et dans une mauvaise passe, Rick et Morty tentent de rebondir dans des aventures possiblement liées à des dinosaures."
    },
    {
      number: 7,
      episodes: 10,
      sourceUrl: "",
      posterUrl: "https://image.tmdb.org/t/p/w400/OXy96OFiLDZIz9jT4Byxk1Hk6b.jpg",
      description:
        "Rick et Morty reviennent avec des possibilités infinies, des variantes familiales et toujours plus de chaos."
    },
    {
      number: 8,
      episodes: 10,
      sourceUrl: "",
      posterUrl: "https://image.tmdb.org/t/p/w500/WGRQ8FpjkDTzivQJ43t94bOuY0.jpg",
      description:
        "La huitième saison remet Summer, Jerry, Beth et l'autre Beth au centre d'aventures imprévisibles."
    },
    {
      number: 9,
      episodes: 3,
      totalEpisodes: 10,
      sourceUrl: "",
      posterUrl: "https://image.tmdb.org/t/p/w500/owhkU6KRqdXoUQpjV8uyZGPtX58.jpg",
      description:
        "La saison 9 est référencée avec trois épisodes disponibles sur dix au moment de l'ajout."
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
    }
  ];

  const SUPERNATURAL_SEASONS = [
    {
      number: 1,
      episodes: 22,
      sourceUrl: "",
      posterUrl: "https://image.tmdb.org/t/p/w400/rffL4ayOB0NaY3jcD1L2VsVoh0n.jpg",
      episodeSources: buildProviderEpisodeSources("EN", SUPERNATURAL_EN_EPISODES),
      description:
        "Sam et Dean Winchester parcourent les États-Unis pour traquer les forces du Mal responsables de la mort de leur mère, vingt ans plus tôt."
    },
    {
      number: 2,
      episodes: 22,
      sourceUrl: "",
      posterUrl: "https://image.tmdb.org/t/p/w400/rCyLjdjw0N0EAVYCuiZGyPMeJ0L.jpg",
      description:
        "Les frères Winchester poursuivent Azazel, le démon aux yeux jaunes, pendant que Sam développe d'étranges capacités."
    },
    {
      number: 3,
      episodes: 16,
      sourceUrl: "",
      posterUrl: "https://image.tmdb.org/t/p/w400/wxP0yrQCKO9Ihd4B9hP16C7xTXx.jpg",
      description:
        "Les démons échappés de l'Enfer se multiplient pendant que Sam cherche un moyen de sauver Dean."
    },
    {
      number: 4,
      episodes: 22,
      sourceUrl: "",
      posterUrl: "https://image.tmdb.org/t/p/w400/70M4sb3uoVsEHCRPVnjS7ClYVbk.jpg",
      description:
        "Dean revient de l'Enfer grâce à Castiel, et les Winchester découvrent une guerre plus vaste entre anges et démons."
    },
    {
      number: 5,
      episodes: 22,
      sourceUrl: "",
      posterUrl: "https://image.tmdb.org/t/p/w400/xaOt0r6EvgVkX9vdXDYjIlcFMUs.jpg",
      description:
        "Lucifer est libéré, l'apocalypse commence, et Sam et Dean sont entraînés dans un affrontement décisif."
    },
    {
      number: 6,
      episodes: 22,
      sourceUrl: "",
      posterUrl: "https://image.tmdb.org/t/p/w400/3Tddpn6nUjnfKWTabVMdhfvzuDB.jpg",
      description:
        "Dean tente une vie normale jusqu'au retour inattendu de Sam et d'une nouvelle vague de menaces surnaturelles."
    },
    {
      number: 7,
      episodes: 23,
      sourceUrl: "",
      posterUrl: "https://image.tmdb.org/t/p/w400/bz0Fz4EnfkPH86R6eeGLpMCWuS9.jpg",
      description:
        "Les Léviathans libérés du Purgatoire deviennent l'un des adversaires les plus dangereux des Winchester."
    },
    {
      number: 8,
      episodes: 23,
      sourceUrl: "",
      posterUrl: "https://image.tmdb.org/t/p/w400/gt7Kd8yPzzH7KeBTPVF8zleXyXV.jpg",
      description:
        "Dean revient du Purgatoire pendant que Sam tente de reprendre la chasse et de fermer les portes de l'Enfer."
    },
    {
      number: 9,
      episodes: 23,
      sourceUrl: "",
      posterUrl: "https://image.tmdb.org/t/p/w400/1bZo1MIWooTsFRg8tg0p3XLOaLZ.jpg",
      description:
        "Les anges tombés sur Terre poursuivent Sam, Dean, Castiel et Kevin, tandis que les démons se réorganisent."
    },
    {
      number: 10,
      episodes: 23,
      sourceUrl: "",
      posterUrl: "https://image.tmdb.org/t/p/w400/cvCqErWddIMA4SwB2ywIVSVUKPG.jpg",
      description:
        "La marque de Caïn bouleverse Dean, obligeant Sam à chercher une issue avant que son frère ne se perde."
    },
    {
      number: 11,
      episodes: 23,
      sourceUrl: "",
      posterUrl: "https://image.tmdb.org/t/p/w400/qAAQPjUhbFYgAM0KOsR6GKoVjjW.jpg",
      description:
        "Les Winchester font face aux Ténèbres avec l'aide de Castiel, Crowley, Rowena et d'alliés inattendus."
    },
    {
      number: 12,
      episodes: 23,
      sourceUrl: "",
      posterUrl: "https://image.tmdb.org/t/p/w400/aUjETkalRXPbaEREOcsUdeltlSx.jpg",
      description:
        "Mary Winchester revient, les Hommes de Lettres britanniques s'imposent, et Lucifer reste une menace."
    },
    {
      number: 13,
      episodes: 23,
      sourceUrl: "",
      posterUrl: "https://image.tmdb.org/t/p/w400/nEeJmlQCtxijqJadoDFEYqHJW0i.jpg",
      description:
        "Sam et Dean protègent Jack, un Nephilim puissant qui attire l'attention de nouvelles forces infernales."
    },
    {
      number: 14,
      episodes: 20,
      sourceUrl: "",
      posterUrl: "https://image.tmdb.org/t/p/w400/6i9c50LkZk0K4TOUpKRXjMnLmpI.jpg",
      description:
        "Sam, Castiel et leurs alliés cherchent un moyen de sauver Dean après une possession qui change tout."
    },
    {
      number: 15,
      episodes: 20,
      sourceUrl: "",
      posterUrl: "https://image.tmdb.org/t/p/w400/t0hmC3iSjndoWFEF81q31hrvZW7.jpg",
      description:
        "La dernière chasse des Winchester les confronte à l'origine même de leur destin."
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
      description:
        "Thriller nerveux où une pilule expérimentale décuple les capacités d'un écrivain et l'entraîne dans un jeu de pouvoir dangereux.",
      tags: ["Thriller"]
    },
    {
      provider: "uqload",
      id: "interstella-5555",
      title: "Interstella 5555",
      fileId: "amvnri9r8u54",
      category: "Animé",
      duration: "01:05:35",
      resolution: "512x384",
      language: "En",
      date: "2003",
      posterUrl: "miniatures/posters/interstella-5555.webp",
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
      date: "2006",
      posterUrl: "miniatures/posters/silent-hill.webp",
      description:
        "Horreur brumeuse et oppressante autour d'une mère qui cherche sa fille dans une ville fantôme hantée par des visions cauchemardesques.",
      tags: ["Horreur", "Survie", "Silent Hill"]
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
      date: "2012",
      posterUrl: "miniatures/posters/silent-hill-revelation.webp",
      description:
        "Retour dans l'univers Silent Hill avec une héroïne poursuivie par son passé, des cultes inquiétants et des créatures sorties du brouillard.",
      tags: ["Horreur", "Survie", "Silent Hill"]
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
      description:
        "Comédie noire volontairement excessive, adaptée du jeu culte, avec satire, chaos et humour provocateur en version YouTube intégrée.",
      tags: ["Comédie noire", "Postal"]
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
      description:
        "Retour dans l'univers Silent Hill, exploration psychologique et horreur atmosphérique centrée sur la mémoire, la perte et les manifestations de la ville.",
      tags: ["Horreur"]
    },
    buildSeries({
      id: "rick-et-morty-vf",
      title: "Rick et Morty",
      date: "2013",
      sourceName: "Player",
      allowExternalSource: false,
      posterUrl: "https://image.tmdb.org/t/p/w500/qo07tk7mF3c63G7MktMVA2GApZt.jpg",
      description:
        "Com\u00e9die de science-fiction anim\u00e9e centr\u00e9e sur les aventures interdimensionnelles de Rick Sanchez et Morty Smith, pr\u00eate pour des players par saison et \u00e9pisode.",
      tags: ["Animation adulte", "Science-fiction", "Com\u00e9die"],
      languages: [],
      seasons: RICK_AND_MORTY_SEASONS
    }),
    buildSeries({
      id: "supernatural",
      title: "Supernatural",
      date: "2005",
      sourceName: "Dailymotion",
      allowExternalSource: false,
      posterUrl: "https://image.tmdb.org/t/p/w400/rffL4ayOB0NaY3jcD1L2VsVoh0n.jpg",
      description:
        "Sam et Dean Winchester sillonnent les \u00c9tats-Unis pour enqu\u00eater sur des ph\u00e9nom\u00e8nes paranormaux et affronter des cr\u00e9atures surnaturelles.",
      tags: ["Fantastique", "Horreur", "Surnaturel"],
      languages: ["EN"],
      seasons: SUPERNATURAL_SEASONS
    }),
    {
      provider: "externalPage",
      id: "coraline",
      title: "Coraline",
      category: "Film",
      duration: "1h40",
      resolution: "HD",
      language: "VF",
      date: "2009",
      sourceName: "Player",
      sourceUrl: "",
      posterUrl: "https://image.tmdb.org/t/p/w400/4jeFXQYytChdZYE9JYO7Un87IlW.jpg",
      description:
        "Coraline découvre une porte condamnée menant à un monde parallèle plus coloré, plus attentif, puis beaucoup plus inquiétant.",
      tags: ["Animation", "Fantastique", "Famille"]
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
      description:
        "Un jeune cinéaste bascule dans une autre dimension vide et labyrinthique, qui semble abriter des êtres d'un autre monde.",
      tags: ["Horreur", "Mystère", "Science-Fiction"]
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
      description:
        "Et si vous pouviez réaliser votre rêve le plus fou ? Un jeune introverti met la main sur un objet magique capable d’exaucer n’importe quel souhait. Son crush de toujours tombe alors raide dingue de lui… jusqu’à l’obsession la plus totale. Faites attention à ce que vous souhaitez !",
      tags: ["Horreur"]
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
      description:
        "Four unlikely friends face everyday challenges until a mysterious portal transports them to the Overworld, a whimsical, blocky realm fueled by creativity. To return home, they must navigate this fantastical landscape, tackling unique obstacles along the way. With the help of the skilled crafter, Steve, the group embarks on an enchanting adventure that tests their ingenuity and teamwork. As they explore this vibrant world, they learn to embrace their differences and discover the power of friendship in overcoming adversity.",
      tags: ["Famille", "Aventure", "Comédie"]
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
      ...buildSource(item),
      tags: Object.freeze([...(item.tags || [])])
    };

    return Object.freeze(video);
  }

  const videos = catalogue.map(buildVideo);
  window.BOILED_VIDEOS = Object.freeze(videos);
  window.BOILED_EPISODES = Object.freeze(SUPERNATURAL_EN_EPISODES.map(buildStandaloneEpisode));
})();
