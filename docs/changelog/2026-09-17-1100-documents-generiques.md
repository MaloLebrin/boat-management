# Documents : modale d'ajout et liste génériques

**Date** : 2026-09-17 — plan de refactorisation TDD, vague 3.1.

## Problème

Quatre modales d'ajout de documents (`BoatDocumentAddModal`,
`ClientDocumentAddModal`, `EngineDocumentAddModal`,
`EnginePartDocumentAddModal`, ~170 lignes chacune) et quatre listes
(`BoatShowTabDocuments`, `EngineShowTabDocuments`,
`EnginePartShowTabDocuments`, `ClientDocuments`) ne différaient que par
l'URL d'envoi, les URL de téléchargement et de suppression, et le préfixe de
clés i18n. Le glisser-déposer, la liste des fichiers sélectionnés, le champ
de légende et `formatBytes` existaient en quatre à neuf exemplaires.

## Changement

- `inertia/components/media/DocumentAddModal.vue` : props `open`,
  `uploadUrl`, `title`, `subtitle`, `labels` (`DocumentModalLabels`),
  `closeLabel?` (`common.close` par défaut), `preserveScroll?`. Le domaine
  traduit ses propres clés et les passe : chaque écran garde son vocabulaire
  (« Légende » pour un bateau, « Libellé » pour un client), aucune chaîne ne
  change.
- `inertia/components/media/DocumentList.vue` : props `documents`,
  `canManage`, `labels` (`DocumentListLabels`), `downloadUrlFor(doc)`,
  `deleteUrlFor(doc)`, `deleteConfirm?` et `dense?`, événement `add`.
  - sans `deleteConfirm` : suppression par formulaire Inertia inline
    (comportement des onglets bateau, moteur, pièce) ;
  - avec `deleteConfirm` : `BaseConfirmModal` puis `router.delete`
    (`preserveScroll`), comportement de la fiche client ;
  - `dense` : variante compacte de la carte client (en-tête en gras, état
    vide sans second bouton).
- Types dans `inertia/types/documents.ts` ; `formatBytes` (o / Ko / Mo)
  dans `inertia/utils/format_bytes.ts`.
- Les quatre listes deviennent des adaptateurs de 50 à 60 lignes (URL,
  libellés, sous-titre) ; les quatre modales sont supprimées. Les huit
  fichiers de documents passent d'environ 1 100 lignes à 558 (six fichiers).

- Hors périmètre : la jauge de stockage de la facturation garde son
  `formatBytes` propre (unités traduites, Go) ; la migration de
  `BoatPhotoGallery` vers `MediaPhotoGallery` (146 lignes de diff) fera une
  PR à part.

## Tests

- `tests/inertia/document_add_modal.spec.ts` (9 tests, port de l'ancienne
  spec bateau + libellés, `preserveScroll`, `closeLabel`, état d'envoi,
  fermeture) ;
- `tests/inertia/document_list.spec.ts` (8 tests) : état vide et bouton
  d'ajout, variante `dense`, tri par position, légende / nom de fichier,
  taille, lien de téléchargement, suppression inline **vs** confirmation
  (annulation incluse), `canManage` ;
- `tests/inertia/format_bytes.spec.ts` (3 tests) ;
- `tests/inertia/client_documents.spec.ts` inchangée hors le doublon de la
  modale (mêmes assertions : état vide, lien, confirmation, `canManage`) ;
- garde du thème sombre (scan exhaustif) et suite Vitest complète vertes ;
  `pnpm lint`, vue-tsc sans erreur sur les fichiers touchés.
