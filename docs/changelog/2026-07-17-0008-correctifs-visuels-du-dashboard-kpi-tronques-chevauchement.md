# 2026-07-17 — Correctifs visuels du dashboard : KPI tronqués, chevauchement, débordement (#366)

Trois défauts visuels sur `/dashboard` à 1280×720 : les labels des cartes KPI (« Engines », « Urgent maintenance ») étaient tronqués faute d'espace face au badge de statut ; dans le widget « Urgent maintenance », le titre et « Next 14 days » se chevauchaient ; le panneau « AI Assistant » débordait du viewport (scrollbar horizontale sur toute la page).

- `BaseStatCard.vue` : la ligne label + badge passe en `flex-wrap` (le label n'est plus tronqué avec `truncate`, il s'enroule ou le badge redescend sous le titre si l'espace manque).
- `dashboard.vue` : les grilles `lg:grid-cols-[1fr_16rem]` et `lg:grid-cols-[1fr_2fr]` passent en `minmax(0,1fr)` pour éviter le « grid blowout » (une piste `1fr` seule ne peut pas rétrécir sous la taille de son contenu, ce qui poussait le panneau IA hors du viewport) ; l'en-tête du widget « Urgent maintenance » (titre + période) passe en `flex-wrap` pour éviter le chevauchement de texte.
- **Bonus** : les badges de statut des cartes Moteurs/Voiles/Gréements affichaient « Normal » même à 0 unité (absence de données ≠ tout va bien). Nouveau ton `empty` (`BaseBadge.vue`, `BaseStatCard.vue`, clé `common.tone.empty` = « Aucune donnée »/« No data ») utilisé quand le compteur correspondant est à 0.
- **Tests** : `tests/inertia/base_stat_card.spec.ts` (ton `empty`, absence de `truncate` sur le label).
