# Brouillons de formulaire catalogue : composable `useCatalogFormDraft`

**Date** : 2026-09-17 — plan de refactorisation TDD, vague 3.5 (troisième
composable).

## Problème

`useEngineFormDraft` (#573) et `useGenericEquipmentFormDraft` (#577) étaient
deux jumeaux — le second se documentait lui-même comme « décalque » du premier.
Même socle recopié : magasin `useRemember`, restauration champ par champ,
`watch` qui range la saisie, lecture du paramètre d'URL, helper de surface pour
rouvrir la modale, et jusqu'au commentaire expliquant le remontage d'arbre.
Trois choses seulement les distinguaient : le préfixe de la clé de brouillon et
les deux paramètres d'URL (`engineBrandId` / `equipmentBrandId`,
`engineForm` / `equipmentForm`).

## Changement — comportement inchangé

- `inertia/composables/use_catalog_form_draft.ts` :
  - `CatalogDraftFamily` = `{ rememberPrefix, brandParam, surfaceParam }` —
    tout ce qui distingue une famille catalogue d'une autre ;
  - `useCatalogFormDraft(family, key, fields, syncFromServer)` porte le socle :
    hors aller-retour catalogue on repart du serveur, au retour le brouillon
    gagne champ par champ (un champ absent garde sa valeur courante), et chaque
    frappe met le brouillon à jour ;
  - `catalogFormSurfaceParam(family)` rend la surface brute de l'URL.
- Les deux composables deviennent la liaison de domaine de leur famille et
  gardent leur API publique — les huit composants appelants ne changent pas :
  `useEngineFormDraft`, `shouldReopenEngineForm`,
  `useGenericEquipmentFormDraft`, `shouldReopenGenericEquipmentForm`,
  `genericEquipmentFormSurfaceParam`. −130 / +35 lignes sur les deux fichiers.
- `vue-tsc` : les **six** erreurs `Property 'value' does not exist` que les deux
  brouillons portaient chacun (trois par fichier) disparaissent. `useRemember`
  se déclare `T | Ref<T>` pour son repli SSR mais rend toujours un `Ref` : le
  socle le type explicitement (`CatalogFormDraft`), ce que le code supposait
  déjà. Total du dépôt : 203 → 197 erreurs préexistantes.

## Tests

- **Caractérisation avant** :
  `tests/inertia/form_draft_catalog_round_trip.spec.ts` (10 tests, verts sur le
  code d'origine puis après migration). `use_engine_form_draft.spec.ts` figeait
  déjà le contrat moteur ; ce qui n'était couvert nulle part, et que le partage
  pouvait casser : le jumeau équipement (valeurs serveur, restauration,
  non-résurrection d'un brouillon abandonné, isolation par clé, helpers de
  surface dont la surface paramétrée `…-edit-<id>`) et l'**étanchéité entre les
  deux familles** — ni le paramètre d'URL ni l'espace de noms du brouillon ne
  traversent.
- `tests/inertia/use_catalog_form_draft.spec.ts` (8 tests, écrits avant le
  composable) : synchronisation serveur appelée ou non, brouillon prioritaire
  au retour, champ absent du brouillon, aller-retour sans saisie, isolation par
  clé puis par famille, mise à jour à chaque frappe, `catalogFormSurfaceParam`.
- `use_engine_form_draft.spec.ts` et les specs des composants appelants
  inchangées et vertes ; suite Vitest complète (2411 tests) et `pnpm lint`
  verts.
