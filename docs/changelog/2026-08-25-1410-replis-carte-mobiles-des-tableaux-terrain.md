# 2026-08-25 — Replis carte mobiles pour les tableaux des écrans terrain (#493)

Les écrans les plus consultés à bord (journal de bord, avitaillement, incidents, historique maintenance) affichaient leurs données en tableaux `overflow-x-auto` : sur téléphone, il fallait défiler horizontalement pour lire une seule ligne.

- **Motif appliqué** (celui de `boats/index.vue`) : bloc cartes `lg:hidden space-y-3` + table existante en `hidden lg:block overflow-x-auto`. Quatre cartes créées à côté des `*Row.vue`, mêmes props — aucune duplication de données :
  - `LogbookCard.vue` (journal) — trajet et date priment, distance secondaire ;
  - `FuelLogCard.vue` (avitaillement) — quantité et coût priment, fournisseur secondaire ;
  - `IncidentCard.vue` (incidents) — type et statut priment, date et lieu secondaires ;
  - `MaintenanceHistoryCard.vue` (timeline historique) — la rangée desktop gardait ses badges en ligne (`shrink-0`, débordement en 375 px) ; la carte empile tout et porte son propre état déplié (notes + pièces).
- **Contraintes tenues.** Tokens sémantiques uniquement (les 4 cartes sont déclarées dans le scan `theme_safe_components.spec.ts`), `<Link>` pour toute navigation, `t()` partout (clés existantes réutilisées, aucune nouvelle clé), < 250 lignes par composant.
- **Doc.** Section « Repli carte mobile des tableaux » dans `docs/frontend/ui-map.md`.
- **Tests.** 6 cas Vitest (`table_card_collapse.spec.ts`) : chaque carte montre les mêmes données que sa ligne, la timeline rend cartes ET rangées avec les classes de breakpoint, dépliage autonome de la carte maintenance, et scan source des 4 écrans (motif `lg:hidden` / `hidden lg:block` présent). Vérifié en dev (viewport 375 px) : cartes rendues sur les 4 écrans, table masquée, `scrollWidth` = largeur viewport (aucun débordement). Non-régression du débordement : #500.
