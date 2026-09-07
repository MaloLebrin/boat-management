# 2026-09-07 — Base de connaissance produit du copilote (#642)

Le copilote sait expliquer le produit FleetAi : une base curée et versionnée — pas d'embeddings, pas de service externe — servie par l'outil `search_product_help`.

- **Base.** `shared/constants/assistant/product_knowledge.ts` : entrées bilingues (titre, corps 400–800 caractères, mots-clés FR/EN normalisés sans accents, `navTarget`, `planFlag`), rédigées depuis les fichiers `docs/domain/*.md`, les FAQ marketing et `shared/types/plan.ts` — bateaux, moteurs, maintenance, planning, diagnostic, pièces, sécurité, ports, navigation, commercial, membres et rôles, plans et modules, réglages IA, import/export, hors ligne, notifications…
- **Recherche.** `app/services/assistant_product_help_service.ts` : normalisation (minuscules, accents retirés), score mots-clés (x5) puis titre (x3) puis corps (x1), trois meilleures entrées avec leur `navTarget`. Déterministe, donc testable.
- **Anti-divergence.** Tests unitaires : chaque `navTarget` appartient au vocabulaire fermé, chaque `planFlag` est un flag réel de `PLAN_LIMITS`, ids uniques, mots-clés normalisés. Nouvelle règle CLAUDE.md : toute feature ajoute son entrée à la base.
