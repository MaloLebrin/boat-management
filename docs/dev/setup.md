# Setup local

## Prérequis

- Node.js (projet AdonisJS)
- pnpm (voir `.cursor/rules/package-manager.mdc`)
- Docker (optionnel, pour PostgreSQL)

## Variables d’environnement

Références: `start/env.ts` et `.env.example`.

Le projet attend (entre autres):

- `APP_KEY`, `APP_URL`
- `ENCRYPTION_KEY` (chiffrement au repos, distincte d'`APP_KEY` — `openssl rand -base64 32`, voir `docs/dev/encryption-keys.md`)
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

### Base de test

Les tests ne tournent **pas** sur la base de dev : le compose expose un second
service `postgres_test` (profil `test`), sur le port hôte `5432`, avec `test`
comme base, utilisateur et mot de passe. C'est ce que déclarent `.env.test` et
le bloc `env:` des jobs de tests de la CI — les trois doivent rester alignés.

```bash
pnpm test:db:up     # démarre postgres_test et attend qu'il soit prêt
pnpm test           # suites unit, integration, functional
pnpm test:db:down   # arrête le conteneur (données en tmpfs, rien à nettoyer)
```

## Lancer en dev

```bash
pnpm install
pnpm dev
```

## Migrations & seed

Le schéma Lucid généré se trouve dans `database/schema.ts`.

`node ace db:seed` (sans `--files`) exécute tous les seeders de `database/seeders/`. Voir `docs/dev/seeders.md` pour le détail de chacun (rôle, contenu, comptes créés) — en résumé:

- `malo_seeder.ts` : données réelles de l'utilisateur admin, requiert `ADMIN_EMAIL`/`ADMIN_PASSWORD`
- `sandbox_seeder.ts` : démo générique "Marina Démo"
- `test_plans_seeder.ts` / `billing_module_states_seeder.ts` : comptes de test par plan/abonnement/module (environnements `development`/`test` uniquement)
