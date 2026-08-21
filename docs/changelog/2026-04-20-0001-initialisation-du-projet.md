# 2026-04-20 — Initialisation du projet

## Socle technique

- AdonisJS v7 (TypeScript strict) + Vue 3 / Inertia.js SSR
- PostgreSQL + Lucid ORM, migrations, seeders
- Auth @adonisjs/auth + Bouncer (ACL par abilities)
- Docker + CI/CD GitHub Actions
- ESLint (max-lines 250, vue rules) + Prettier
- Vitest + @vue/test-utils (tests frontend) / Japa (tests backend)
- Tailwind CSS v4
- Design system : composants base (BaseButton, BaseCard, BaseInput, BaseSelect, BaseBadge…)

## Gestion des bateaux

- CRUD bateaux (coque, moteurs, voiles, gréement)
- Historique d'entretien avec pièces consommées
- Architecture REST : hull vs équipements séparés
