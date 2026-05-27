(function () {

  const POSTERS = {
    projectHailMary: "miniatures/posters/project-hail-mary.webp",
    limitless: "miniatures/posters/limitless.webp",
    interstella5555: "miniatures/posters/interstella-5555.webp",
    silentHill: "miniatures/posters/silent-hill.webp",
    silentHillRevelation: "miniatures/posters/silent-hill-revelation.webp",
    postal2007: "miniatures/posters/postal-2007.webp",
    bladeRunner2049: "https://image.tmdb.org/t/p/w400/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
    bladeRunner: "https://image.tmdb.org/t/p/w400/tDR1V8PbwSGrvi9D7eZneku7Rj.jpg"
  };

  function makeVideo(data) {
    return {
      id: data.id,
      title: data.title,
      category: data.category || "Film",
      duration: data.duration,
      resolution: data.resolution,
      language: data.language,
      date: data.date,
      posterUrl: data.posterUrl,
      description: data.description,
      tags: data.tags || [],

      sourceName: data.sourceName,
      sourceUrl: data.sourceUrl,
      embedUrl: data.embedUrl
    };
  }

  function uqload(data) {
    return makeVideo({
      ...data,
      sourceName: "Uqload",
      sourceUrl: `https://uqload.is/${data.fileId}.html`,
      embedUrl: `https://uqload.is/embed-${data.fileId}.html`
    });
  }

  function youtube(data) {
    return makeVideo({
      ...data,
      sourceName: "YouTube",
      sourceUrl: `https://www.youtube.com/watch?v=${data.videoId}`,
      embedUrl: `https://www.youtube.com/embed/${data.videoId}`
    });
  }

  function freeze(video) {
    Object.freeze(video.tags);
    return Object.freeze(video);
  }

  const videos = [

    uqload({
      id: "project-hail-mary",
      title: "Project Hail Mary",
      fileId: "9fyok6ttwrgj",
      duration: "02:36:22",
      resolution: "1280x720",
      language: "En",
      date: "2026",
      posterUrl: POSTERS.projectHailMary,
      description:
        "Mission de survie spatiale autour d’un mystère cosmique.",
      tags: ["Science-fiction", "Espace"]
    }),

    uqload({
      id: "limitless",
      title: "Limitless",
      fileId: "8ipcxujsg26z",
      duration: "01:38:39",
      resolution: "1280x720",
      language: "Fr",
      date: "2011",
      posterUrl: POSTERS.limitless,
      description:
        "Une pilule qui booste le cerveau et détruit la vie d’un écrivain.",
      tags: ["Thriller"]
    }),

    uqload({
      id: "interstella-5555",
      title: "Interstella 5555",
      fileId: "amvnri9r8u54",
      category: "Animé",
      duration: "01:05:35",
      resolution: "512x384",
      language: "En",
      date: "2003",
      posterUrl: POSTERS.interstella5555,
      description:
        "Film musical de Daft Punk sans dialogue.",
      tags: ["Animé", "Musique"]
    }),

    uqload({
      id: "silent-hill",
      title: "Silent Hill",
      fileId: "h67yff6g8a5g",
      duration: "02:05:21",
      resolution: "1126x504",
      language: "Fr",
      date: "2006",
      posterUrl: POSTERS.silentHill,
      description:
        "Une mère dans une ville cauchemardesque.",
      tags: ["Horreur", "Survie"]
    }),

    uqload({
      id: "silent-hill-revelation",
      title: "Silent Hill Revelation",
      fileId: "av5hef1rja8r",
      duration: "01:34:47",
      resolution: "872x384",
      language: "Fr",
      date: "2012",
      posterUrl: POSTERS.silentHillRevelation,
      description:
        "Retour dans Silent Hill et ses cultes.",
      tags: ["Horreur", "Survie"]
    }),

    youtube({
      id: "postal-2007",
      title: "Postal",
      videoId: "dBFLgBlm5_E",
      duration: "01:57:26",
      resolution: "1920x1080",
      language: "En",
      date: "2007",
      posterUrl: POSTERS.postal2007,
      description:
        "Satire violente et absurde.",
      tags: ["Comédie noire"]
    }),

    uqload({
      id: "blade-runner-2049",
      title: "Blade Runner 2049",
      fileId: "q2m84hf41l6c",
      duration: "02:43:27",
      resolution: "864x360",
      language: "Fr",
      date: "2017",
      posterUrl: POSTERS.bladeRunner2049,
      description:
        "Un Blade Runner découvre un secret dangereux.",
      tags: ["Science-fiction"]
    }),
    
    uqload({
      id: "blade-runner",
      title: "Blade Runner",
      fileId: "7huxxpyzzxwa",
      duration: "01:51:48",
      resolution: "480x272",
      language: "Fr",
      date: "1982",
      posterUrl: POSTERS.bladeRunner,
      description:
        "Chasse aux réplicants à Los Angeles.",
      tags: ["Science-fiction"]
    }),

    makeVideo({
      id: "return-to-silent-hill",
      title: "Return to Silent Hill",
      category: "Film",
      duration: "01:45:26",
      resolution: "1080p",
      language: "En",
      date: "2026",
      posterUrl:
        "https://m.media-amazon.com/images/M/MV5BOWVjYjU0ZTAtNGVlNi00NGM1LTgzZjctNTZjMjAyYTc4N2VlXkEyXkFqcGc@._V1_FMjpg_UY2998_.jpg",
      description:
        "Horreur psychologique dans Silent Hill.",
      tags: ["Horreur", "Silent Hill"],
      sourceName: "Vaplayer",
      sourceUrl: "https://vaplayer.ru/embed/movie/680493",
      embedUrl: "https://vaplayer.ru/embed/movie/680493"
    })

  ];

  window.BOILED_VIDEOS = Object.freeze(videos.map(freeze));

})();
