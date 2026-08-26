# 2026-08-25 — Bouton « Prendre une photo » sur les galeries photo (#485)

Aucun input photo de l'app ne proposait l'appareil photo : sur un ponton, photographier un défaut demandait de sortir de l'app, photographier, revenir, puis parcourir la galerie.

- **Composants.** `MediaPhotoGallery.vue` (galerie partagée — inspections, six équipements) et `BoatPhotoGallery.vue` (fiche bateau) gagnent un bouton « Prendre une photo » (icône caméra) à côté du bouton « Ajouter ».
- **Second input dédié.** Le bouton déclenche un **second** `<input type="file" accept="image/*" capture="environment">` **sans** `multiple` : ajouter `capture` à l'input existant aurait supprimé la sélection multiple depuis la galerie sur iOS comme Android. L'input d'origine (multi-sélection) est inchangé ; les deux partagent le même handler d'upload et sont réinitialisés après succès.
- **i18n.** `media.photos.takePhoto` et `boats.show.mediaUpload.takePhoto` dans les deux locales (vouvoiement FR sans objet : libellé impératif court).
- **Tests.** 6 cas Vitest ajoutés : présence du second input `capture="environment"` sans `multiple`, `multiple` maintenu sur l'input d'origine, upload depuis l'input caméra, masquage sans permission, clés i18n présentes dans les deux locales.
- **Doc.** Section « Galerie photo partagée » de `docs/frontend/ui-map.md`.
