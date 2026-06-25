# FleetAI

> Gestion de flotte nautique — maintenance, planification, IA

Application SaaS multi-tenant pour les plaisanciers et gestionnaires de flotte. Suivi complet des bateaux, de leur équipement et de leur maintenance, avec analyse IA et simulateur de coûts.

---

## Fonctionnalités

### Gestion de flotte

- **Fiches bateau** complètes : coque, immatriculation, catégorie CE, HIN/WIN, francisation, pavillon, personnes max à bord
- **Moteurs** : type, heures, pièces détachées, documents attachés
- **Équipements** : voiles, gréement, armement de sécurité (gilets, radeaux, extincteurs…) avec statut et dates d'expiration
- **Médias** : photos et documents (PDFs compressés via Ghostscript) hébergés sur Cloudinary

### Maintenance

- **Historique** d'entretien avec pièces consommées et sujets liés à l'équipement
- **Tâches planifiées** : récurrence par mois ou par heures moteur, séparation ouvert / terminé
- **Fiches de maintenance** multi-items
- **Alertes email** automatiques : tâches en retard, rappels moteur et inspection bateau

### Planning & Mouillage

- Gestion des ports, pontons, spots de mouillage
- Historique de position des bateaux

### Intelligence Artificielle

- Analyse Mistral AI des données de maintenance via système de queue asynchrone
- Interface de prompt sur le tableau de bord

### Marketing & Acquisition

- **Simulateur de coûts** : estimation des frais d'entretien, comparaison anonymisée avec bateaux similaires (benchmark)
- **Séquence email** J+0 / J+3 / J+7 après capture de lead simulateur
- Pages publiques : accueil, tarifs, guide, à propos, contact

### Multi-tenant & Auth

- Organisations avec invitations et rôles (Bouncer ACL)
- Auth JWT + refresh tokens
- Reset de mot de passe par email
- Webhooks (Stripe)

### i18n

- Interface entièrement bilingue **FR / EN**
- Sélecteur de langue persisté en cookie

---

## Stack technique

| Couche          | Technologie                                |
| --------------- | ------------------------------------------ |
| Backend         | AdonisJS v7 · TypeScript strict            |
| Frontend        | Vue 3 (Composition API) · Inertia.js SSR   |
| Base de données | PostgreSQL 18 · Lucid ORM                  |
| Tests backend   | Japa (functional + unit) · SQLite          |
| Tests frontend  | Vitest · @vue/test-utils                   |
| IA              | Mistral AI · Queue PostgreSQL              |
| Emails          | @adonisjs/mail · Edge.js v6                |
| Médias          | Cloudinary · Ghostscript (compression PDF) |
| CSS             | Tailwind CSS v4                            |
| Package manager | pnpm                                       |
| Déploiement     | Docker · GitHub Actions CI/CD              |

---

## Prérequis

- **Node.js** ≥ 24
- **pnpm** ≥ 11
- **PostgreSQL** 18 (ou Docker)
- **Ghostscript** (optionnel — compression PDF) : `brew install ghostscript`

---

## Démarrage rapide

```bash
# 1. Dépendances
pnpm install

# 2. Base de données (Docker)
docker compose up -d postgres

# 3. Variables d'environnement
cp .env.example .env
# Remplir les variables : DATABASE_URL, APP_KEY, MISTRAL_KEY, CLOUDINARY_*, SMTP_*

# 4. Migrations + seed de démo
node ace migration:run
node ace db:seed

# 5. Serveur de développement (backend + frontend HMR)
pnpm dev

# 6. Worker de queue (dans un second terminal)
pnpm queue:work
```

L'application est disponible sur **http://localhost:3333**.

---

## Tests

```bash
# Démarrer la base de test
pnpm test:db:up

# Tests backend (Japa)
pnpm test

# Tests frontend (Vitest)
pnpm test:inertia

# Arrêter la base de test
pnpm test:db:down
```

---

## Build & déploiement

```bash
# Build de production
pnpm build

# Lancer le serveur compilé
pnpm start
```

Le `Dockerfile` et `docker-compose.yml` sont fournis pour le déploiement conteneurisé. Le CI/CD GitHub Actions gère le build, les tests et le déploiement automatique.

---

## Structure du projet

```
app/
  controllers/       # HTTP Controllers (délèguent aux services)
  services/          # Logique métier
  models/            # Modèles Lucid ORM
  validators/        # Schémas VineJS
  transformers/      # Formatage des données → frontend
  abilities/         # ACL Bouncer
  jobs/              # Background jobs (queue)
  events/ + listeners/
  exceptions/        # Classes d'erreur métier

inertia/
  pages/             # Pages Inertia par domaine
  components/        # Composants Vue
  composables/       # Composables Vue

shared/
  types/             # Types partagés backend ↔ frontend

start/routes/        # Routes découpées par domaine
resources/lang/      # Traductions FR / EN
database/
  migrations/
  seeders/
docs/
  changelog.md       # Journal des fonctionnalités
```

---

## Qualité du code

```bash
pnpm lint        # ESLint
pnpm format      # Prettier
pnpm typecheck   # tsc + vue-tsc
```

Les hooks Husky s'exécutent automatiquement avant chaque commit.

---

## Licence

Propriétaire — tous droits réservés.
