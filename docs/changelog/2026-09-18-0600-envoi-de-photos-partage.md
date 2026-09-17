# 2026-09-18 — Les deux galeries photo partagent leur mécanique d'envoi

**Date** : 2026-09-18 — reste annoncé par le changelog des documents génériques
(« la migration de `BoatPhotoGallery` vers `MediaPhotoGallery` fera une PR à
part »).

## Problème

`boats/show/BoatPhotoGallery.vue` et `media/MediaPhotoGallery.vue` recopiaient
la même mécanique d'envoi, mot pour mot : le formulaire multipart, la lecture
de l'entrée de fichiers, le refus explicite hors-ligne (#621), le vidage des
deux entrées au succès. Onze des douze tests de la première et autant de la
seconde vérifiaient ce même contrat, chacun à travers son DOM.

## Ce qui n'a pas été fait, et pourquoi

La migration annoncée — faire disparaître `BoatPhotoGallery` au profit de
`MediaPhotoGallery` — n'est pas un refactor mais une refonte de l'onglet
« Vue d'ensemble » du bateau : clés i18n `boats.show.mediaUpload.*` contre
`media.photos.*`, légendes des photos affichées d'un côté et ignorées de
l'autre, tuile d'ajout en dernière case de grille, grille à quatre colonnes
contre trois, état vide avec rappel des formats acceptés, et suppression par
`<Form>` d'un côté contre `confirmDelete()` de l'autre. Unifier demanderait
soit de perdre ces comportements, soit d'ajouter six props à un composant
déjà utilisé par sept écrans. Les deux galeries restent donc distinctes.

## Correctif

- **`inertia/composables/use_photo_upload.ts`** (nouveau) : `usePhotoUpload(url)`
  porte le formulaire, les `ref` des deux entrées, `isOnline` et `onFileChange`.
- L'URL est acceptée en `MaybeRefOrGetter` : côté bateau elle dérive d'une prop
  (`/boats/:id/photos`) et ne peut pas être figée à l'appel — elle est relue à
  chaque envoi.
- Les `ref` des entrées sont rendues à l'appelant, car chaque galerie ouvre le
  sélecteur depuis ses propres zones : état vide et tuile d'ajout côté bateau,
  zone de dépôt côté médias.
- Les deux composants perdent 46 lignes de script et gardent leur template
  entier.

## Comportement inchangé

Les specs des deux galeries ne changent pas d'une ligne — 12 et 19 tests,
toujours verts. C'est la garantie : aucun écran ne change d'apparence, de
libellé ni de requête.

## Tests

- `tests/inertia/use_photo_upload.spec.ts` (nouveau, 7 tests) : envoi multipart
  avec `preserveScroll`, fichiers multiples en une requête, URL relue à chaque
  envoi et non figée, entrée vidée sans envoi, refus hors-ligne, remise à zéro
  du formulaire et des deux entrées au succès, succès sans entrée montée.

## Hors périmètre, constaté

Les deux templates gardent en commun les deux entrées cachées et les deux
boutons (≈ 55 lignes proches). Les extraire demanderait que l'enfant expose ses
`ref` au parent, qui déclenche `.click()` depuis ses propres zones — plus
d'indirection que de gain. Les libellés diffèrent de toute façon.
