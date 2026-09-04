# Outils gratuits en liens directs dans le header public

**Date** : 2026-09-04

## Contexte

Les trois outils gratuits d'acquisition (simulateur de coût d'entretien,
diagnostic de panne IA, recherche de références de pièces IA) étaient rangés
dans le dropdown « Produit » du header depuis la refonte marketing du
2026-09-03. Ce sont les principaux tunnels d'acquisition du site : ils doivent
rester visibles sans clic.

## Changements

- `inertia/composables/use_public_nav.ts` : le groupe « Outils gratuits » sort
  de `productGroups` (le dropdown « Produit » ne contient plus que les trois
  pages fonctionnalité) et devient un computed dédié `toolLinks`
  (simulateur, diagnostic IA, pièces IA), rendu en liens directs.
- `inertia/components/layout/AppHeader.vue` : la nav desktop rend le dropdown
  « Produit » puis `toolLinks` puis `topLinks` (Tarifs, Guide entretien,
  Aide), soit 7 items.
- **Point de rupture de la nav complète déplacé de `md` à `lg`** : 7 items ne
  tiennent pas en 768 px (débordement horizontal mesuré). Le hamburger et le
  drawer mobile couvrent désormais aussi les tablettes (`lg:hidden`). Entre
  `lg` et `xl`, paddings et gaps resserrés (`px-1.5`/`gap-0`, restaurés en
  `px-3`/`gap-1` à `xl`) + `whitespace-nowrap` pour tenir en 1024 px sans
  casser les libellés sur deux lignes.
- `inertia/components/layout/AppHeaderMobileDrawer.vue` : rendu inchangé sur le
  fond — les outils gratuits gardent leur intertitre « Outils gratuits »
  (recomposé localement à partir de `toolLinks`).
- Aucune nouvelle clé i18n (réutilisation de `public.nav.simulator`,
  `public.nav.diagnosisAi`, `public.nav.partsAi`).

## Tests

- `tests/inertia/public_nav_footer.spec.ts` : les assertions header sur les
  outils gratuits ne passent plus par l'ouverture du dropdown ; nouveau test
  « les outils gratuits sont des liens directs du header, hors dropdown » ;
  le test du menu Produit ne couvre plus que les trois pages fonctionnalité.
