# Messages flash : toast uniquement

**Date** : 2026-09-17 — plan de refactorisation TDD, vague 3.2.

## Problème

Le middleware Inertia partage les messages flash (`success`, `error`,
`info`) et les layouts `default` et `auth` les rendent déjà en toast via
`useFlashToasts()`. Sept pages les relisaient pourtant une seconde fois
(`computed(() => page.props.flash …)`) pour les afficher en bandeau
`BaseAlert` : factures (liste, fiche, formulaire), clients, membres,
équipage, périodes tarifaires. Un même message apparaissait donc deux fois,
et chaque page portait sa copie du `computed`. Les deux pages d'auth
(`forgot_password`, `reset_password`) affichaient de même l'erreur en
bandeau alors que le layout `auth` monte aussi un `<Toaster>`.

## Changement

- Les sept pages perdent leur `computed` et leurs bandeaux flash ; les
  imports `BaseAlert`, `usePage` et `computed` devenus inutiles sont retirés.
  Les bandeaux **non liés au flash** (avertissement lecture seule des clients
  et des factures après résiliation, #332) restent.
- `forgot_password` : le flash de succès reste un **état** (panneau
  « e-mail envoyé » à la place du formulaire) et passe par
  `useFlash().successMessage` ; le bandeau d'erreur disparaît, le toast du
  layout `auth` le remplace.
- `reset_password` : le bandeau d'erreur disparaît (toast du layout `auth`).
- Le seul bandeau flash conservé est celui de la section démo de la home
  marketing (`HomeDemoSection`, `useFlash().errorMessage`) : le layout
  `public` ne monte pas de toaster.
- 9 fichiers, −97 / +16 lignes ; aucune clé i18n ni route ne change.

## Tests

- `tests/inertia/flash_inline_guard.spec.ts` (4 gardes, rouges avant) :
  aucune page ni composant ne lit `page.props.flash`, aucun `BaseAlert`
  conditionné par le flash, `useFlash()` réservé à la section démo côté
  composants.
- `tests/inertia/flash_toasts.spec.ts` (existant) : un toast par type de
  flash, arrivée sur une visite ultérieure, durée de vie, action d'upsell.
- Suite Vitest complète verte ; `pnpm lint` ; vue-tsc : l'erreur
  préexistante de `reset_password.vue` (type de `action` du `<Form>`) reste,
  celles de `forgot_password.vue` (`flash` typé `{}`) disparaissent.
