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

3. Dans `scripts/videos.js`, remplacer `posterUrl` par le chemin local:

```js
posterUrl: "miniatures/silent-hill.jpg",
```

4. Garder le chemin relatif depuis la racine du site. Ne pas commencer par `/`, sinon GitHub Pages peut chercher l'image au mauvais endroit.

5. Préférer une image horizontale en 16:9, idéalement autour de `1280x720`. Les formats `.jpg`, `.png` et `.webp` fonctionnent.

6. Recharger `index.html` et vérifier que la carte du film affiche bien la nouvelle miniature.

## Points à contrôler avant publication

- Le titre est lisible et sans faute.
- La durée correspond au film.
- La catégorie est cohérente avec les autres films.
- Les tags aident vraiment la recherche.
- La source externe fonctionne encore.
- Le player s'ouvre dans `player.html?video=id-du-film`.
