# Suppressions confirmées : helper partagé `confirmDelete`

**Date** : 2026-09-17 — plan de refactorisation TDD, vague 3.5 (cible 1/3 des
confirmations et éditions recopiées).

## Problème

Dix-huit sites dans dix-sept fichiers répétaient la même garde avant une
suppression : `if (!confirm(t('…'))) return` puis `router.delete(url, …)`.
Trois détails les faisaient diverger :

- la moitié écrivait `confirm(...)` **nu**, l'autre `window.confirm(...)` : le
  premier lève côté SSR ;
- quatorze sites passaient `{ preserveScroll: true }`, les deux cartes de port
  n'en passaient aucune ;
- une fiche d'entretien en faisait une garde **booléenne** lue depuis son
  template (`if (!confirmDelete()) e.preventDefault()`), et un panneau
  d'équipage gardait un `patch`, pas une suppression.

Conséquence : aucun endroit unique à toucher le jour où ces dialogues natifs
passeront à `BaseConfirmModal`, que dix autres écrans utilisent déjà.

## Changement — comportement inchangé

- `inertia/utils/confirm_delete.ts` (helper sans état, comme
  `status_variants.ts` et `format_bytes.ts`) :
  - `confirmed(message)` : confirmation native, `window.` explicite, et
    **`false` hors navigateur** — une action destructrice ne part jamais faute
    de dialogue ;
  - `confirmDelete(message, url, options?)` : confirme puis supprime. Les
    options sont transmises **telles quelles**, et sans options la visite part
    avec un seul argument — les deux cartes de port gardent leur signature.
  - Le type des options est dérivé de `Parameters<typeof router.delete>[1]` :
    pas de dépendance ajoutée sur `@inertiajs/core`, non résolu ici.
- Les 17 fichiers appellent le helper ; `router` disparaît de leurs imports
  Inertia quand il n'y servait qu'à ça. La fiche d'entretien perd sa fonction
  locale et appelle `confirmed()` depuis le template ; le panneau d'équipage
  garde son `patch` derrière `confirmed()`.
- Hors périmètre, constaté : les deux cartes de port appellent aussi `alert()`
  nu (pré-contrôle « poste occupé »), et `ports/show.vue` fait de même. Même
  problème SSR, autre dialogue — à traiter avec leur passage en modale.

## Tests

- **Caractérisation avant** : `tests/inertia/confirm_before_delete.spec.ts`
  (13 tests, verts sur le code d'origine puis après migration). Six sites
  couvrant les trois formes : liste de budget, séjours au port, entrées de
  journal, les deux cartes de port (pré-contrôle `alert`, refus, suppression
  **sans options**) et la garde booléenne de la fiche d'entretien
  (`preventDefault` sur refus). Chaque site fige la clé du message, le fait
  qu'un refus n'envoie rien, et la requête exacte. `MediaPhotoGallery` l'était
  déjà par sa propre spec, dans les deux sens.
- `tests/inertia/confirm_delete.spec.ts` (6 tests, écrits avant le helper) :
  réponse et message de `confirmed`, refus sans visite, options transmises,
  visite à un seul argument, et les deux fonctions muettes hors navigateur.
- `tests/inertia/confirm_dialog_guard.spec.ts` (3 règles, **rouges avant la
  migration**, vérifié) : plus aucun `window.confirm` ni `confirm(t(…))` dans
  `pages/`, `components/` et `composables/`, et le helper porte bien le
  dialogue.
- Les specs existantes qui assertaient déjà ces suppressions
  (`media_photo_gallery`, `reservation_list`, `navigation_log_crew_panel`,
  `budget_*`) sont inchangées et vertes. Suite Vitest complète (2434 tests),
  `pnpm lint` et `pnpm typecheck` (197 erreurs préexistantes, aucune nouvelle)
  verts.
