# i18n des maquettes « screenshot » des pages marketing

**Date** : 5 septembre 2026

## Problème

Les « screenshots » des pages marketing (hero de la home, sections fonctionnalité de `home.vue` et pages `feature.vue`) sont des maquettes Vue de l'UI produit, pas des images. Les 5 composants `inertia/components/marketing/home/HomeMock*.vue` contenaient ~110 chaînes françaises en dur qui s'affichaient telles quelles sur le site EN (nav, KPI, tableaux, calendrier, chat FleetAi, panneau « À venir »). Précédent : la clé `homePreview.fleetCount` avait corrigé ponctuellement « 22 bateaux » (changelog 2026-07-17) ; cette modification généralise le correctif.

## Modifications

### Traductions

- `resources/lang/{en,fr}/homePreview.json` : nouvelle section imbriquée `mock` (namespace client, transmis via `appT`) avec les blocs `nav` (partagé par les 4 maquettes plein écran), `dashboard`, `boatDetail`, `planning`, `fleetide`, `upcoming`.
- Les noms propres de la flotte de démo restent en dur et identiques dans les deux locales : bateaux (`Mistral II`, `Azur`, `Alizée`…), `Marina Bleue`, `Ponton B-12`, `Jeanneau Sun Odyssey 440`, `Yanmar 45CV`, domaine `app.fleetai.fr`.
- Les fausses dates (« 18 avr », « Mai 2025 », « Antifouling - 12 mai »…) sont des clés i18n traduites (« Apr 18 », « May 2025 »…) — ce sont des données statiques de démo, pas des dates à formater via `useDateFormat()`.

### Composants

- `HomeMockDashboard.vue`, `HomeMockBoatDetail.vue`, `HomeMockPlanning.vue`, `HomeMockFleetide.vue`, `HomeMockUpcomingTasks.vue` : toutes les chaînes visibles passent par `useT().t('homePreview.mock.…')`, y compris le `placeholder` du chat FleetAi. Les jours du calendrier de `HomeMockPlanning` sont rendus par un `v-for` sur un `computed`, et les libellés du panneau défilant de `HomeMockUpcomingTasks` sont construits dans un `computed`.
- La phrase du chat avec `<strong>` inline est découpée en clés `answerPrefix` / `answerStrong` / `answerSuffix` (pas de `v-html`) ; les items de liste utilisent une clé `itemSep` (« : » avec espaces FR, «: » EN) pour garder le nom du bateau en gras.
- `HomeMockDashboard.vue` : suppression de la prop `persona` déclarée mais jamais utilisée (et de son binding dans `HomeHeroSection.vue`).

### Correctif annexe (même bug, hors maquettes)

- `AboutOfficeSection.vue` : les libellés « Horaires » et « Équipe » étaient en dur ; ils arrivent maintenant en props (`hoursLabel`, `teamLabel`) depuis `buildAboutPageData` (`marketing_controller.ts`), avec les clés `office_hours_label` / `office_team_label` dans `marketing.json` (EN + FR) et le type complété dans `shared/types/marketing.ts`.

## Tests

- Nouveau spec `tests/inertia/home_mocks_i18n.spec.ts` : monte les 5 maquettes avec les vraies traductions `homePreview.json` injectées dans `appT` (comme le middleware Inertia) et vérifie, pour chaque maquette, le rendu EN sans résidu français, le rendu FR, le placeholder localisé et l'invariance des noms de démo.
- `tests/inertia/home_feature_section_anchor.spec.ts` : ajout du mock `use_t` standard (la maquette rendue par la section lit désormais `appT`).
- Le garde-fou existant `i18n_key_namespaces.spec.ts` couvre la résolution de toutes les nouvelles clés dans les deux locales.
