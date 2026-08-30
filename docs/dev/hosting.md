# Hébergement & déploiement

Comment mettre FleetAi en production, quelle que soit la cible. Deux chemins
sont supportés :

- **Self-host** (VPS, Oracle Cloud Free Tier, Hetzner…) → `docker-compose.prod.yml` + `Caddyfile` ;
- **PaaS** (Koyeb, Render, Fly.io, Railway…) → l'image GHCR + une _release command_.

## 1. L'image

`.github/workflows/docker.yml` construit et pousse
`ghcr.io/malolebrin/boat-management:latest` et `:<sha>` après chaque CI verte
sur `main`. Le `Dockerfile` est multi-stage : build complet (Vite + SSR) puis
image de runtime avec Ghostscript (compression PDF) et `node bin/server.js`
comme `CMD`.

Le build Adonis produit un `ace.js` dans `build/` : toutes les commandes
(`migration:run`, `queue:work`) s'exécutent depuis le `WORKDIR /app` de l'image.

## 2. Les variables d'environnement

`start/env.ts` **valide au boot** : une variable requise manquante empêche
l'application de démarrer. Le point de départ est toujours `.env.example`
(`cp .env.example .env`, puis remplissage) — il est tenu à jour avec `env.ts`.

À régler spécifiquement en production :

| Variable       | Valeur                | Pourquoi                                                  |
| -------------- | --------------------- | --------------------------------------------------------- |
| `NODE_ENV`     | `production`          | Active les optimisations et désactive les routes `/dev/*` |
| `HOST`         | `0.0.0.0`             | Écoute sur toutes les interfaces (forcé par le compose)   |
| `APP_URL`      | `https://<domaine>`   | URLs absolues des mails, PDFs, SEO/JSON-LD                |
| `DB_HOST`      | `postgres` en compose | Nom du service Postgres (forcé par le compose)            |
| `APP_KEY`      | secret 32 octets      | `node ace generate:key`                                   |
| `QUEUE_DRIVER` | `database`            | Les workers lisent la file en base                        |

`APP_DOMAIN`, `LETSENCRYPT_EMAIL` et `IMAGE_TAG` ne sont pas lues par
l'application : elles n'alimentent que Compose et le `Caddyfile`.

Les variables `DRIVE_DISK`, `CLOUDINARY_URL`, `VITE_MISTRAL_API_KEY` et
`VITE_AI_PROVIDER` que traînent d'anciens `.env` ne sont référencées nulle part
dans le code — ne pas les reporter dans un `.env` de production (une clé Mistral
préfixée `VITE_` finirait dans le bundle client).

## 3. Migrations au déploiement

**Elles ne sont jamais lancées par le `CMD` de l'image** : un serveur web qui
migre au boot casse dès qu'il y a plus d'un conteneur. Elles tournent comme une
étape distincte, avant le démarrage de la nouvelle version.

- **Self-host** : le service one-shot `migrator` du `docker-compose.prod.yml`.
  `web`, `worker` et `worker-ai` en dépendent via
  `depends_on: { condition: service_completed_successfully }` — ils ne démarrent
  donc qu'une fois les migrations passées, et un `migration:run` en échec fait
  échouer le déploiement (`restart: 'no'`).
- **PaaS** : configurer la _release command_ de la plateforme sur
  `pnpm migrate:prod`, qui enchaîne `node ace migration:run --force` puis les
  seeders de catalogue bateaux (#571) et moteurs (#573). `--force` est
  obligatoire : Adonis refuse sinon de migrer avec `NODE_ENV=production`.

Un déploiement sur base vierge n'a besoin d'aucune intervention manuelle :
l'intégralité des migrations s'applique, puis l'app démarre.

## 4. Self-host : `docker compose -f docker-compose.prod.yml up -d`

Sur une machine vierge, avec Docker installé :

```bash
git clone https://github.com/MaloLebrin/boat-management.git
cd boat-management
cp .env.example .env      # puis remplir APP_KEY, DB_*, APP_DOMAIN, LETSENCRYPT_EMAIL…
docker compose -f docker-compose.prod.yml up -d
```

Les services :

| Service     | Rôle                                                                       |
| ----------- | -------------------------------------------------------------------------- |
| `postgres`  | `postgres:18-alpine`, volume `pg_data`, healthcheck `pg_isready`           |
| `migrator`  | One-shot `migration:run --force` + seeders de catalogue, bloque le reste   |
| `web`       | `node bin/server.js`, healthcheck sur `/up`, exposé au seul réseau Compose |
| `worker`    | `queue:work --queue=default,emails,media,exports,maintenance,push`         |
| `worker-ai` | `queue:work --queue=ai`, isolé (jobs Mistral longs)                        |
| `caddy`     | HTTPS automatique (Let's Encrypt), reverse proxy vers `web`                |

### Pourquoi deux workers, et pas `pnpm queue:work`

Les 16 jobs de `app/jobs/` sont répartis sur **7 queues** : `default`, `emails`,
`ai`, `media`, `exports`, `maintenance`, `push`. Or `node ace queue:work` sans
`--queue` ne traite que `default` — lancé tel quel en production, **aucun mail,
média, export, import de maintenance ni notification push ne part jamais**. Le
service `worker` couvre donc explicitement les six queues courtes, et
`worker-ai` isole la queue `ai` dont les jobs durent des dizaines de secondes.

Ajouter un job sur une nouvelle queue ⇒ ajouter cette queue au `--queue=` du
service `worker`.

### Une seule instance `web`

`config/transmit.ts` utilise le transport `null` : les événements SSE ne sont
pas partagés entre processus. Avec deux réplicas `web`, une notification émise
par l'un n'atteint pas les navigateurs connectés à l'autre. **Ne pas scaler
`web`** tant qu'un transport (Redis) n'est pas configuré. Les workers, eux, se
scalent librement.

C'est aussi le conteneur `web` qui met en file les jobs planifiés :
`start/scheduler.ts` n'est préchargé que dans l'environnement `web`
(`adonisrc.ts`).

### Caddy et le SSE

Le `Caddyfile` route `/__transmit/events` dans un `handle` dédié, sans
compression, avec `flush_interval -1` et des timeouts de transport désactivés :
le ping Transmit est à 30 s (`config/transmit.ts`), un proxy qui bufferise ou
coupe à 30 s met le client en reconnexion permanente. Le reste du trafic passe
par un `reverse_proxy` compressé avec des timeouts de 5 min (uploads, exports
PDF).

## 5. PaaS

L'image GHCR fonctionne telle quelle. À configurer :

- **Health check** : `GET /up` (voir plus bas) ;
- **Release command** : `pnpm migrate:prod` (migrations + seeders de catalogue) ;
- **Process web** : `node bin/server.js` (le `CMD` par défaut) ;
- **Process workers** : deux workers séparés, mêmes commandes que le compose.
  Une plateforme qui ne permet qu'un seul process type ⇒ fusionner en
  `queue:work --queue=default,emails,media,exports,maintenance,push,ai`, en
  acceptant que les jobs IA retardent les mails ;
- **Postgres** : managé par la plateforme, `DB_*` fournis par elle ;
- **Une seule instance web** (voir ci-dessus).

## 6. Healthcheck `/up`

`GET /up` (route publique, `start/routes/health.ts`) exécute un `select 1` et
répond :

```json
{ "status": "ok", "checks": { "database": "ok" } }
```

200 si la base répond, **503** sinon — le corps garde alors la même forme avec
`"error"`. La route est hors authentification, hors throttle, et exclue du
service worker (`inertia/sw.ts`), donc utilisable directement comme probe
Docker/PaaS :

```bash
curl -f https://<domaine>/up
```

## 7. Dépendances système

Ghostscript est installé dans l'image (compression des PDFs uploadés, voir
`app/services/pdf_service.ts`). Sans lui, le PDF original part sans compression
— warning loggé, pas de crash.

## Voir aussi

- `docs/dev/setup.md` — environnement local
- `docs/dev/cloudinary.md`, `docs/dev/stripe.md` — services tiers
