# Suppressions confirmées dans l'app : composable `useRowDeleteConfirmation`

**Date** : 2026-09-17 — plan de refactorisation TDD, vague 3.5 (cible 2/3 des
confirmations et éditions recopiées).

## Problème

Six écrans tenaient chacun leur copie de la même mécanique : une réf sur la
ligne visée (`deletingInvoice`, `deletingClient`, `deletingSeason`,
`docToDelete`, `toDelete`, `spotToDelete`) qui sert d'ouverture à
`BaseConfirmModal`, une fonction qui la pose, une autre qui supprime puis la
relâche.

Deux découvertes en figeant leur comportement :

- **`BaseConfirmModal.confirm()` émet `confirm` puis `update:open: false`** :
  les six écrans referment donc leur modale dès la confirmation. Le
  `onFinish: () => (cible = null)` que trois pages passaient à leur visite ne
  relâchait jamais rien.
- Le **doublon de test partagé** `BaseConfirmModal` (`tests/inertia/helpers/mount.ts`)
  n'émettait que `confirm` : toute spec s'appuyant dessus mesurait une modale
  restée ouverte que l'app referme. Doublon aligné sur le vrai composant —
  aucune spec existante n'en dépendait.

## Changement — comportement inchangé

- `inertia/composables/use_row_delete_confirmation.ts` :
  `useRowDeleteConfirmation({ url, visit? })` →
  `{ target, isOpen, ask, release, confirm }`.
  - `isOpen` alimente le `:open` de la modale, `release` son `@update:open`,
    `confirm` son `@confirm` ;
  - l'URL est calculée **au moment de confirmer**, depuis la cible posée ;
  - `visit` est transmis tel quel, et son absence garde la visite à un seul
    argument (le gestionnaire de postes n'en passait aucune).
- Les six écrans adoptent le composable (−116 / +60 lignes au total).
  `SpotsManager` perd au passage son booléen `showDeleteConfirm`, redondant
  avec la réf de cible : les deux étaient posés et relâchés ensemble.
- **Seule simplification volontaire** : le `onFinish` mort des trois pages
  disparaît. La première version des tests de caractérisation l'appelait pour
  prouver qu'il ne changeait rien (voir le commit de caractérisation) ; les
  tests figent désormais que la visite ne porte plus que `preserveScroll`.
- Hors périmètre : trois écrans confirment la suppression de **leur propre**
  entité (`invoices/show`, `boats/edit`, `ports/show`) avec un simple booléen,
  sans ligne visée. Les faire passer par un composable de ligne les
  déformerait — ils restent tels quels.

## Tests

- **Caractérisation avant** : `tests/inertia/row_delete_confirmation.spec.ts`
  (5 tests sur trois écrans — page saisons, page factures, gestionnaire de
  postes) : ouverture sans envoi, annulation sans envoi, requête exacte et
  modale refermée, dont l'écran sans options de visite. Verts sur le code
  d'origine (avec le doublon corrigé), puis après migration.
- `tests/inertia/use_row_delete_confirmation.spec.ts` (9 tests, écrits avant
  le composable) : cible initiale, `ask` (y compris le remplacement d'une
  cible), `release`, `confirm` avec et sans cible, absence d'options, URL
  calculée à la confirmation, réactivité d'`isOpen`.
- `document_list`, `inspection_defects`, `client_documents` — les specs
  existantes des écrans migrés — inchangées et vertes. Suite Vitest complète
  (2426 tests), `pnpm lint` et `pnpm typecheck` (197 erreurs préexistantes,
  aucune nouvelle) verts.
