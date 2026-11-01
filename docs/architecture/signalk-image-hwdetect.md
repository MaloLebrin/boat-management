# `fleetai-hwdetect` et page locale « Technicien » — spécification pour le dépôt image (#1039)

Brief destiné à la session qui construit `MaloLebrin/signalk-fleetai-image` (#1032 partie C). Le code décrit ici **vit dans ce dépôt-là** ; FleetAi (`boat-management`) ne livre que cette spécification, le contrat du fichier d'état et la documentation utilisateur. Contexte : épopée #1044, `docs/architecture/fleetai-box-product.md`, `signalk-image-spike.md` §5–§7, protocole `signalk-image-test-protocol.md` (T6, T8).

Légende : **[D]** déduit de la documentation, **[M]** à mesurer sur matériel (T8) — aucune valeur marquée [M] ne doit être figée dans le code avant relevé.

## 1. Décision : langage des outils de l'image

**Recommandation : shell + Python 3 (bibliothèque standard seule, aucun `pip`).** Rust est écarté pour la v1 et à rouvrir si la page locale doit être durcie.

| Critère                        | Shell + Python                                                          | Binaire Rust unique                                                 |
| ------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Temps de démarrage             | ≈ 50–150 ms par lancement Python [M], sans importance (service long)    | Négligeable                                                         |
| Taille de l'image              | `python3` est déjà dans Pi OS Lite [D] : 0 octet ajouté                 | +2–5 Mo, mais chaîne de cross-compilation aarch64 à maintenir en CI |
| Contribution                   | Lisible par un électronicien ou un plaisancier bricoleur                | Barrière nettement plus haute                                       |
| Débogage sur un Pi sans outils | Le script se lit et se corrige sur la carte (partition racine montable) | Binaire opaque : il faut reconstruire l'image                       |
| Lecture seule (#1040)          | Écrit uniquement dans `/var/lib/fleetai` (partition de données)         | Idem                                                                |
| Surface d'attaque              | Plus large (interpréteur), mais service sans shell et actions bornées   | Plus étroite                                                        |

Garde-fous qui rendent le choix acceptable : `shellcheck` + `ruff` + `mypy --strict` en CI, **zéro dépendance tierce** (le serveur de la page locale reposera sur `http.server`/`ThreadingHTTPServer`, `hmac`, `zipfile`, `json`), tests `pytest` sur des enregistrements. Le détecteur de débit est un module pur (entrée : octets, sortie : verdict) pour pouvoir être porté en Rust sans toucher au reste. Le résultat remonte **dans tous les cas** au plugin JS par le fichier d'état (§3). **Décision finale à confirmer par Malo** avant de commencer le dépôt image.

## 2. Détection

Principe commun : `fleetai-hwdetect` **propose et journalise** ; il est idempotent (relançable à tout moment, même résultat), écrit dans `journald` (`fleetai-hwdetect[pid]: …`, jamais de secret) et **ne modifie jamais une connexion Signal K créée à la main**. Une connexion générée porte un marqueur `"fleetaiManaged": true` dans `settings.json` ; toute connexion sans ce marqueur est intouchable (ni modifiée, ni supprimée, ni dupliquée : si une connexion manuelle utilise déjà le même port, la détection se contente de le signaler `already_configured`).

### 2.1 PICAN-M (CAN sur SPI)

- `config.txt` livré avec `dtparam=spi=on` et `dtoverlay=mcp2515-can0,oscillator=16000000,interrupt=25` [D — à relire chez le fabricant, T8]. Pi 4 uniquement (alimentation SMPS 3 A).
- Unité systemd `fleetai-can0.service` : `ip link set can0 up type can bitrate 250000` (échec toléré sans carte).
- Détection : l'interface `can0` existe (`ip -j link show can0`) **et** au moins une trame est reçue en 30 s (`/sys/class/net/can0/statistics/rx_packets` croissant, sans ouvrir de socket qui concurrencerait Signal K). États : `absent` (pas d'interface), `no_traffic` (interface sans trame : bus éteint ou débranché), `ok`.
- **À mesurer (T8) sans carte** : comportement du noyau avec l'overlay actif et pas de MCP2515 (échec silencieux ? message `dmesg` ? démarrage ralenti ?). Si l'échec pose problème, l'overlay passe en option de la page technicien (§4) au lieu d'être actif par défaut.
- Connexion Signal K générée : `canbus` / `socketcan` sur `can0`, marquée `fleetaiManaged`.

### 2.2 Passerelles USB NMEA 2000

- Règles udev par `idVendor:idProduct` (table dans le dépôt image, `hwdetect/usb_gateways.json`, un enregistrement par modèle : `{ "vid", "pid", "model", "canboatType" }`). Actisense NGT-1 / NGX-1 et Digital Yacht iKonvert : **VID:PID à relever sur exemplaire [M, T8]**, rien n'est inventé dans la spec.
- La règle crée le lien stable `/dev/fleetai-n2k` et lance `fleetai-hwdetect@<devnode>.service` (via `ENV{SYSTEMD_WANTS}`, jamais de traitement long dans `RUN+=`).
- Génération de la connexion : `pipedProviders` avec le type canboatjs correspondant (`ngt-1-canboatjs`, `ikonvert-canboatjs`, `ngx-1…` selon la table) sur `/dev/fleetai-n2k`. Signal K est **arrêté** pendant l'écriture de `settings.json` (écriture atomique : fichier temporaire + `rename`), puis redémarré. Un seul redémarrage par branchement ; anti-rebond de 5 s.
- Ajouter un modèle = ajouter une ligne dans `usb_gateways.json` + un enregistrement de test (documenté dans le README du dépôt image).

### 2.3 USB-série NMEA 0183

- Déclencheur : apparition d'un `/dev/ttyUSB*` (ou `ttyACM*`) **dont le VID:PID n'est pas dans la table 2.2**.
- Essai à **4800 puis 38400 bauds, 3 s chacun** (8N1). Au cours de la fenêtre, on lit les octets bruts et on appelle `classify(buffer)` :
  - phrase `$XXYYY,…*HH` ou `!AIVDM/!AIVDO,…*HH` complète, terminée par CR/LF ;
  - somme de contrôle XOR des octets entre `$`/`!` et `*` égale à `HH` ;
  - **au moins 2 phrases valides** (une seule peut être du bruit qui colle par hasard) → verdict `locked` avec le débit.
- Verdicts : `locked` (débit retenu), `no_frames` (« port série sans trame », affiché sur la page locale), `noise` (octets reçus mais aucune phrase valide, souvent un mauvais débit ou une mauvaise polarité). Aucun essai plus long que 2 × 3 s ; un port `noise` ou `no_frames` est relancé au prochain branchement ou sur action technicien (§4), jamais en boucle.
- Connexion générée : source NMEA 0183 série au débit retenu, `fleetaiManaged: true`.
- Cas limites à couvrir par les tests : phrases tronquées au début de la fenêtre, mélange 0183 + AIS à 38400, port ouvert par un autre processus (verdict `busy`, rien d'écrit).
- **Tests unitaires (CI)** : enregistrements binaires de 4800, 38400 et de bruit pur dans `tests/fixtures/`, une fixture par cas limite ci-dessus. Aucun test ne dépend de matériel.

## 3. Contrat du fichier d'état

`/var/lib/fleetai/hardware.json`, propriétaire `fleetai-hwdetect`, mode `0644`, **écrit atomiquement** (temporaire + `rename`), jamais de secret (ni mot de passe, ni jeton, ni numéro de série d'appareil). Lu par la page locale et par le plugin `signalk-fleetai` (champ `hardware` du statut, remonté avec l'inventaire #1036 — le plugin le transmet tel quel ; le contrat de l'API n'est pas modifié par cette issue).

```json
{
  "version": 1,
  "updatedAt": "2026-11-01T10:15:30Z",
  "can": {
    "state": "ok",
    "interface": "can0",
    "bitrate": 250000,
    "overlayEnabled": true,
    "lastFrameAt": "2026-11-01T10:15:29Z"
  },
  "gateways": [
    {
      "id": "usb-ngx1-1",
      "kind": "ngx-1",
      "path": "/dev/fleetai-n2k",
      "state": "ok",
      "managed": true
    }
  ],
  "serialPorts": [
    {
      "id": "ttyUSB0",
      "path": "/dev/ttyUSB0",
      "state": "locked",
      "baud": 4800,
      "protocol": "nmea0183",
      "managed": true,
      "forcedBaud": false
    }
  ],
  "lastError": null
}
```

- `can.state` : `absent | no_traffic | ok | disabled` ; `gateways[].state` : `ok | no_signalk | error | already_configured` ; `serialPorts[].state` : `locked | no_frames | noise | busy | already_configured`.
- `version` s'incrémente à toute rupture ; le plugin et la page ignorent les champs inconnus. Fichier absent ou illisible = « détection indisponible », jamais une erreur bloquante.
- Valeurs de `kind` / `protocol` : listes fermées maintenues dans le dépôt image et recopiées dans le brief du plugin (`signalk-fleetai-plugin-brief.md`) à la livraison.

## 4. Page locale `http://fleetai.local` — onglet Technicien

Étend la page du spike (§5 : état réseau, Wi-Fi, code d'appairage). L'onglet **Technicien** n'apparaît qu'après authentification.

- **Authentification** : mot de passe admin généré au premier démarrage (spike §6), comparé en temps constant (`hmac.compare_digest`), jeton de session en cookie `HttpOnly; SameSite=Strict`, durée courte (30 min), **limite d'essais** (5 échecs → blocage 5 min par IP). Le mot de passe n'est **jamais** affiché sur la page (visible de tout le réseau).
- **Affichage** : ports détectés et débit, état CAN, passerelles, **20 dernières trames brutes** en direct (rafraîchissement par `EventSource`, trames tronquées à 120 caractères, filtrées des champs sensibles), journal (200 dernières lignes `journalctl -u fleetai-hwdetect -u signalk`).
- **Actions bornées** (liste fermée, `POST` + jeton anti-CSRF, une route par action, aucune entrée libre sauf un identifiant de port validé contre la liste détectée) :
  1. activer / désactiver l'overlay CAN (modifie `config.txt` sur la partition de démarrage, redémarrage proposé et **confirmé** par le technicien) ;
  2. forcer un débit sur un port détecté (liste fermée : 4800, 9600, 19200, 38400, 115200) ou relancer la détection ;
  3. redémarrer Signal K (`systemctl restart signalk`) ;
  4. exporter le diagnostic.
- **Aucun shell, aucun champ de commande, aucune lecture de fichier arbitraire.** Les actions passent par un petit exécutant privilégié (socket Unix ou `sudoers` sur trois commandes exactes), jamais par l'exécution d'une chaîne reçue du navigateur.
- **Export de diagnostic** (`fleetai-diagnostic-<date>.zip`), à joindre au rapport #1038 : `hardware.json`, `settings.json` **sans secrets** (liste blanche de clés : on copie ce qui est autorisé, on ne retire pas ce qui est interdit ; jetons, mots de passe, `security`, `accessRequests`, clés TLS exclus), 200 dernières trames, version de l'image et du plugin, dernières lignes du journal. Test obligatoire : un `settings.json` contenant des secrets factices n'en laisse passer **aucun** dans le zip.
- **Mobile** : lisible sur iPhone et Android (cibles tactiles ≥ 44 px, pas de survol, pas de scroll horizontal) — vérifié en T8.
- Textes de la page locale : le dépôt image tient ses propres chaînes (FR et EN, vouvoiement), indépendantes de `resources/lang/` de ce dépôt.

## 5. Tests et critères d'acceptation (côté image)

- CI : `shellcheck`, `ruff`, `mypy --strict`, `pytest` (détecteur de débit sur enregistrements 4800 / 38400 / bruit ; génération de `settings.json` idempotente et respectueuse des connexions manuelles ; export sans secret ; limite d'essais d'authentification).
- Matériel (T8 étendu, `signalk-image-test-protocol.md`) : PICAN-M avec **et sans** carte, NGX-1, iKonvert, USB-série 4800 et 38400, branchement à chaud, redémarrage ; page technicien sur iPhone et Android.
- Acceptation : un technicien règle un port série et exporte un diagnostic **sans terminal** ; aucune connexion manuelle n'est modifiée ; aucun secret n'apparaît dans la page, le journal ni le zip.

## 6. Ce que cette issue ne fait pas

Aucun changement de l'API FleetAi (le champ `hardware` du statut est transmis par le plugin dans l'inventaire de #1036, session parallèle), pas de gestion de flotte, pas de mise à jour à distance, pas de 4G.
