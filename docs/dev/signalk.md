# Serveur Signal K de développement

> Épopée « instruments de bord » : [#986](https://github.com/MaloLebrin/boat-management/issues/986) — spike [#985](https://github.com/MaloLebrin/boat-management/issues/985).
> Décisions et résultats du spike : `docs/architecture/instruments-epic-986.md`.

[Signal K](https://signalk.org) est le standard ouvert qui agrège les instruments d'un bateau (NMEA 2000, NMEA 0183, Victron, capteurs I²C…) et les expose en JSON : une API REST (`/signalk/v1/api/`) et un flux WebSocket de _deltas_ (`/signalk/v1/stream`). C'est la source retenue pour FleetAi : le client n'a jamais à parler NMEA.

## Démarrer un serveur local

Le `docker-compose.yml` expose un service `signalk` sous le profil `instruments` (il ne démarre donc pas avec `docker compose up` seul). Il rejoue en boucle une trace NMEA 0183 d'exemple fournie par le serveur : position, vitesse, cap, vent, profondeur, température de l'eau.

```bash
pnpm signalk:up
```

```bash
pnpm signalk:down
```

- Interface d'administration : <http://localhost:3000> — au premier chargement elle propose de créer un compte admin ; **ne pas le faire** pour le dev courant, sinon la sécurité s'active et l'API exige un jeton (voir plus bas).
- Découverte : `curl -s http://localhost:3000/signalk | jq`
- Instantané complet : `curl -s http://localhost:3000/signalk/v1/api/vessels/self | jq`
- Flux : `websocat 'ws://localhost:3000/signalk/v1/stream?subscribe=all'` (ou la sonde ci-dessous)
- Les données du serveur (plugins, réglages, compte admin) vivent dans le volume `3d-website_signalk_data` (nom Docker réel : `3d-website_3d-website_signalk_data`) ; le supprimer remet à zéro.
- Première fois : l'image fait 1,2 Go.

**Pourquoi le compose redéfinit `entrypoint`.** Le `startup.sh` de l'image officielle ajoute toujours `--securityenabled` : tant qu'aucun compte admin n'est créé, l'API répond 401 et le WebSocket s'ouvre mais n'émet aucun delta. Pire, ce premier démarrage écrit `"security": { "strategy": "./tokensecurity" }` dans le `settings.json` du volume, et la sécurité reste active même en relançant sans l'option. Le service lance donc le binaire directement (toujours sous `tini`), comme `npx signalk-server`. Si vous avez démarré une version antérieure du service, supprimez le volume avant de relancer.

Sans Docker :

```bash
npx signalk-server --sample-nmea0183-data
```

La trace d'exemple ne contient **ni moteur, ni batteries, ni réservoirs**. Pour ces chemins, installer depuis l'admin (Appstore) le plugin `signalk-simulator` ou brancher une trace NMEA 2000 (`--sample-n2k-data` rejoue une trace avec propulsion et électricité, mais le port 3000 doit être libre et le conteneur relancé avec cette commande).

## Tester le script d'installation du plugin

Le script servi sur `/install/signalk-plugin.sh` (#1021) se teste sans Raspberry, en dry-run (ni `npm install` ni `systemctl`) contre un dossier de configuration jetable :

```bash
export SIGNALK_NODE_CONFIG_DIR="$(mktemp -d)"
curl -fsSL http://localhost:3333/install/signalk-plugin.sh \
  | FLEETAI_DRY_RUN=1 FLEETAI_ALLOW_ROOT=1 FLEETAI_TOKEN=fai_ing_test bash
cat "$SIGNALK_NODE_CONFIG_DIR/plugin-config-data/signalk-fleetai.json"
```

Le script exige `signalk-server` dans le `PATH` : `npx signalk-server` ne suffit pas, installez-le (`npm i -g signalk-server`) ou placez un exécutable factice. Pour un test réel contre le service compose, copiez le script dans le conteneur (le volume de données est le dossier de configuration) :

```bash
pnpm signalk:up
docker compose --profile instruments cp resources/install/signalk-plugin.sh signalk:/tmp/
docker compose --profile instruments exec -e SIGNALK_NODE_CONFIG_DIR=/home/node/.signalk -e FLEETAI_ALLOW_ROOT=1 -e FLEETAI_TOKEN=fai_ing_test signalk bash /tmp/signalk-plugin.sh
```

Tant que `signalk-fleetai` (#1024) n'est pas publié sur npm, l'étape `npm install` échoue : utilisez `FLEETAI_DRY_RUN=1`. Les tests automatisés (`tests/unit/install/`) couvrent les refus et la fusion de configuration.

## La sonde `/dev/signalk-probe`

Page jetable du spike, servie par le serveur de dev hors production : <http://localhost:3333/dev/signalk-probe>. Elle est autonome (`scripts/spike/signalk_probe.html`, sans Edge ni Vite) et sert à mesurer ce qu'un navigateur laisse passer vers un serveur Signal K :

1. **Découvrir** — `GET /signalk`, affiche les endpoints annoncés et la version du serveur. En cas d'échec, retente avec l'option `targetAddressSpace` de Local Network Access (Chromium).
2. **Instantané** — `GET /signalk/v1/api/vessels/self`, aplatit l'arbre en chemins.
3. **Connecter** — WebSocket `subscribe=none` puis message d'abonnement aux chemins listés ; reconnexion exponentielle (1 s → 30 s), heartbeat 20 s, journal des fermetures (code, visibilité, réseau).
4. **Wake Lock** — maintient l'écran allumé (Screen Wake Lock API) pour observer le flux en veille.
5. **Copier le rapport** — JSON de l'environnement (protocole, contexte sécurisé, UA, mode standalone), des compteurs et de tout le journal, à coller dans le document d'épopée.

Mesures faites avec la sonde le 19 octobre 2026 (serveur d'exemple, page HTTP) : tableau « Mesures locales » du document d'épopée. En résumé : REST en 150–400 ms, WebSocket ouvert en ~100 ms, ≈ 12 deltas/s en `policy: instant`, `close 1006` sous 2 s à l'arrêt du serveur, reconnexion automatique au créneau suivant du repli, et un serveur sécurisé sans jeton qui envoie `hello` puis **rien** — d'où la règle : sonder le REST avant le WebSocket.

Les violations CSP (`securitypolicyviolation`) sont journalisées : en dev la CSP est en _report-only_, la connexion aboutit mais la violation `connect-src` apparaît — c'est ce que la PR 1 corrige par une extension de `connect-src` vers l'origine du serveur du bateau.

### Mesurer sur un vrai téléphone

L'app de dev est en HTTP : elle ne montre **pas** le problème de contenu mixte. Pour le mesurer il faut une page en HTTPS de confiance sur le téléphone, et un serveur Signal K sur le même réseau :

```bash
npx serve scripts/spike
```

puis exposer ce port en HTTPS avec un tunnel (`cloudflared tunnel --url http://localhost:3000`, `ngrok http 3000`…) et ouvrir `https://<tunnel>/signalk_probe.html` sur le téléphone. Renseigner l'IP LAN du serveur Signal K et dérouler les trois étapes ; la page journalise `SecurityError` (contenu mixte), `TypeError: Failed to fetch` (réseau, TLS refusé, CORS) et les codes de fermeture WebSocket.

## Activer TLS sur le serveur Signal K

Dans l'admin : _Server → Settings → SSL_ (ou `"ssl": true` dans `~/.signalk/settings.json`). Le serveur génère un certificat auto-signé et écoute en plus sur le port **3443** (`https://` et `wss://`). Pour un certificat de confiance, placer `ssl-key.pem` / `ssl-cert.pem` dans `~/.signalk/` (Let's Encrypt par défi DNS-01 pour un nom qui résout vers l'IP LAN).

## Sécurité et jetons

Dès qu'un compte admin existe, Signal K passe en mode sécurisé : les lectures peuvent rester publiques (réglage _Allow readonly access_) ou exiger un jeton. Deux façons d'en obtenir un :

- **Connexion** : `POST /signalk/v1/auth/login` `{ "username", "password" }` → `{ "token" }` (JWT).
- **Demande d'accès d'appareil** : `POST /signalk/v1/access/requests` `{ "clientId", "description" }` → l'admin approuve dans _Security → Access Requests_, le client récupère ensuite son jeton sur l'URL `href` renvoyée. C'est le flux prévu pour les appareils ; FleetAi le proposera après la PR 3.

Le jeton se passe en `Authorization: Bearer <jeton>` sur l'API REST et en `?token=<jeton>` sur le WebSocket (un navigateur ne peut pas poser d'en-tête sur un WebSocket).

## Unités

Signal K est intégralement en **SI** : vitesses en m/s, températures en kelvin, angles en radians, pressions en pascals, niveaux et états de charge en ratio 0–1, `propulsion.<id>.runTime` en secondes et `propulsion.<id>.revolutions` en **hertz** (× 60 pour des tr/min). La conversion est à la charge du client (`inertia/lib/signalk/units.ts` à partir de la PR 2).
