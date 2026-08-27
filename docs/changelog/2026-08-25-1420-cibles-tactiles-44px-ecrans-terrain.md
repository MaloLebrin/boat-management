# 2026-08-25 — Cibles tactiles ≥ 44 px sur les écrans terrain (#494)

Plusieurs contrôles utilisés à bord étaient sous le seuil de 44 px (Apple HIG) — dans le pire contexte d'usage possible : debout sur un pont qui bouge, mains mouillées.

- **Case à cocher des fiches d'entretien** (interaction terrain n°1, 20 px) : pseudo-zone `pointer-coarse:before:-inset-3` → 44 px de cible sur écran tactile, visuel inchangé (agrandir la case aurait déséquilibré la fiche). Appliqué sur `BoatMaintenanceSheetItemRow.vue` (structure issue de #490).
- **Hamburger mobile** (seul accès à la navigation tant que la bottom nav #492 n'est pas livrée) : 40 → **44 px pleins** (`w-11 h-11`).
- **`BaseButton` corrigé plutôt que proscrit** : `sm` (32 px) et `icon` (32 px) portent nativement une pseudo-zone de +12 px, `md` (40 px) de +4 px — uniquement sur pointeur grossier (`pointer-coarse:`), la densité desktop est intacte. `lg` est déjà à 44 px. `size="sm"` reste donc utilisable sur les écrans terrain ; tous ses usages existants (cartes, listes, file hors-ligne) en bénéficient d'un coup.
- **Bouton de fermeture du drawer** (36 px) : pseudo-zone `-inset-1` → 44 px.
- **Piège documenté** : les classes de pseudo-zone doivent être écrites en littéral complet — le scanner Tailwind ne détecte pas les noms concaténés. Vérifié en dev : 4 règles `@media (pointer: coarse)` générées.
- **Doc.** Section « Cibles tactiles » dans `docs/frontend/ui-map.md`.
- **Tests.** 5 cas Vitest (`touch_targets.spec.ts`) : classes de zone tactile sur `BaseButton` sm/md/icon (montés), absence sur `lg` (déjà 44 px), pseudo-zone de la case à cocher, hamburger à 44 px, bouton de fermeture du drawer — assertions de classes (happy-dom n'applique pas le CSS) ; la mesure réelle (`boundingBox` Playwright) relève de #500.
