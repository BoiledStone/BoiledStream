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
    posterUrl: "miniatures/posters/project-hail-mary.webp",
    description:
      "Science-fiction spatiale tendue autour d’une mission de survie, d’un vaisseau isolé et d’un mystère capable de décider du sort de la Terre.",
    tags: ["Film", "Science-fiction", "Espace", "HEVC", "1280x720"]
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
    posterUrl: "miniatures/posters/limitless.webp",
    description:
      "Thriller nerveux où une pilule expérimentale décuple les capacités d’un écrivain et l’entraîne dans un jeu de pouvoir dangereux.",
    tags: ["Film", "Thriller", "Français", "1280x720"]
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
    posterUrl: "miniatures/posters/interstella-5555.webp",
    description:
      "Odyssée animée et musicale portée par Daft Punk, entre enlèvement interstellaire, pop cosmique et aventure sans dialogue.",
    tags: ["Film", "Animé", "Musique", "512x384"]
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
    posterUrl: "miniatures/posters/silent-hill.webp",
    description:
      "Horreur brumeuse et oppressante autour d’une mère qui cherche sa fille dans une ville fantôme hantée par des visions cauchemardesques.",
    tags: ["Film", "Horreur", "Survie", "Silent Hill", "1126x504"]
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
    posterUrl: "miniatures/posters/silent-hill-revelation.webp",
    description:
      "Retour dans l’univers Silent Hill avec une héroïne poursuivie par son passé, des cultes inquiétants et des créatures sorties du brouillard.",
    tags: ["Film", "Horreur", "Survie", "Silent Hill", "872x384"]
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
    posterUrl: "miniatures/posters/postal-2007.webp",
    description:
      "Comédie noire volontairement excessive, adaptée du jeu culte, avec satire, chaos et humour provocateur en version YouTube intégrée.",
    tags: ["Film", "Comédie noire", "YouTube", "Postal", "1080p"]
  },
  {
    id: "blade-runner-2049",
    title: "Blade Runner 2049",
    category: "Film",
    duration: "02:43:27",
    resolution: "864x360",
    format: "FR",
    sourceName: "Uqload",
    sourceUrl: "https://uqload.is/q2m84hf41l6c.html",
    embedUrl: "https://uqload.is/embed-q2m84hf41l6c.html",
    posterUrl: "miniatures/posters/blade-runner-2049.jpg",
    description: "Blade Runner 2049 is a sequel to the classic Blade Runner, set in a dystopian future where blade runners hunt down replicants.",
    tags: ["Film", "Science-fiction", "Fran�ais", "864x360", "2017"]
  },
  {
    id: "blade-runner",
    title: "Blade Runner",
    category: "Film",
    duration: "01:51:48",
    resolution: "480x272",
    format: "FR",
    sourceName: "Uqload",
    sourceUrl: "https://uqload.is/7huxxpyzzxwa.html",
    embedUrl: "https://uqload.is/embed-7huxxpyzzxwa.html",
    posterUrl: "miniatures/posters/blade-runner.jpg",
    description: "Blade Runner is a 1982 science fiction film directed by Ridley Scott, depicting a dystopian Los Angeles in 2019 where synthetic humans known as replicants are hunted by blade runners.",
    tags: ["Film", "Science-fiction", "Fran�ais", "480x272", "1982"]
  }
];
