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
- **Types des controllers/services dans `shared/types/`** : tout type utilisé dans un controller ou service doit vivre dans `shared/types/<domaine>.ts` — jamais défini inline ou dans `app/`. Le frontend importe directement ces types quand pertinent (props, composables, stores).
- **Classes d'erreur dans `app/exceptions/`** : toute classe d'erreur métier doit vivre dans `app/exceptions/<domaine>_errors.ts` — jamais définie inline dans un controller ou service.

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
- **Navigation interne : toujours `<Link>` (`@adonisjs/inertia/vue`)**, jamais une ancre `<a href="...">` brute — préserve le routing SPA Inertia (pas de full page reload). Ancre `<a>` réservée aux liens externes ou `mailto:`/`tel:`.

#### Mutations Inertia (obligatoire sur pages/composants Inertia)

Sur tout écran rendu par Inertia (`inertia/pages/**`, `inertia/components/**`), **ne jamais** appeler `fetch` / `axios` avec `Content-Type: application/json` ni gérer le CSRF à la main (`X-XSRF-TOKEN`, lecture du cookie).

**À la place :**

- Formulaires : `<Form>` (`@adonisjs/inertia/vue`) ou `useForm` + `form.post` / `form.patch`…
- Actions ponctuelles (drag, toggle, assignation canvas…) : `router.patch` / `router.post` / `router.put` / `router.delete` avec `preserveScroll: true` ; partial reload via `only: ['nomDeProp']` quand seule une prop change
- CSRF : automatique via Shield + client Inertia (pas de helper `getCsrf()`)

**Côté contrôleur** (routes utilisées par ces écrans) :

- Répondre par **redirection Inertia** : `response.redirect().back()` ou `response.redirect('/chemin')` — **pas** `response.json({ ok: true })`
- Validation VineJS + erreurs de session comme pour les autres formulaires Inertia

**Exceptions autorisées** : endpoints dédiés API (`/api/**`, clients externes, exports) — jamais dans un composant/page Inertia si une visite `router.*` ou un `<Form>` suffit.

Références : [Inertia — Link and Form](https://docs.adonisjs.com/guides/frontend/inertia#link-and-form-components), [Manual visits](https://inertiajs.com/manual-visits).

### Internationalisation

- **Toute chaîne visible par l'utilisateur doit passer par `t()`** — jamais de texte en dur dans les templates
- Pattern obligatoire : `import { useT } from '~/composables/useT'` → `const { t } = useT()` → `{{ t('clé') }}`
- Clés organisées par domaine dans `resources/lang/{en,fr}/` — **un fichier par domaine** : `common.json`, `nav.json`, `auth.json`, `dashboard.json`, `planning.json`, `maintenance.json`, `settings.json`, `errors.json`, `equipment.json`, `boats.json`, `homePreview.json`, `public.json`, `ports.json` + namespaces backend-only : `flash.json`, `marketing.json`, `validator.json`
- Le middleware Inertia exclut les namespaces `flash`, `marketing`, `validator` et passe tout le reste dans `appT`
- Interpolation ICU : `t('clé', { count: String(n) })` — les valeurs doivent être des strings
- Pas de ternaire inline `locale === 'fr' ? '...' : '...'` — utiliser `t()` à la place
- Toute PR qui ajoute un composant ou une page doit ajouter les clés correspondantes dans les **deux locales** (`en` et `fr`)

#### Tutoiement / vouvoiement (FR)

- **Marketing (`marketing.json`, pages publiques `home`, `pricing`, `about`, `contact`, `guide`…) : tutoiement.** Le site s'adresse au visiteur en "tu" du hero à la FAQ, y compris dans les questions/réponses qui s'adressent au lecteur.
- **App (tous les autres namespaces, y compris `auth.json` — login/signup/reset) : vouvoiement.** Dès qu'un écran fait partie du produit connecté (ou de son entrée, comme l'auth), on vouvoie.
- **Exception légale** : la section `privacy` de `marketing.json` (politique de confidentialité RGPD) reste en vouvoiement — convention standard pour un texte légal/contractuel, même sur un site au ton tutoiement.
- Une question de FAQ écrite à la voix du visiteur qui s'adresse à l'équipe FleetAi (ex. « vous avez un programme partenaire ? ») peut rester en "vous" : ce "vous" désigne l'entreprise, pas le lecteur — ce n'est pas une entorse à la règle.
- Ne jamais mélanger tu/vous dans une même page ou un même namespace.

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
  types/           # Types des controllers/services — un fichier par domaine (port.ts, boat.ts…)
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
- **Définir des types de controllers/services ailleurs que dans `shared/types/`** (→ un fichier par domaine dans `shared/types/`, réutilisé côté front)
- **Définir des classes d'erreur inline dans un controller ou service** (→ `app/exceptions/<domaine>_errors.ts`)
- **Écrire du texte visible en dur dans un template Vue** (→ utiliser `t('clé')`)
- **Utiliser des ternaires `locale === 'fr' ? ... : ...`** (→ utiliser `t()` avec clé dans les deux JSON)
- **`fetch` / `axios` + JSON + CSRF manuel dans `inertia/**`** pour des mutations déjà couvertes par une page Inertia (→ `router.patch`/`useForm`/`<Form>`+`response.redirect().back()` côté contrôleur)
- **`response.json({ ok: true })` sur des routes appelées depuis l’UI Inertia** (→ redirection ; réserver le JSON aux vraies routes API)
- **Ancre `<a href="...">` pour une navigation interne** (→ `<Link>` d'Inertia ; `<a>` seulement pour liens externes/`mailto:`/`tel:`)
