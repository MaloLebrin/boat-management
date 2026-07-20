# Setup local

## Prérequis

- Node.js (projet AdonisJS)
- pnpm (voir `.cursor/rules/package-manager.mdc`)
- Docker (optionnel, pour PostgreSQL)

## Variables d’environnement

Références: `start/env.ts` et `.env.example`.

Le projet attend (entre autres):

- `APP_KEY`, `APP_URL`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`
- `SESSION_DRIVER`
- `QUEUE_DRIVER`

## Base de données (PostgreSQL via docker-compose)

Référence: `docker-compose.yml`.

Le Postgres docker écoute sur le port hôte `5431`.

Valeurs par défaut dans le compose:

- DB: `3d-website_dev`
- User: `3d-website`
- Password: `3d-website`

## Lancer en dev

```bash
pnpm install
pnpm dev
```

## Migrations & seed

Le schéma Lucid généré se trouve dans `database/schema.ts`.

Pour créer les données réelles de l'utilisateur admin, le seeder `database/seeders/malo_seeder.ts` requiert:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Commande (référence dans le seeder):
`node ace db:seed --files database/seeders/malo_seeder.ts`

Pour créer une organisation par état de la matrice plan/abonnement/module de `/settings/billing` (Starter, Pro avec/sans abonnement, modules souscrits/offerts, add-on `extra_boats`, Enterprise avec/sans lignes `granted`) — utile pour QA manuelle sans Stripe, environnements `development`/`test` uniquement:
`node ace db:seed --files database/seeders/billing_module_states_seeder.ts`
