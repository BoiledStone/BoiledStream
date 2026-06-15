# Guide BoiledStream

Ce fichier sert de guide pratique pour modifier le site sans casser le player.

## Organisation

```text
index.html                         page d'accueil / catalogue
player.html                        page lecteur d'un film
css/styles.css                     style du site
scripts/videos.js                  catalogue des films, fichier principal à modifier
scripts/app-utils.js               fonctions partagées par le catalogue et le player
scripts/catalog.js                 rendu de la page d'accueil
scripts/player.js                  rendu de la page lecteur
scripts/community.js               comptes, notes et commentaires Supabase
scripts/supabase-config.js         configuration publique Supabase
scripts/sqlSupabase/*.sql          scripts SQL à lancer dans Supabase
miniatures/posters/                affiches locales des films
```

Pour ajouter un film, modifier `scripts/videos.js` et ajouter l'image dans `miniatures/posters/` si tu veux une affiche locale.

Les pages `watch/*.html` utilisees par Discord pour afficher le titre et la miniature du bon film ou episode sont generees automatiquement par GitHub Actions apres un push.

## Ajouter Un Film Uqload

1. Ouvrir `scripts/videos.js`.
2. Aller dans le tableau `catalogue`.
3. Copier un bloc existant avec `provider: "uqload"`.
4. Coller le bloc à la fin du tableau, avant le `];`.
5. Modifier les champs du nouveau film.

Exemple:

```js
{
  provider: "uqload",
  id: "mon-film",
  title: "Mon Film",
  fileId: "code-uqload",
  category: "Film",
  duration: "01:42:00",
  resolution: "1280x720",
  language: "Fr",
  date: "2024",
  posterUrl: "miniatures/posters/mon-film.webp",
  description: "Résumé court affiché dans la page player.",
  tags: ["Action", "Science-fiction"]
}
```

Pour Uqload, ne mets pas l'URL complète. Mets seulement le code dans `fileId`.

Exemple:

```text
URL Uqload: https://uqload.is/9fyok6ttwrgj.html
fileId: "9fyok6ttwrgj"
```

Le site construit automatiquement:

```text
sourceUrl: https://uqload.is/9fyok6ttwrgj.html
embedUrl:  https://uqload.is/embed-9fyok6ttwrgj.html
```

Dans `player.html`, les sources Uqload ne sont pas injectées directement dans la
page: `scripts/player.js` affiche d'abord un player intermédiaire BoiledStream,
puis charge l'iframe Uqload dans une sandbox stricte, sans permission de pop-up,
de navigation de page, de referrer ni d'accès aux cookies du site parent. Cela
bloque ce que le navigateur permet de bloquer sans extraire le flux vidéo du
service tiers. Les publicités dessinées directement dans le player Uqload peuvent
encore apparaître, car elles restent dans une iframe cross-origin.

## Ajouter Un Film YouTube

Copier un bloc avec `provider: "youtube"` et mettre seulement l'id YouTube dans `videoId`.

```js
{
  provider: "youtube",
  id: "mon-film-youtube",
  title: "Mon Film YouTube",
  videoId: "ID_YOUTUBE",
  category: "Film",
  duration: "01:42:00",
  resolution: "1920x1080",
  language: "Fr",
  date: "2024",
  posterUrl: "miniatures/posters/mon-film-youtube.webp",
  description: "Résumé court affiché dans la page player.",
  tags: ["Comédie"]
}
```

Exemple:

```text
URL YouTube: https://www.youtube.com/watch?v=dBFLgBlm5_E
videoId: "dBFLgBlm5_E"
```

## Ajouter Une Vidéo Directe

Utiliser `provider: "direct"` seulement pour une vraie URL `.mp4` ou compatible navigateur.

```js
{
  provider: "direct",
  id: "ma-video-directe",
  title: "Ma Vidéo Directe",
  videoUrl: "https://exemple.com/video.mp4",
  sourceName: "Serveur direct",
  category: "Film",
  duration: "01:10:00",
  resolution: "1280x720",
  language: "Fr",
  date: "2024",
  posterUrl: "miniatures/posters/ma-video-directe.webp",
  description: "Résumé court affiché dans la page player.",
  tags: ["Drame"]
}
```

## Ajouter Une Série

Dans `scripts/videos.js`, créer d'abord la liste des épisodes, puis la liste des saisons, et enfin ajouter un appel `buildSeries(...)` dans le tableau `catalogue`. La carte apparaît dans la section séries, puis le player affiche les boutons de saisons, langues et épisodes.

```js
const MA_SERIE_EPISODES = [
  {
    provider: "dailymotion",
    seasonNumber: 1,
    episodeNumber: 1,
    title: "Épisode 1",
    videoId: "ID_DAILYMOTION_1",
    duration: "00:42:00",
    resolution: "1280x720"
  },
  {
    provider: "dailymotion",
    seasonNumber: 1,
    episodeNumber: 2,
    title: "Épisode 2",
    videoId: "ID_DAILYMOTION_2",
    duration: "00:43:00",
    resolution: "1280x720"
  }
];

const MA_SERIE_SEASONS = [
  {
    number: 1,
    episodeNumbers: MA_SERIE_EPISODES.map((episode) => episode.episodeNumber),
    episodeSources: buildProviderEpisodeSources("FR", MA_SERIE_EPISODES),
    languages: ["FR"],
    description: "Résumé court de la saison."
  }
];

buildSeries({
  id: "ma-serie",
  title: "Ma Série",
  date: "2024",
  sourceName: "Dailymotion",
  allowExternalSource: false,
  posterUrl: "miniatures/posters/ma-serie.webp",
  description: "Résumé court de la série.",
  tags: ["Action"],
  languages: ["FR"],
  seasons: MA_SERIE_SEASONS
})
```

Pour Dailymotion, utilise `provider: "dailymotion"` et mets seulement l'id dans `videoId`.

```js
{
  provider: "dailymotion",
  seasonNumber: 1,
  episodeNumber: 1,
  title: "Épisode 1",
  videoId: "ID_DAILYMOTION",
  duration: "00:42:00",
  resolution: "1280x720"
}
```

Exemple:

```text
URL Dailymotion: https://www.dailymotion.com/video/x8abcde
videoId: "x8abcde"
```

Les épisodes peuvent aussi utiliser `provider: "youtube"`, `provider: "uqload"`, `provider: "embed"` ou `provider: "direct"`, comme les films. Le bouton `Épisode suivant` apparaît automatiquement dans le lecteur quand il existe un épisode suivant.

## Règles Des Champs

- `id`: unique, en minuscules, sans espace, par exemple `silent-hill`.
- `title`: titre affiché sur la carte et dans le player.
- `category`: généralement `Film` ou `Animé`.
- `duration`: format `HH:MM:SS`.
- `resolution`: exemple `1280x720`.
- `language`: `Fr`, `En`, `VOSTFR` ou `Multi`.
- `date`: année de sortie.
- `posterUrl`: image verticale de préférence en 2:3.
- `description`: courte, 1 ou 2 phrases.
- `tags`: genres utiles à la recherche. Éviter `Film`, `Français`, la résolution et l'année.

## Affiches

Pour une affiche locale:

1. Mettre l'image dans `miniatures/posters/`.
2. Nommer le fichier sans espace ni accent, par exemple `mon-film.webp`.
3. Utiliser ce chemin dans `posterUrl`: `miniatures/posters/mon-film.webp`.

Formats recommandés: `.webp` ou `.jpg`, vertical 2:3, environ `640x960`.

## Vérifier Après Ajout

1. Ouvrir `index.html` et vérifier que la carte apparaît.
2. Chercher le titre dans la barre de recherche.
3. Cliquer sur la carte.
4. Vérifier que `player.html?video=id-du-film` affiche le bon titre, l'année, la durée, la qualité et les tags.
5. Si la vignette ne charge pas, vérifier le chemin `posterUrl`.

Commande rapide de validation:

```powershell
node -e "global.window={}; require('vm').runInThisContext(require('fs').readFileSync('scripts/videos.js','utf8')); console.log(window.BOILED_VIDEOS.length)"
```

## Supabase

Supabase est optionnel pour le catalogue, mais nécessaire pour les comptes, notes et commentaires.

Les fichiers SQL sont dans `scripts/sqlSupabase/`:

```text
scripts/sqlSupabase/supabase-schema.sql
scripts/sqlSupabase/supabase-avatar-storage.sql
scripts/sqlSupabase/supabase-admin-users.sql
```

Ordre conseillé:

1. Exécuter `scripts/sqlSupabase/supabase-schema.sql` dans Supabase SQL Editor.
2. Si les avatars affichent `Bucket not found`, exécuter `scripts/sqlSupabase/supabase-avatar-storage.sql`.
3. Pour activer les badges `[admin]`, modifier les emails dans `scripts/sqlSupabase/supabase-admin-users.sql`, puis exécuter le fichier.

La clé dans `scripts/supabase-config.js` doit rester une clé publique `anon`. Ne jamais mettre une clé `service_role` dans le site.

## Publication

Après modification:

```powershell
git status --short
git add .
git commit -m "Update catalog"
git push origin main
git push origin main:gh-pages
```

Si GitHub Pages affiche encore une ancienne version, attendre quelques minutes ou ouvrir le site avec un paramètre de cache, par exemple `?v=nouveau-commit`.
