// Catalogue central: chaque entrée publiée ici apparaît automatiquement
// dans l'accueil, la recherche, les filtres, le player et la communauté.
(function () {
  const POSTERS = {
    projectHailMary: "miniatures/posters/project-hail-mary.webp",
    limitless: "miniatures/posters/limitless.webp",
    interstella5555: "miniatures/posters/interstella-5555.webp",
    silentHill: "miniatures/posters/silent-hill.webp",
    silentHillRevelation: "miniatures/posters/silent-hill-revelation.webp",
    postal2007: "miniatures/posters/postal-2007.webp",
    bladeRunner2049: "https://image.tmdb.org/t/p/w400/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
    bladeRunner: "https://image.tmdb.org/t/p/w400/tDR1V8PbwSGrvi9D7eZneku7Rj.jpg",
    returnToSilentHill: "https://m.media-amazon.com/images/M/MV5BOWVjYjU0ZTAtNGVlNi00NGM1LTgzZjctNTZjMjAyYTc4N2VlXkEyXkFqcGc@._V1_FMjpg_UY2998_.jpg"
  };

  function uqload({
    id,
    title,
    fileId,
    category = "Film",
    duration,
    resolution,
    language,
    date,
    posterUrl,
    description,
    tags = []
  }) {
    return {
      id,
      title,
      category,
      duration,
      resolution,
      language,
      date,
      sourceName: "Uqload",
      sourceUrl: `https://uqload.is/${fileId}.html`,
      embedUrl: `https://uqload.is/embed-${fileId}.html`,
      posterUrl,
      description,
      tags
    };
  }

  function youtube({
    id,
    title,
    videoId,
    category = "Film",
    duration,
    resolution,
    language,
    date,
    posterUrl,
    description,
    tags = []
  }) {
    return {
      id,
      title,
      category,
      duration,
      resolution,
      language,
      date,
      sourceName: "YouTube",
      sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      posterUrl,
      description,
      tags
    };
  }

  function freezeVideo(video) {
    if (Array.isArray(video.tags)) {
      Object.freeze(video.tags);
    }
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
        "Science-fiction spatiale tendue autour d'une mission de survie, d'un vaisseau isolé et d'un mystère capable de décider du sort de la Terre.",
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
        "Thriller nerveux où une pilule expérimentale décuple les capacités d'un écrivain et l'entraîne dans un jeu de pouvoir dangereux.",
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
        "Odyssée animée et musicale portée par Daft Punk, entre enlèvement interstellaire, pop cosmique et aventure sans dialogue.",
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
        "Horreur brumeuse et oppressante autour d'une mère qui cherche sa fille dans une ville fantôme hantée par des visions cauchemardesques.",
      tags: ["Horreur", "Survie", "Silent Hill"]
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
        "Retour dans l'univers Silent Hill avec une héroïne poursuivie par son passé, des cultes inquiétants et des créatures sorties du brouillard.",
      tags: ["Horreur", "Survie", "Silent Hill"]
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
        "Comédie noire volontairement excessive, adaptée du jeu culte, avec satire, chaos et humour provocateur en version YouTube intégrée.",
      tags: ["Comédie noire", "Postal"]
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
        "En 2049, la société est fragilisée par les tensions entre humains et réplicants. L'officier K découvre un secret capable de changer le monde.",
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
        "Los Angeles, 2019. Rick Deckard traque des réplicants en fuite dans une société déshumanisée.",
      tags: ["Science-fiction"]
    }),

    
    {
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
      posterUrl: POSTERS.returnToSilentHill,
      description:
        "Retour dans l’univers Silent Hill, exploration psychologique et horreur atmosphérique centrée sur la mémoire, la perte et les manifestations de la ville.",
      tags: ["Horreur", "Silent Hill"]
    }
  ];

  window.BOILED_VIDEOS = Object.freeze(videos.map(freezeVideo));
})();
