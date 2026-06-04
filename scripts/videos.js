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
    embed(item) {
      return {
        sourceName: item.sourceName || "Player externe",
        sourceUrl: item.sourceUrl || item.embedUrl,
        embedUrl: item.embedUrl
      };
    },
    direct(item) {
      return {
        sourceName: item.sourceName || "Vidéo directe",
        sourceUrl: item.sourceUrl || item.videoUrl,
        videoUrl: item.videoUrl
      };
    }
  };

  /*
    Ajouter un film:
    1. Copier un bloc dans `catalogue`.
    2. Modifier id, title, fileId/videoId, durée, année, affiche et tags.
    3. Garder un id unique, en minuscules, sans espace: "mon-film".
  */
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
      date: "2026",
      sourceName: "Vidzy",
      sourceUrl: "https://vidzy.org/embed-7noyoadpqz9r.html",
      embedUrl: "https://vidzy.org/embed-7noyoadpqz9r.html",
      posterUrl: "https://image.tmdb.org/t/p/w400/h7uO28IWKtIIXhPWKvVdFOaPcSq.jpg",
      description:
        "Dans un futur proche, la Terre a été ravagée par une grande guerre entre les hommes et les puissantes machines qu'ils avaient créées. Sachant l'humanité condamnée, un scientifique crée 9 petites créatures, fragiles et sans défense à partir d'objets divers ramassés dans les décombres. Incapables de s'opposer aux machines, ils ont formé une petite communauté survivant au jour le jour dans les décombres. Mais le dernier né de cette famille, le Numéro 9 a une mission. Il détient en lui la clé de leur survie et devra convaincre ses camarades de quitter leur refuge de fortune pour s'aventurer au coeur du royaume des machines. Ce qu'ils vont découvrir en chemin représente peut-être le dernier espoir de l'Humanité.",
      tags: ["Action", "Aventure", "Animation", "Science-Fiction", "Thriller"]
    }
  ];

  function buildVideo(item) {
    const buildSource = PROVIDERS[item.provider];
    if (!buildSource) {
      throw new Error(`Provider vidéo inconnu: ${item.provider}`);
    }

    const { provider, fileId, videoId, ...details } = item;
    const video = {
      ...details,
      ...buildSource(item),
      tags: Object.freeze([...(item.tags || [])])
    };

    return Object.freeze(video);
  }

  window.BOILED_VIDEOS = Object.freeze(catalogue.map(buildVideo));
})();
