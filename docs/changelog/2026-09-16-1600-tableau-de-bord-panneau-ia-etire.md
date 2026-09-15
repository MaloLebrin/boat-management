# 2026-09-16 — Tableau de bord : le panneau Assistant IA ne s'étire plus

Sur le tableau de bord, le panneau « Assistant IA » occupait toute la hauteur
de la colonne principale (maintenance urgente + bateaux), laissant un grand
aplat navy vide sous le bouton « Analyser la flotte ».

- **Cause.** Le panneau partage une grille CSS avec la colonne principale ; l'alignement par défaut d'une grille (`align-items: stretch`) l'étirait à la hauteur de la ligne.
- **Correctif.** `lg:items-start` sur la grille de `inertia/pages/dashboard.vue` : le panneau garde la hauteur de son contenu.
- **Tests.** `tests/inertia/dashboard_ai_panel_layout.spec.ts` (écrit rouge avant le correctif) vérifie l'alignement de la grille qui porte le panneau.
