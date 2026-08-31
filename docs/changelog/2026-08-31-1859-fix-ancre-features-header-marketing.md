# Correction de l'ancre morte du lien « Fonctionnalités »

**Date** : 2026-08-31

## Contexte

Le lien « Fonctionnalités » du header public (desktop et drawer mobile) ainsi
que le lien équivalent du footer pointaient vers `/{locale}#features`. Le seul
élément portant `id="features"` du repo était dans
`HomeContentSections.vue`, un composant qui n'était plus importé par aucune
page depuis la réécriture de la home marketing (`inertia/pages/marketing/home.vue`).
Le clic renvoyait donc simplement en haut de la page (issue #610).

## Changements

- `HomeFeatureSection.vue` accepte désormais une prop optionnelle `anchorId`,
  posée sur la balise `<section>` avec `scroll-mt-24` (même pattern que
  `ContactFormSection.vue`) pour compenser le header sticky.
- `inertia/pages/marketing/home.vue` passe `anchor-id="features"` à la
  première section « Feature deep-dives » (la section la plus proche
  sémantiquement du lien « Fonctionnalités »).
- Suppression du code mort confirmé : `HomeContentSections.vue` (plus importé
  nulle part) et `HomeBentoGridSection.vue` (uniquement utilisé par le
  précédent). Retrait de l'entrée correspondante dans
  `tests/inertia/theme_safe_components.spec.ts`.

## Tests

- `tests/inertia/home_feature_section_anchor.spec.ts` (nouveau) : vérifie que
  `anchorId` pose bien l'id et la classe `scroll-mt-24` sur la section, et
  qu'aucun id n'est posé quand la prop est absente.
