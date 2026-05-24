// Catalogue central du site: chaque film ajouté ici apparaît automatiquement
// dans la page d'accueil, les filtres, la recherche et la page player.
window.BOILED_VIDEOS = [
  {
    // L'id doit rester unique et stable, car il est utilisé dans l'URL player.html?video=...
    id: "project-hail-mary",
    title: "Project Hail Mary",
    category: "Film",
    duration: "02:36:22",
    resolution: "1280x720",
    format: "HEVC",
    sourceName: "Uqload",
    sourceUrl: "https://uqload.is/9fyok6ttwrgj.html",
    // Utiliser l'URL d'intégration quand l'hébergeur fournit un player iframe.
    embedUrl: "https://uqload.is/embed-9fyok6ttwrgj.html",
    posterUrl: "https://e12.uqload.is/i/01/05208/9fyok6ttwrgj_t.jpg",
    description:
      "Vidéo hébergée à l’extérieur et ouverte dans une page player interne au site.",
    tags: ["Film", "HEVC", "1280x720"]
  },
  {
    id: "limitless",
    title: "Limitless",
    category: "Film",
    duration: "01:38:39",
    resolution: "1280x720",
    format: "FR",
    sourceName: "Uqload",
    sourceUrl: "https://uqload.is/8ipcxujsg26z.html",
    embedUrl: "https://uqload.is/embed-8ipcxujsg26z.html",
    posterUrl: "https://strm7.uqload.is/i/02/05208/8ipcxujsg26z_t.jpg",
    description:
      "Vidéo hébergée à l’extérieur et ouverte dans une page player interne au site.",
    tags: ["Film", "Français", "1280x720"]
  },
  {
    id: "interstella-5555",
    title: "Interstella 5555",
    category: "Film",
    duration: "01:05:35",
    resolution: "512x384",
    format: "SD",
    sourceName: "Uqload",
    sourceUrl: "https://uqload.is/amvnri9r8u54.html",
    embedUrl: "https://uqload.is/embed-amvnri9r8u54.html",
    posterUrl: "https://e12.uqload.is/i/01/05208/amvnri9r8u54_t.jpg",
    description:
      "Vidéo hébergée à l’extérieur et ouverte dans une page player interne au site.",
    tags: ["Film", "Animation", "512x384"]
  },
  {
    id: "silent-hill",
    title: "Silent Hill",
    category: "Film",
    duration: "02:05:21",
    resolution: "1126x504",
    format: "HD",
    sourceName: "Uqload",
    sourceUrl: "https://uqload.is/h67yff6g8a5g.html",
    embedUrl: "https://uqload.is/embed-h67yff6g8a5g.html",
    posterUrl: "https://e11.uqload.is/i/01/05208/h67yff6g8a5g_t.jpg",
    description:
      "Vidéo hébergée à l’extérieur et ouverte dans une page player interne au site.",
    tags: ["Film", "Horreur", "Silent Hill", "1126x504"]
  },
  {
    id: "silent-hill-revelation",
    title: "Silent Hill Revelation",
    category: "Film",
    duration: "01:34:47",
    resolution: "872x384",
    format: "SD",
    sourceName: "Uqload",
    sourceUrl: "https://uqload.is/av5hef1rja8r.html",
    embedUrl: "https://uqload.is/embed-av5hef1rja8r.html",
    posterUrl: "https://e12.uqload.is/i/01/05208/av5hef1rja8r_t.jpg",
    description:
      "Vidéo hébergée à l’extérieur et ouverte dans une page player interne au site.",
    tags: ["Film", "Horreur", "Silent Hill", "872x384"]
  },
  {
    id: "postal-2007",
    title: "Postal",
    category: "Film",
    duration: "01:57:26",
    resolution: "1920x1080",
    format: "YouTube",
    sourceName: "YouTube",
    sourceUrl: "https://www.youtube.com/watch?v=dBFLgBlm5_E",
    embedUrl: "https://www.youtube.com/embed/dBFLgBlm5_E?si=9hP3mPYvpBnZQB28",
    posterUrl: "https://i.ytimg.com/vi/dBFLgBlm5_E/hqdefault.jpg",
    description:
      "Vidéo YouTube intégrée dans une page player interne au site.",
    tags: ["Film", "YouTube", "Postal", "1080p"]
  }
];
