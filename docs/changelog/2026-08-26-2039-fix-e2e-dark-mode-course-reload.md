# Fix E2E : course entre le PUT du thème et le rechargement (dark_mode.spec.ts)

**Date** : 2026-08-26

## Problème

Le test E2E « un choix explicite survit au rechargement, sans repasser par le client »
(`tests/browser/dark_mode.spec.ts`) échouait de façon intermittente en CI
(`expected 'dark' to equal 'light'`), sur la PR #555 comme sur `main`.

`setTheme` (`inertia/composables/use_theme.ts`) pose `data-theme` sur `<html>`
immédiatement (retour visuel optimiste) **puis** envoie le `PUT /settings/theme`.
Le test attendait seulement l'attribut — satisfait avant le départ de la requête —
puis rechargeait la page : le reload pouvait annuler le PUT en vol, le serveur ne
persistait jamais le choix et re-rendait le thème système (`dark`).

## Correctif

Le test attend désormais la réponse du `PUT /settings/theme`
(`page.waitForResponse`) avant de recharger : la persistance serveur est garantie,
l'assertion sur le rendu serveur (`waitUntil: 'commit'`) reste inchangée.

Aucun changement de code applicatif — le comportement optimiste du composable est
volontaire (pas d'attente du round-trip pour basculer le thème à l'écran).
