# Suppression de sa propre entité : composable `useDeleteConfirmation`

**Date** : 2026-09-17 — troisième des observations relevées en marge du plan de
refactorisation TDD (vague 3.5), et pendant de #676.

## Problème

#676 a mutualisé les six écrans qui confirment la suppression d'une **ligne**, et
laissait de côté trois écrans qui confirment la suppression de **leur propre**
entité : `pages/invoices/show.vue`, `pages/boats/edit.vue`,
`pages/ports/show.vue`. Les faire passer par un composable de ligne les aurait
déformés — la page connaît déjà ce qu'elle supprime par ses props, il n'y a pas
de cible à poser.

Restait donc la même mécanique recopiée trois fois : un booléen d'ouverture
(`showDeleteModal`, `showDeleteConfirm`, `showDeleteConfirm`), une fonction qui
le pose, une visite au moment de confirmer — et, au fond de chacune, le même
`if (options === undefined)` pour garder la visite à un seul argument, qui
existait déjà en **trois** exemplaires dans l'app.

## Changement — comportement inchangé

- `inertia/utils/delete_visit.ts` : `deleteVisit(url, options?)`, la visite de
  suppression avec ses options transmises telles quelles. Les trois porteurs de
  confirmation l'appellent — `useRowDeleteConfirmation` la reprend ici
  (−10 lignes), `utils/native_dialog.confirmDelete` reste à migrer (voir plus
  bas).
- `inertia/composables/use_delete_confirmation.ts` :
  `useDeleteConfirmation({ url, visit? })` → `{ isOpen, ask, release, confirm }`.
  - `isOpen` est un vrai booléen, pas une cible dérivée : c'est précisément ce
    qui distingue ce composable de celui des lignes ;
  - l'URL est un getter, calculée **au moment de confirmer** ;
  - `confirm()` supprime puis relâche — `BaseConfirmModal` émet `confirm` puis
    `update:open: false`, le relâchement garde l'état d'accord avec elle.
- Les trois pages adoptent le composable. `router` quitte les imports de
  `boats/edit` et `ports/show`, qui ne l'appelaient plus que pour ça.
  - `boats/edit` garde son `executeDeleteBoat()` : le chargement du bouton
    (`deleting`) se pose **avant** la visite, comme avant — le composable ne
    porte pas ce détail d'affichage.
  - `ports/show` garde sa garde des places occupées, intacte.

## Reste à faire

`utils/native_dialog.confirmDelete` porte le même `if` que `deleteVisit` ; il
n'est pas migré ici pour ne pas entrer en conflit avec la PR qui renomme ce
module (avis natif `notify()`). Une ligne, juste après.

## Tests

- **Caractérisation avant** : `tests/inertia/entity_delete_confirmation.spec.ts`
  (8 tests sur les trois écrans), verte sur le code d'origine puis après
  migration : le clic ouvre sans rien envoyer, l'annulation n'envoie rien, la
  confirmation envoie la requête exacte et la modale se referme — dont
  `{ preserveScroll: true }` pour la facture, l'`onFinish` du bateau, et
  l'absence d'options de la page port.
  L'annulation n'était regardée par aucun test des trois écrans.
- `tests/inertia/use_delete_confirmation.spec.ts` (6 tests, écrits avant le
  composable) : fermé au départ, `ask`, `release`, `confirm` avec et sans
  options, URL calculée à la confirmation.
- Les specs existantes des trois écrans sont inchangées et vertes :
  `boats_edit_delete_button.spec.ts` (5 tests, #397/#398/#419),
  `invoice_show_actions.spec.ts`, `ports_show_delete.spec.ts` (5 tests, #398,
  gardes des places occupées comprises), et
  `row_delete_confirmation.spec.ts` / `use_row_delete_confirmation.spec.ts`
  (14 tests) pour la bascule sur `deleteVisit`.
- Suite Vitest complète (2465 tests), `pnpm lint` et `pnpm typecheck`
  (197 erreurs préexistantes, aucune nouvelle) verts.
