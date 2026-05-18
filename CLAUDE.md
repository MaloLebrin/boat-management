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

## Dépendances système

### Ghostscript (compression PDF)
Les PDFs uploadés sont compressés avant envoi sur Cloudinary via `app/services/pdf_service.ts` (`-dPDFSETTINGS=/ebook`).

- **Local** : `brew install ghostscript`
- **Docker/prod** : `apt-get install -y ghostscript` dans le Dockerfile
- **Fallback** : si `gs` n'est pas disponible, le PDF original est envoyé sans compression (warning loggé, pas de crash)

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

### Internationalisation
- **Toute chaîne visible par l'utilisateur doit passer par `t()`** — jamais de texte en dur dans les templates
- Pattern obligatoire : `import { useT } from '~/composables/useT'` → `const { t } = useT()` → `{{ t('clé') }}`
- Clés organisées par domaine dans `resources/lang/{en,fr}/app.json` (et par namespace : `flash.json`, `marketing.json`, `validator.json`)
- Interpolation ICU : `t('clé', { count: String(n) })` — les valeurs doivent être des strings
- Pas de ternaire inline `locale === 'fr' ? '...' : '...'` — utiliser `t()` à la place
- Toute PR qui ajoute un composant ou une page doit ajouter les clés correspondantes dans les **deux locales** (`en` et `fr`)

## Workflow agent
1. **Toujours lire les fichiers existants** avant de modifier
2. **Plan d'abord** : décrire ce qui va être fait avant de coder
3. **Tests obligatoires** pour toute logique métier nouvelle
4. **Pas de `console.log`** en commit — utiliser le logger Adonis
5. **Migrations** : ne jamais modifier une migration déjà exécutée en production
6. **Documentation obligatoire** : toute nouvelle feature doit être ajoutée en haut de `docs/changelog.md` avec la date et une description en français (routes, champs, comportements notables)

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
- **Écrire du texte visible en dur dans un template Vue** (→ utiliser `t('clé')`)
- **Utiliser des ternaires `locale === 'fr' ? ... : ...`** (→ utiliser `t()` avec clé dans les deux JSON)
