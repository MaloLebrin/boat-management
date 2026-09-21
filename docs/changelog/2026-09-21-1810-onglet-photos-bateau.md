# Onglet « Photos » sur la fiche bateau

**Date** : 21 septembre 2026
**Issue** : #811

## Contexte

L'onglet Aperçu de la fiche bateau affichait la galerie complète en tête de
page : avec une quinzaine de photos, les retards, KPI, dimensions et
l'activité récente étaient repoussés loin sous la ligne de flottaison.

## Changements

- **Nouvel onglet principal « Photos »** (`?tab=photos`), placé juste après
  Aperçu. Il porte la galerie complète (`BoatPhotoGallery`) : ajout multiple,
  prise de vue caméra, suppression. Pas de badge, pas de données différées :
  les photos arrivent avec la prop `boat`.
- **Aperçu** : la galerie est remplacée par `BoatOverviewPhotoStrip`, une
  seule rangée de 4 vignettes maximum (ordre `position`) et un lien
  « Voir les N photos → ». Vignettes et lien ouvrent l'onglet Photos. Sans
  photo, une tuile « Ajouter des photos » est proposée aux gestionnaires ;
  rien n'est affiché en lecture seule.
- Helper partagé `inertia/utils/boat_photos.ts` (`sortedBoatPhotos`).

## Redirections

- `POST /boats/:boatId/photos` → `/boats/:id?tab=photos` (au lieu de
  `?tab=overview`).
- `DELETE /boats/:boatId/media/:mediaId` → `?tab=photos` pour une photo,
  `?tab=documents` pour un document (auparavant `/boats/:id`, donc Aperçu).
  `MediaService.deleteForEntity` renvoie désormais le `kind` du média supprimé.

## i18n

`boats.show.tabs.photos` et `boats.show.overview.viewAllPhotos` (en + fr).
