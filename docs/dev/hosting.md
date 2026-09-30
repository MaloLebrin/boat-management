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

| Variable            | Valeur                        | Pourquoi                                                                                                      |
| ------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`          | `production`                  | Active les optimisations et désactive les routes `/dev/*`                                                     |
| `HOST`              | `0.0.0.0`                     | Écoute sur toutes les interfaces (forcé par le compose)                                                       |
| `APP_URL`           | `https://<domaine>`           | URLs absolues des mails, PDFs, SEO/JSON-LD                                                                    |
| `TRUST_PROXY`       | vide (défaut) en self-host    | Proxies dont l'app croit `X-Forwarded-*` — **sans elle, la limitation de débit par IP est inopérante** (#844) |
| `DB_HOST`           | `postgres` en compose         | Nom du service Postgres (forcé par le compose)                                                                |
| `APP_KEY`           | secret 32 octets              | `node ace generate:key`                                                                                       |
| `ENCRYPTION_KEY`    | secret 32 octets, ≠ `APP_KEY` | Chiffrement au repos des clés BYOK (#786) : `openssl rand -base64 32` — voir `docs/dev/encryption-keys.md`    |
| `QUEUE_DRIVER`      | `database`                    | Les workers lisent la file en base                                                                            |
| `VAPID_PUBLIC_KEY`  | clé publique                  | Web Push — **obligatoire en production** (#865)                                                               |
| `VAPID_PRIVATE_KEY` | secret                        | Paire de `VAPID_PUBLIC_KEY`. Sans les deux, le push est désactivé                                             |
| `VAPID_SUBJECT`     | `mailto:…` (optionnel)        | Contact VAPID. Défaut : `mailto:` + `MAIL_FROM_ADDRESS`                                                       |

### Pool Postgres et timeouts de session (#854)

`config/database.ts` pose explicitement le pool Knex et des timeouts de session
sur chaque connexion :

| Variable                            | Défaut  | Rôle                                           |
| ----------------------------------- | ------- | ---------------------------------------------- |
| `DB_POOL_MAX`                       | `10`    | Connexions max par processus Node              |
| `DB_STATEMENT_TIMEOUT_MS`           | `30000` | Coupe une requête trop longue (`0` = illimité) |
| `DB_IDLE_IN_TRANSACTION_TIMEOUT_MS` | `60000` | Coupe une transaction idle (`0` = illimité)    |
| `DB_SSL`                            | `false` | Active SSL (Postgres managé)                   |
| `DB_SSL_REJECT_UNAUTHORIZED`        | `true`  | Vérifie la CA du serveur                       |

**Dimensionnement.** Trois processus (`web`, `worker`, `worker-ai`) ×
`DB_POOL_MAX` (10) = **30** connexions, sous les 100 de Postgres par défaut.
La marge couvre `pg_dump` (service `backup`), le `migrator` one-shot et un
client admin. Monter le pool impose de monter `max_connections` côté Postgres
(ou de baisser `DB_POOL_MAX` sur un des process).

Dans `docker-compose.prod.yml`, les workers ont des timeouts plus longs
(statement 5 min, idle 2 min) pour les imports/exports ; le `migrator` pose
`DB_STATEMENT_TIMEOUT_MS=0` pour ne pas tuer un DDL long. Le `web` garde
30 s / 60 s.

### Proxy de confiance et IP du visiteur (#844)

Toute la limitation de débit par IP (`start/limiter.ts` : login, inscription,
mot de passe oublié, IA publique, contact…) repose sur `request.ip()`. Derrière
un reverse proxy, cette IP n'est juste que si l'app **croit** l'en-tête
`X-Forwarded-For` posé par ce proxy — c'est le rôle de `trustProxy`
(`config/app.ts`), piloté par `TRUST_PROXY`.

Le défaut d'AdonisJS ne fait confiance qu'au loopback. Or Caddy joint `web` par
le réseau Docker, depuis une IP privée : `request.ip()` rendait l'IP du
conteneur Caddy pour tout le monde, et chaque compteur par IP devenait global à
la plateforme (5 inscriptions par heure pour tous les visiteurs, 10 tentatives
de connexion par minute pour tous les comptes). Les journaux et le journal
d'audit enregistraient la même IP fausse.

| Cible                                                                 | `TRUST_PROXY`                                                                |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Self-host (`docker-compose.prod.yml` + Caddy)                         | vide — défaut `loopback, uniquelocal`                                        |
| Fly.io, Railway, Render, Koyeb                                        | vide — leurs proxies joignent l'app depuis un réseau privé (10/8, fc00::/7…) |
| Proxy sur une IP publique (load balancer cloud, Cloudflare en direct) | ses IP/CIDR, ex. `loopback, 203.0.113.0/24`                                  |
| App exposée directement, sans proxy                                   | `false`                                                                      |

`uniquelocal` couvre 10/8, 172.16/12, 192.168/16 et fc00::/7 : il ne fait pas
confiance à Internet. Un client ne peut forger son IP que s'il se connecte déjà
depuis un réseau privé du serveur. `true` fait confiance à **tout** le monde et
ne se justifie jamais en production. Une entrée invalide empêche le boot.

Côté Caddy, `reverse_proxy` pose `X-Forwarded-For`, `-Proto` et `-Host` par
défaut et remplace ceux qu'envoie le client (voir le commentaire du
`Caddyfile`). `tests/unit/config/trust_proxy.spec.ts` rejoue la topologie de
production (connexion depuis 172.18.0.x) : les tests fonctionnels ne le peuvent
pas, le client Japa se connecte toujours depuis le loopback.

### Secrets et journaux (#769)

Toute variable dont le nom contient `KEY`, `SECRET`, `PASSWORD`, `TOKEN` ou
`CREDENTIAL` est déclarée en `Env.schema.secret` — le type qui masque la valeur
dès qu'elle est sérialisée ou journalisée. Deux exceptions, publiques par
conception puisqu'elles partent dans le navigateur : `STRIPE_PUBLIC_KEY` et
`VAPID_PUBLIC_KEY`. Une valeur `Secret` se lit par `.release()`.

`config/logger.ts` déclare en plus une liste `redact` (`[redacted]`). C'est un
filet **indépendant** du typage : `Env.schema.secret` protège ce qu'on lit
depuis `env`, `redact` protège ce qui transite par le logger quel qu'en soit
l'émetteur — un `logger.error({ err, config })`, une erreur `pg` ou
`nodemailer` qui embarque sa configuration de connexion, un `logger.info({ req })`
qui traîne un en-tête `Cookie`.

`tests/unit/config/secrets_and_redaction.spec.ts` tient les deux règles : c'est
lui qui empêchera la prochaine variable d'être ajoutée sans protection.

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
cp .env.example .env      # puis remplir APP_KEY, ENCRYPTION_KEY, DB_*, APP_DOMAIN, LETSENCRYPT_EMAIL…
docker compose -f docker-compose.prod.yml up -d
```

Les services :

| Service     | Rôle                                                                       |
| ----------- | -------------------------------------------------------------------------- |
| `postgres`  | `postgres:18-alpine`, volume `pg_data`, healthcheck `pg_isready`           |
| `migrator`  | One-shot `migration:run --force` + seeders de catalogue, bloque le reste   |
| `web`       | `node bin/server.js`, healthcheck sur `/up`, exposé au seul réseau Compose |
| `worker`    | `queue:work --queue=default,emails,media,exports,push`                     |
| `worker-ai` | `queue:work --queue=ai`, isolé (jobs Mistral longs)                        |
| `backup`    | Dump quotidien de la base, rotation 7 j / 4 sem. / 6 mois (#847)           |
| `caddy`     | HTTPS automatique (Let's Encrypt), reverse proxy vers `web`                |

### Sauvegardes

Le service `backup` écrit ses dumps dans le volume `pg_backups`, **sur la même
machine** que la base. Un déploiement self-host n'est complet qu'avec une copie
de ces dumps hors de la machine. La procédure est dans
[`docs/dev/runbook.md`](runbook.md) : copie hors site, alertes d'échec,
restauration, test trimestriel.

### Pourquoi deux workers, et pas `pnpm queue:work`

Les jobs de `app/jobs/` sont répartis sur **6 queues** : `default`, `emails`,
`ai`, `media`, `exports`, `push`. Or `node ace queue:work` sans `--queue` ne
traite que `default` — lancé tel quel en production, **aucun mail, média,
export ni notification push ne part jamais**. Le service `worker` couvre donc
explicitement les cinq queues courtes, et `worker-ai` isole la queue `ai` dont
les jobs durent des dizaines de secondes. La queue `maintenance` n'existe plus :
elle ne servait que le stub `ProcessBoatMaintenanceImport`, retiré (#862).

Ajouter un job sur une nouvelle queue ⇒ ajouter cette queue au `--queue=` du
service `worker`.

### Une seule instance `web`

**Choix volontaire** : `config/transmit.ts` garde `transport: null` — les
événements SSE ne sont diffusés qu'aux clients connectés **à ce processus**.
Avec deux réplicas `web`, une notification émise par l'un n'atteint pas les
navigateurs connectés à l'autre. **Ne pas scaler `web`** tant qu'un transport
partagé (Redis) n'est pas configuré — hors périmètre pour l'instant. Les
workers, eux, se scalent librement.

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
  `queue:work --queue=default,emails,media,exports,push,ai`, en
  acceptant que les jobs IA retardent les mails ;
- **Postgres** : managé par la plateforme, `DB_*` fournis par elle. Activez
  ses sauvegardes et vérifiez leur rétention
  ([`docs/dev/runbook.md`](runbook.md) § 3). Posez `DB_SSL=true` si le
  Postgres managé l'exige ; `DB_SSL_REJECT_UNAUTHORIZED=false` seulement si
  la CA n'est pas dans le trust store de l'image ;
- **Une seule instance web** (choix volontaire — voir ci-dessus).

## 6. Healthcheck `/up`

`GET /up` (route publique, `start/routes/health.ts`) exécute un `select 1` et
répond :

```json
{ "status": "ok", "checks": { "database": "ok", "vapid": "ok" } }
```

200 si la base répond, **503** sinon — `checks.database` passe à `"error"`.
`checks.vapid` vaut `"ok"` ou `"missing"` (#865). Une valeur `"missing"` ne
change pas le statut : l'app sert le trafic, le Web Push est désactivé, et un
503 recyclerait le conteneur. En production le premier `/up` dans cet état
écrit un warning. Les clés sont **obligatoires en production** (tableau § 2) ;
elles restent absentes du schéma de boot pour que test, CI et local démarrent.
Générer une paire : `npx web-push generate-vapid-keys`.

La route est hors authentification, hors throttle, et exclue du
service worker (`inertia/sw.ts`), donc utilisable directement comme probe
Docker/PaaS :

```bash
curl -f https://<domaine>/up
```

## 7. Mode maintenance (#864)

Deux bascules, l'une ou l'autre suffit. Le middleware
(`app/middleware/maintenance_mode_middleware.ts`) est le **premier** du
routeur, avant le body parser et la session : la page ne lit pas la base.
C'est un HTML statique (les deux langues, style de `public/offline.html`),
statut **503**, en-tête `Retry-After: 300`.

| Bascule                   | Effet               | Redémarrage |
| ------------------------- | ------------------- | ----------- |
| `MAINTENANCE_MODE=true`   | lu au boot          | oui         |
| fichier `tmp/maintenance` | lu à chaque requête | non         |

`/up` **n'est pas** concerné. Pendant une maintenance planifiée la probe reste
verte, et la plateforme ne recycle pas le process. Si Postgres est tombé,
`/up` répond déjà 503 de lui-même : on ne masque pas cet état.

Self-host, bascule immédiate (le process tourne sous `adonisjs`, `tmp/` est
`/app/tmp`) :

```bash
docker compose -f docker-compose.prod.yml exec web touch tmp/maintenance
# … migration, incident …
docker compose -f docker-compose.prod.yml exec web rm tmp/maintenance
```

Sur un PaaS, préférez `MAINTENANCE_MODE=true` puis un redéploiement, ou le
même fichier si le disque du process est accessible. Retirez la variable (ou
passez-la à `false`) et redéployez pour rouvrir.

## 8. Dépendances système

Ghostscript est installé dans l'image (compression des PDFs uploadés, voir
`app/services/pdf_service.ts`). Sans lui, le PDF original part sans compression
— warning loggé, pas de crash.

Le `Dockerfile` pose un **plancher de version** (`ghostscript>=10.03`) plutôt
que de prendre ce que sert le dépôt Alpine au jour du build : la version
déployée doit être une décision. Un numéro exact n'est volontairement pas
épinglé — il casserait le build au premier retrait du paquet de l'index.

L'appel est borné (#772) : `timeout` de 30 s avec `killSignal: 'SIGKILL'`,
`maxBuffer` à 8 Mo, `-dSAFER` explicite et `-f` avant le chemin d'entrée.
Ghostscript tourne sur un fichier intégralement fourni par l'utilisateur, et
le worker de queue a une concurrence de 5 : sans limite de temps, quelques
PDFs coûteux bloquaient toute la file (e-mails et notifications compris). Un
dépassement lève `PdfCompressionTimeoutError`, retombe sur le PDF non
compressé et se journalise avec `reason: 'pdf_compression_timeout'` — un pic
de timeouts est un signal d'abus, à distinguer des échecs de compression
ordinaires.

## Voir aussi

- `docs/dev/runbook.md` — sauvegardes, restauration, test de restauration
- `docs/dev/setup.md` — environnement local
- `docs/dev/cloudinary.md`, `docs/dev/stripe.md` — services tiers
