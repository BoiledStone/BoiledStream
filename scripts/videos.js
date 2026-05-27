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
    language: "En",
    date: "2026",
    sourceName: "Uqload",
    sourceUrl: "https://uqload.is/9fyok6ttwrgj.html",
    // Utiliser l'URL d'intégration quand l'hébergeur fournit un player iframe.
    embedUrl: "https://uqload.is/embed-9fyok6ttwrgj.html",
    posterUrl: "miniatures/posters/project-hail-mary.webp",
    description:
      "Science-fiction spatiale tendue autour d’une mission de survie, d’un vaisseau isolé et d’un mystère capable de décider du sort de la Terre.",
    tags: ["Science-fiction", "Espace"]
  },
  {
    id: "limitless",
    title: "Limitless",
    category: "Film",
    duration: "01:38:39",
    resolution: "1280x720",
    language: "Fr",
    date: "2011",
    sourceName: "Uqload",
    sourceUrl: "https://uqload.is/8ipcxujsg26z.html",
    embedUrl: "https://uqload.is/embed-8ipcxujsg26z.html",
    posterUrl: "miniatures/posters/limitless.webp",
    description:
      "Thriller nerveux où une pilule expérimentale décuple les capacités d’un écrivain et l’entraîne dans un jeu de pouvoir dangereux.",
    tags: ["Thriller"]
  },
  {
    id: "interstella-5555",
    title: "Interstella 5555",
    category: "Animé",
    duration: "01:05:35",
    resolution: "512x384",
    language: "En",
    date: "2003",
    sourceName: "Uqload",
    sourceUrl: "https://uqload.is/amvnri9r8u54.html",
    embedUrl: "https://uqload.is/embed-amvnri9r8u54.html",
    posterUrl: "miniatures/posters/interstella-5555.webp",
    description:
      "Odyssée animée et musicale portée par Daft Punk, entre enlèvement interstellaire, pop cosmique et aventure sans dialogue.",
    tags: ["Animé", "Musique"]
  },
  {
    id: "silent-hill",
    title: "Silent Hill",
    category: "Film",
    duration: "02:05:21",
    resolution: "1126x504",
    language: "Fr",
    date: "2006",
    sourceName: "Uqload",
    sourceUrl: "https://uqload.is/h67yff6g8a5g.html",
    embedUrl: "https://uqload.is/embed-h67yff6g8a5g.html",
    posterUrl: "miniatures/posters/silent-hill.webp",
    description:
      "Horreur brumeuse et oppressante autour d’une mère qui cherche sa fille dans une ville fantôme hantée par des visions cauchemardesques.",
    tags: ["Horreur", "Survie", "Silent Hill"]
  },
  {
    id: "silent-hill-revelation",
    title: "Silent Hill Revelation",
    category: "Film",
    duration: "01:34:47",
    resolution: "872x384",
    language: "Fr",
    date: "2012",
    sourceName: "Uqload",
    sourceUrl: "https://uqload.is/av5hef1rja8r.html",
    embedUrl: "https://uqload.is/embed-av5hef1rja8r.html",
    posterUrl: "miniatures/posters/silent-hill-revelation.webp",
    description:
      "Retour dans l’univers Silent Hill avec une héroïne poursuivie par son passé, des cultes inquiétants et des créatures sorties du brouillard.",
    tags: ["Horreur", "Survie", "Silent Hill"]
  },
  {
    id: "postal-2007",
    title: "Postal",
    category: "Film",
    duration: "01:57:26",
    resolution: "1920x1080",
    language: "En",
    date: "2007",
    sourceName: "YouTube",
    sourceUrl: "https://www.youtube.com/watch?v=dBFLgBlm5_E",
    embedUrl: "https://www.youtube.com/embed/dBFLgBlm5_E?si=9hP3mPYvpBnZQB28",
    posterUrl: "miniatures/posters/postal-2007.webp",
    description:
      "Comédie noire volontairement excessive, adaptée du jeu culte, avec satire, chaos et humour provocateur en version YouTube intégrée.",
    tags: ["Comédie noire", "YouTube", "Postal"]
  },
  {
    id: "blade-runner-2049",
    title: "Blade Runner 2049",
    category: "Film",
    duration: "02:43:27",
    resolution: "864x360",
    language: "Fr",
    date: "2017",
    sourceName: "Uqload",
    sourceUrl: "https://uqload.is/q2m84hf41l6c.html",
    embedUrl: "https://uqload.is/embed-q2m84hf41l6c.html",
    posterUrl: "https://image.tmdb.org/t/p/w400/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
    description: "En 2049, la société est fragilisée par les nombreuses tensions entre les humains et leurs esclaves créés par bioingénierie. L’officier K est un Blade Runner : il fait partie d’une force d’intervention d’élite chargée de trouver et d’éliminer ceux qui n’obéissent pas aux ordres des humains. Lorsqu’il découvre un secret enfoui depuis longtemps et capable de changer le monde, les plus hautes instances décident que c’est à son tour d’être traqué et éliminé.",
    tags: ["Film", "Science-fiction", "Français", "864x360", "2017"]
  },
  {
    id: "blade-runner",
    title: "Blade Runner",
    category: "Film",
    duration: "01:51:48",
    resolution: "480x272",
    language: "Fr",
    date: "1982",
    sourceName: "Uqload",
    sourceUrl: "https://uqload.is/7huxxpyzzxwa.html",
    embedUrl: "https://uqload.is/embed-7huxxpyzzxwa.html",
    posterUrl: "https://image.tmdb.org/t/p/w400/tDR1V8PbwSGrvi9D7eZneku7Rj.jpg",
    description: "2019, Los Angeles. La Terre est surpeuplée et l’humanité est partie coloniser l’espace. Les nouveaux colons sont assistés de Replicants, androïdes que rien ne peut distinguer de l'être humain. Conçus comme de nouveaux esclaves, certains parmi les plus évolués s’affranchissent de leurs chaînes et s’enfuient. Rick Deckard, un ancien Blade Runner, catégorie spéciale de policiers chargés de retirer ces replicants, accepte une nouvelle mission consistant à retrouver quatre de ces individus qui viennent de regagner la Terre après avoir volé une navette spatiale.",
    tags: ["Science-fiction"]
  },
  {
    id: "elephants-dream",
    title: "Elephants Dream",
    category: "Animé",
    duration: "00:09:00",
    resolution: "1920x1080",
    language: "En",
    date: "2006",
    sourceName: "YouTube",
    sourceUrl: "https://www.youtube.com/watch?v=TLkA0RELQ1g",
    embedUrl: "https://www.youtube.com/embed/TLkA0RELQ1g",
    posterUrl: "https://i.ytimg.com/vi/TLkA0RELQ1g/hqdefault.jpg",
    description:
      "Court-métrage expérimental et surréaliste produit par la Blender Foundation, vitrine des capacités de Blender.",
    tags: ["Court-métrage", "Creative Commons", "Science-fiction"]
  },
  {
    id: "big-buck-bunny",
    title: "Big Buck Bunny",
    category: "Animé",
    duration: "00:10:35",
    resolution: "1920x1080",
    language: "En",
    date: "2008",
    sourceName: "YouTube",
    sourceUrl: "https://www.youtube.com/watch?v=4-Ddumty4mk",
    embedUrl: "https://www.youtube.com/embed/4-Ddumty4mk",
    posterUrl: "https://i.ytimg.com/vi/4-Ddumty4mk/hqdefault.jpg",
    description:
      "Comédie animée en open content: un lapin tranquille se rebiffe face à des rongeurs insupportables.",
    tags: ["Court-métrage", "Creative Commons", "Comédie"]
  },
  {
    id: "sintel-open-movie",
    title: "Sintel",
    category: "Animé",
    duration: "00:14:48",
    resolution: "1920x1080",
    language: "En",
    date: "2010",
    sourceName: "YouTube",
    sourceUrl: "https://www.youtube.com/watch?v=eRsGyueVLvQ",
    embedUrl: "https://www.youtube.com/embed/eRsGyueVLvQ",
    posterUrl: "https://i.ytimg.com/vi/eRsGyueVLvQ/hqdefault.jpg",
    description:
      "Fantasy sombre et émouvante en Creative Commons, centrée sur la quête d’une jeune femme et d’un dragon.",
    tags: ["Court-métrage", "Creative Commons", "Fantasy"]
  },
  {
    id: "tears-of-steel",
    title: "Tears of Steel",
    category: "Film",
    duration: "00:12:14",
    resolution: "1920x1080",
    language: "En",
    date: "2012",
    sourceName: "YouTube",
    sourceUrl: "https://www.youtube.com/watch?v=41hv2tW5Lc4",
    embedUrl: "https://www.youtube.com/embed/41hv2tW5Lc4",
    posterUrl: "https://i.ytimg.com/vi/41hv2tW5Lc4/hqdefault.jpg",
    description:
      "Open movie VFX mêlant prise de vue réelle et CGI, réalisé pour pousser la chaîne d’effets spéciaux de Blender.",
    tags: ["Court-métrage", "Creative Commons", "Science-fiction"]
  },
  {
    id: "cosmos-laundromat",
    title: "Cosmos Laundromat: First Cycle",
    category: "Animé",
    duration: "00:12:00",
    resolution: "1920x1080",
    language: "En",
    date: "2015",
    sourceName: "YouTube",
    sourceUrl: "https://www.youtube.com/watch?v=Y-rmzh0PI3c",
    embedUrl: "https://www.youtube.com/embed/Y-rmzh0PI3c",
    posterUrl: "https://i.ytimg.com/vi/Y-rmzh0PI3c/hqdefault.jpg",
    description:
      "Conte absurde et mélancolique en Creative Commons: un mouton dépressif se voit proposer une seconde chance.",
    tags: ["Court-métrage", "Creative Commons", "Fantastique"]
  },
  {
    id: "agent-327-operation-barbershop",
    title: "Agent 327: Operation Barbershop",
    category: "Animé",
    duration: "00:03:51",
    resolution: "1920x1080",
    language: "En",
    date: "2017",
    sourceName: "YouTube",
    sourceUrl: "https://www.youtube.com/watch?v=mN0zPOpADL4",
    embedUrl: "https://www.youtube.com/embed/mN0zPOpADL4",
    posterUrl: "https://i.ytimg.com/vi/mN0zPOpADL4/hqdefault.jpg",
    description:
      "Court-métrage d’action/espionnage en Creative Commons: l’agent 327 infiltre un salon de barbier louche.",
    tags: ["Court-métrage", "Creative Commons", "Action"]
  }
];
