# CLAUDE.md — Contexte Global

## Stack principale
- **Backend** : AdonisJS v7 (TypeScript strict)
- **Frontend** : Vue 3 (Composition API) + Inertia.js (SSR)
- **Base de données** : PostgreSQL via Lucid ORM (SQLite pour les tests)
- **ORM** : Lucid (migrations, seeders)
- **Auth** : @adonisjs/auth avec bouncer + abilities pour les ACL
- **IA** : Mistral AI via `@mistralai/mistralai` + système de queue AdonisJS
- **Tests backend** : Japa (functional + unit)
- **Tests frontend** : Vitest + @vue/test-utils
- **Package manager** : pnpm
- **Déploiement** : Docker + CI/CD GitHub Actions

## Conventions de code

### TypeScript
- Strict mode activé (`"strict": true`)
- Interfaces préférées aux types pour les objets
- Pas de `any` — utiliser `unknown` si nécessaire
- Nommage : `camelCase` pour variables/fonctions, `PascalCase` pour classes/interfaces

### AdonisJS
- Controllers fins : logique métier dans les Services (`app/services/`)
- Un fichier par ressource : `user_service`, `boat_service`, etc.
- Validation via VineJS (validators dans `app/validators/`)
- Transformers dans `app/transformers/` pour formater les données envoyées au frontend
- Routes RESTful : nommage `resource.action` (ex: `users.index`, `users.store`)
- Routes découpées par domaine dans `start/routes/` (auth.ts, boats.ts, ai.ts…)
- Middleware dans `app/middleware/`
- Events dans `app/events/` + Listeners dans `app/listeners/`
- Abilities (Bouncer) dans `app/abilities/`
- Jobs de queue dans `app/jobs/`

### Base de données
- Migrations : toujours avec rollback (`down()` implémenté)
- Nommage tables : snake_case pluriel (`user_profiles`, `refresh_tokens`)
- Seeders pour les données de démo (`database/seeders/`)
- Jamais de `SELECT *` en production — colonnes explicites

### Frontend (Vue 3 + Inertia)
- `<script setup>` systématiquement
- Pages dans `inertia/pages/` (organisées par domaine : auth, boats, marketing…)
- Composants dans `inertia/components/`
- Composables dans `inertia/composables/`
- Props typées avec `defineProps<{}>()`, pas d'Options API
- Code partagé backend/frontend dans `shared/` (types, helpers, constants)
- **Taille max des composants Vue : 250 lignes** (enforced par ESLint `max-lines`) — au-delà, extraire en sous-composants
- Pages complexes à onglets : chaque onglet = un composant dans `components/<domaine>/show/tabs/`

## Workflow agent
1. **Toujours lire les fichiers existants** avant de modifier
2. **Plan d'abord** : décrire ce qui va être fait avant de coder
3. **Tests obligatoires** pour toute logique métier nouvelle
4. **Pas de `console.log`** en commit — utiliser le logger Adonis
5. **Migrations** : ne jamais modifier une migration déjà exécutée en production

## Structure projet
```
app/
  controllers/     # HTTP Controllers (fins)
  services/        # Logique métier
  models/          # Modèles Lucid
  validators/      # VineJS validators
  transformers/    # Formatage des données → frontend
  middleware/      # Middleware HTTP
  abilities/       # Bouncer abilities (ACL)
  jobs/            # Background jobs (queue)
  events/          # Event definitions
  listeners/       # Event listeners
config/
database/
  migrations/
  seeders/
inertia/           # Frontend Vue 3 + Inertia
  pages/           # Pages par domaine (auth, boats, marketing…)
  components/      # Composants Vue
  composables/     # Composables Vue
  types/           # Types frontend
shared/            # Code partagé backend ↔ frontend (types, helpers, constants)
providers/         # Service providers AdonisJS
start/
  routes/          # Routes découpées par domaine
  routes.ts
  kernel.ts
  scheduler.ts
tests/
  functional/      # Tests Japa (HTTP)
  inertia/         # Tests Vitest (composants Vue)
```

## Ne jamais faire
- Modifier `start/kernel.ts` sans vérifier les effets de bord
- Utiliser `Model.query()` dans un Controller (→ déléguer au Service)
- Committer des secrets ou `.env`
- Supprimer des migrations existantes
- Mettre de la logique de formatage dans les controllers (→ utiliser un transformer)
