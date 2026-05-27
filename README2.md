# Ajouter un film sur BoiledStream

Le catalogue du site est centralisé dans `scripts/videos.js`. Ajouter une entrée dans le tableau `videos` suffit pour que le film apparaisse sur la page d'accueil, dans la recherche, dans les filtres, dans le player et dans la communauté.

## Étapes

1. Ouvrir `scripts/videos.js`.

2. Copier une entrée existante `uqload({ ... })` ou `youtube({ ... })`, puis la coller dans le tableau `videos`.

3. Mettre une virgule entre les blocs. Tous les films du tableau doivent être séparés par une virgule.

4. Remplir les champs du nouveau film. Pour Uqload, utiliser seulement l'id du fichier dans `fileId`: le site construit `sourceUrl` et `embedUrl` automatiquement.

```js
uqload({
  id: "mon-film",
  title: "Mon Film",
  fileId: "code-uqload",
  duration: "01:42:00",
  resolution: "1280x720",
  language: "Fr",
  date: "2024",
  posterUrl: "https://exemple.com/image-du-film.jpg",
  description: "Courte description affichée sur la page player.",
  tags: ["Action", "Science-fiction"]
})
```

Pour YouTube, utiliser `videoId`:

```js
youtube({
  id: "mon-film-youtube",
  title: "Mon Film YouTube",
  videoId: "ID_YOUTUBE",
  duration: "01:42:00",
  resolution: "1920x1080",
  language: "Fr",
  date: "2024",
  posterUrl: "miniatures/posters/mon-film.webp",
  description: "Courte description affichée sur la page player.",
  tags: ["Comédie"]
})
```

5. Vérifier que `id` est unique. Il doit être court, sans espace, et stable, par exemple `interstella-5555` ou `project-hail-mary`.

6. Vérifier les URLs:

- `fileId` doit être le morceau entre `https://uqload.is/` et `.html`.
- `videoId` doit être l'id YouTube, pas l'URL complète.
- `posterUrl` est l'image de vignette. Si elle ne charge pas, le site affiche automatiquement un fond de secours.
- Les tags doivent décrire le film. Éviter les tags redondants comme `Film`, `Français`, `1280x720` ou l'année: ces infos ont déjà leurs champs dédiés.

7. Pour une vidéo hébergée directement en `.mp4`, ajouter un objet complet avec `videoUrl` au lieu d'utiliser `uqload()` ou `youtube()`:

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

3. Pour une image prête à être affichée directement sur les cartes, utiliser de préférence le sous-dossier `miniatures/posters`.

4. Dans `scripts/videos.js`, remplacer `posterUrl` par le chemin local:

```js
posterUrl: "miniatures/posters/silent-hill.webp",
```

5. Garder le chemin relatif depuis la racine du site. Ne pas commencer par `/`, sinon GitHub Pages peut chercher l'image au mauvais endroit.

6. Préférer une affiche verticale en 2:3, idéalement autour de `640x960` ou plus. Évite les captures 16:9 avec bandes floues: elles donnent des cartes irrégulières et moins propres. Le format `.webp` est recommandé pour les cartes, car il garde une bonne qualité avec un poids plus bas.

7. Recharger `index.html` et vérifier que la carte du film affiche bien la nouvelle miniature.

## Points à contrôler avant publication

- Le titre est lisible et sans faute.
- La durée correspond au film.
- La catégorie est cohérente avec les autres films.
- Les tags aident vraiment la recherche.
- La source externe fonctionne encore.
- Le player s'ouvre dans `player.html?video=id-du-film`.

## Activer comptes, profils, commentaires et notes

Le site utilise Supabase pour les comptes utilisateurs, les profils avec photo, les commentaires et les notes. GitHub Pages reste le site statique; Supabase fournit l'authentification, la base de données et le stockage des avatars.

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

## Mots de passe plus forts

Le formulaire du site bloque déjà les nouvelles inscriptions faibles: 12 caractères minimum, une minuscule, une majuscule, un chiffre et un symbole.

Pour appliquer la même règle côté serveur Supabase:

1. Aller dans `Authentication` > `Security` ou `Auth settings` > `Password protection`.

2. Mettre la longueur minimale à `12`.

3. Activer les caractères requis: lowercase, uppercase, digits et symbols.

4. Si ton plan Supabase le permet, activer aussi la protection contre les mots de passe déjà leakés.

Les anciens comptes peuvent encore se connecter avec leur ancien mot de passe. La règle forte s'applique surtout aux nouvelles inscriptions et aux prochains changements de mot de passe.

Référence Supabase: https://supabase.com/docs/guides/auth/password-security

## Emails d'authentification BoiledStream

Pour que les emails d'inscription ne ressemblent plus à des emails Supabase, il faut configurer les templates et l'expéditeur dans Supabase. Le code du site envoie déjà `app_name: "BoiledStream"` dans les métadonnées d'inscription, mais Supabase contrôle l'email final.

1. Aller dans `Authentication` > `Emails` > `Templates`.

2. Ouvrir le template `Confirm signup`.

3. Mettre un sujet comme:

```text
Confirme ton compte BoiledStream
```

4. Mettre un contenu HTML simple:

```html
<h2>BoiledStream</h2>
<p>Bienvenue sur BoiledStream. Confirme ton email pour activer ton compte.</p>
<p><a href="{{ .ConfirmationURL }}">Confirmer mon email</a></p>
<p>Si tu n'as pas demandé ce compte, ignore ce message.</p>
```

5. Répéter le même style pour `Reset password`, `Magic link` et `Change email address` si ces emails sont activés.

6. Aller dans `Authentication` > `SMTP Settings`.

7. Configurer un vrai service SMTP avec:

```text
Sender name: BoiledStream
Sender email: no-reply@ton-domaine.com
```

Sans SMTP personnalisé, Supabase peut garder un expéditeur ou des limites liées à Supabase. Pour un rendu propre, utilise un domaine à toi et configure SPF, DKIM et DMARC chez ton fournisseur d'email.

Références Supabase:

- https://supabase.com/docs/guides/auth/auth-email-templates
- https://supabase.com/docs/guides/auth/auth-smtp

5. Aller dans `SQL Editor` > `New query`.

6. Copier tout le contenu de `supabase-schema.sql`, le coller dans Supabase, puis cliquer `Run`. Si le projet Supabase était déjà configuré avant l'ajout des photos de profil, refaire quand même cette étape pour ajouter `avatar_url`, le bucket `avatars`, ses règles d'accès et le trigger qui crée automatiquement une ligne `profiles` à chaque nouveau compte. Le script termine par `notify pgrst, 'reload schema';` pour forcer Supabase à rafraîchir son cache API.

7. Vérifier que les tables suivantes existent dans `Table Editor`:

```text
profiles
admin_users
comments
ratings
```

8. Vérifier dans `Storage` > `Buckets` que le bucket public `avatars` existe. Le script SQL le crée automatiquement et limite les photos de profil à 2 Mo (`jpg`, `png`, `webp` ou `gif`). Les fichiers doivent être stockés dans un dossier nommé avec l'id utilisateur, ce que le site fait automatiquement. Si le site affiche `Bucket not found` ou `new row violates row-level security policy`, exécuter `supabase-avatar-storage.sql` dans Supabase: le résultat final doit afficher une ligne avec `id = avatars`. Si aucune ligne n'apparaît, le SQL n'a pas été lancé dans le même projet Supabase que celui utilisé par `scripts/supabase-config.js`.

9. Pour afficher `[admin]` devant ton pseudo et celui de ton ami, ouvrir `supabase-admin-users.sql`, remplacer les deux emails d'exemple, puis exécuter le fichier dans Supabase. Ce fichier crée aussi `admin_users` si la table n'existe pas encore. Les utilisateurs normaux ne peuvent pas créer ce badge eux-mêmes.

10. Recharger une page `player.html?video=...`: la section `Avis et commentaires` doit permettre la connexion, l'inscription avec pseudo, la note sur 5 étoiles, les commentaires et la modification du pseudo/photo dans le menu du compte.

Important: la clé dans `scripts/supabase-config.js` est la clé publique `anon`. Ne jamais mettre la clé `service_role` dans le site.
