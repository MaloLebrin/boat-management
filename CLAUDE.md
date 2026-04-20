# CLAUDE.md — Contexte Global

## Stack principale
- **Backend** : AdonisJS v7 (TypeScript strict)
- **Frontend** : Vue 3 (Composition API)
- **Base de données** : PostgreSQL via Lucid ORM
- **ORM** : Lucid (migrations, seeders, factories)
- **Auth** : @adonisjs/auth avec bouncer pour les ACL
- **Tests backend** : Japa
- **Tests frontend** : Vitest + Testing Library
- **Package manager** : npm (sauf indication contraire)
- **Déploiement** : Docker + CI/CD GitHub Actions

## Conventions de code

### TypeScript
- Strict mode activé (`"strict": true`)
- Interfaces préférées aux types pour les objets
- Pas de `any` — utiliser `unknown` si nécessaire
- Nommage : `camelCase` pour variables/fonctions, `PascalCase` pour classes/interfaces

### AdonisJS
- Controllers fins : logique métier dans les Services (`app/services/`)
- Un fichier par ressource : `user_service`, `post_service`, etc.
- Validation via VineJS (validators dans `app/validators/`)
- Routes RESTful : nommage `resource.action` (ex: `users.index`, `users.store`)
- Middleware dans `app/middleware/`
- Events dans `app/events/` + Listeners dans `app/listeners/`

### Base de données
- Migrations : toujours avec rollback (`down()` implémenté)
- Nommage tables : snake_case pluriel (`user_profiles`, `refresh_tokens`)
- Factories pour les tests, Seeders pour les données de démo
- Jamais de `SELECT *` en production — colonnes explicites

### Frontend (Vue 3)
- `<script setup>` systématiquement
- Composables dans `composables/use*.ts`
- Props typées avec `defineProps<{}>()` 
- Pas de `Options API`

## Workflow agent
1. **Toujours lire les fichiers existants** avant de modifier
2. **Plan d'abord** : décrire ce qui va être fait avant de coder
3. **Tests obligatoires** pour toute logique métier nouvelle
4. **Pas de `console.log`** en commit — utiliser le logger Adonis
5. **Migrations** : ne jamais modifier une migration déjà exécutée en production

## Structure projet type
```
app/
  controllers/     # HTTP Controllers (fins)
  services/        # Logique métier
  models/          # Modèles Lucid
  validators/      # VineJS validators
  middleware/      # Middleware HTTP
  policies/        # Bouncer policies (ACL)
  jobs/            # Background jobs
  events/          # Event definitions
  listeners/       # Event listeners
config/
database/
  migrations/
  seeders/
  factories/
resources/
  views/           # Edge templates ou Inertia
start/
  routes.ts
  kernel.ts
tests/
  unit/
  functional/
```

## Ne jamais faire
- Modifier `start/kernel.ts` sans vérifier les effets de bord
- Utiliser `Model.query()` dans un Controller (→ déléguer au Service)
- Committer des secrets ou `.env`
- Supprimer des migrations existantes
