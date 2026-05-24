# Ajouter un film sur BoiledStream

Le catalogue du site est centralisé dans `scripts/videos.js`. Ajouter un objet dans ce fichier suffit pour que le film apparaisse sur la page d'accueil, dans la recherche, dans les filtres et dans le player.

## Étapes

1. Ouvrir `scripts/videos.js`.

2. Copier un bloc de film existant, depuis `{` jusqu'à `}`, puis le coller dans le tableau `window.BOILED_VIDEOS`.

3. Mettre une virgule entre les blocs. Tous les films du tableau doivent être séparés par une virgule.

4. Remplir les champs du nouveau film:

```js
{
  id: "mon-film",
  title: "Mon Film",
  category: "Film",
  duration: "01:42:00",
  resolution: "1280x720",
  format: "FR",
  sourceName: "Uqload",
  sourceUrl: "https://uqload.is/page-du-film.html",
  embedUrl: "https://uqload.is/embed-code-du-film.html",
  posterUrl: "https://exemple.com/image-du-film.jpg",
  description: "Courte description affichée sur la page du player.",
  tags: ["Film", "Français", "1280x720"]
}
```

5. Vérifier que `id` est unique. Il doit être court, sans espace, et stable, par exemple `interstella-5555` ou `project-hail-mary`.

6. Vérifier les URLs:

- `sourceUrl` ouvre la page originale chez l'hébergeur.
- `embedUrl` doit être l'URL du player intégrable, souvent au format `https://uqload.is/embed-xxxxx.html`.
- `posterUrl` est l'image de vignette. Si elle ne charge pas, le site affiche automatiquement un fond de secours.
- Pour YouTube, utiliser `sourceUrl: "https://www.youtube.com/watch?v=ID"` et `embedUrl: "https://www.youtube.com/embed/ID"`.

7. Pour une vidéo hébergée directement en `.mp4`, remplacer `embedUrl` par `videoUrl`:

```js
videoUrl: "https://exemple.com/mon-film.mp4",
```

8. Ouvrir `index.html` dans un navigateur et vérifier que la nouvelle vignette apparaît.

9. Cliquer sur la vignette ou ouvrir directement `player.html?video=mon-film` pour vérifier la page de lecture.

10. Tester la recherche avec le titre et un tag pour confirmer que le film est bien indexé.

## Miniatures custom

Le dossier `miniatures` sert à stocker des images plus propres que les previews automatiques des hébergeurs.

1. Ajouter l'image dans `miniatures`.

2. Nommer le fichier simplement, sans espace ni accent, par exemple:

```text
miniatures/silent-hill.jpg
miniatures/silent-hill-revelation.webp
miniatures/postal-2007.jpg
```

3. Pour une image prête à être affichée directement sur les cartes, utiliser de préférence le sous-dossier `miniatures/cards`.

4. Dans `scripts/videos.js`, remplacer `posterUrl` par le chemin local:

```js
posterUrl: "miniatures/cards/silent-hill.webp",
```

5. Garder le chemin relatif depuis la racine du site. Ne pas commencer par `/`, sinon GitHub Pages peut chercher l'image au mauvais endroit.

6. Préférer une image horizontale en 16:9, idéalement autour de `1280x720`. Le format `.webp` est recommandé pour les cartes, car il garde une bonne qualité avec un poids plus bas.

7. Recharger `index.html` et vérifier que la carte du film affiche bien la nouvelle miniature.

## Points à contrôler avant publication

- Le titre est lisible et sans faute.
- La durée correspond au film.
- La catégorie est cohérente avec les autres films.
- Les tags aident vraiment la recherche.
- La source externe fonctionne encore.
- Le player s'ouvre dans `player.html?video=id-du-film`.

## Activer comptes, commentaires et notes

Le site utilise Supabase pour les comptes utilisateurs, les commentaires et les notes. GitHub Pages reste le site statique; Supabase fournit l'authentification et la base de données.

1. Dans Supabase, ouvrir le projet `BoiledStream`.

2. Aller dans `Authentication` > `URL Configuration`.

3. Mettre ces URLs:

```text
Site URL:
https://boiledstone.github.io/BoiledStream/

Redirect URLs:
https://boiledstone.github.io/BoiledStream/
https://boiledstone.github.io/BoiledStream/**
http://127.0.0.1:8765/
http://127.0.0.1:8765/**
```

4. Aller dans `Authentication` > `Providers` > `Email`, puis activer le provider email.

5. Aller dans `SQL Editor` > `New query`.

6. Copier tout le contenu de `supabase-schema.sql`, le coller dans Supabase, puis cliquer `Run`.

7. Vérifier que les tables suivantes existent dans `Table Editor`:

```text
profiles
comments
ratings
```

8. Recharger une page `player.html?video=...`: la section `Avis et commentaires` doit permettre la connexion, la note sur 5 étoiles et les commentaires.

Important: la clé dans `scripts/supabase-config.js` est la clé publique `anon`. Ne jamais mettre la clé `service_role` dans le site.
