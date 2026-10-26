# Protocole de test sur Raspberry Pi réel — image / paquet FleetAi (#1032)

Objectif : remplacer les hypothèses du spike ([D] déduit, [M] à mesurer) par des faits. Chaque test a une question, une procédure, un critère de réussite et une ligne de résultat à remplir. Durée totale estimée : une demi-journée.

## Matériel

- Raspberry Pi 4 **et** Pi 5, carte microSD 16 Go minimum (deux cartes pour enchaîner sans reflasher), alimentation officielle.
- Un ordinateur macOS **et** un Windows (ou une machine virtuelle) pour lire la carte SD.
- Un iPhone et un Android pour le point d'accès de repli.
- Un routeur Wi-Fi dont on contrôle le nom et le mot de passe, et un câble Ethernet.
- Pour T8 : une carte CAN (PICAN-M) avec un vrai bus NMEA 2000, ou à défaut `vcan0` + `canplayer` avec un enregistrement `candump`.
- Compte FleetAi de test avec un bateau Pro, et la branche de l'API d'appairage (#1034) déployée en local ou en préproduction.

Noter pour chaque série : version de Raspberry Pi Imager (1.x et 2.x), version de Pi OS (Trixie, date de l'image), modèle de Pi.

## Tests

### T1 — Base : réglages de l'Imager sur l'image officielle Pi OS Lite (Trixie)

Question : le Wi-Fi, l'utilisateur et le SSH préréglés dans l'Imager 2.x sont-ils appliqués ? Sert de témoin pour tout le reste.
Procédure : flasher Pi OS Lite 64-bit depuis la liste officielle avec nom d'hôte `fleetai-test`, utilisateur, SSH et Wi-Fi renseignés. Démarrer, `ssh`, `nmcli device`.
Réussite : le Pi rejoint le Wi-Fi seul et répond sur `fleetai-test.local`.
Relever aussi le contenu de `user-data` et `network-config` sur la partition de démarrage (`/boot/firmware`).

### T2 — L'Imager permet-il de lancer une commande au premier démarrage ?

Question : y a-t-il, dans l'interface 2.x ou 1.x, un champ qui exécute une commande, ou un moyen de joindre un script ?
Procédure : parcourir tous les écrans de personnalisation des deux versions, noter chaque champ. Chercher dans le dépôt de l'Imager et sa documentation si un champ ou un fichier de réglages permet d'ajouter `runcmd`.
Réussite : réponse écrite oui/non, avec capture d'écran de chaque écran. Un « non » rend le `.deb` seul insuffisant sans étape manuelle.

### T3 — `runcmd` écrit à la main dans `user-data`

Question : si on édite `user-data` sur la carte après le flash, une commande s'exécute-t-elle au premier démarrage, et avec quel réseau disponible ?
Procédure : après T1, ajouter un `runcmd` qui écrit l'heure et le résultat de `ping -c1 deb.debian.org` dans `/var/log/fleetai-firstboot.txt` ; reflasher, démarrer.
Réussite : le fichier existe ; relever si l'Internet est déjà là à ce moment, et le délai entre mise sous tension et exécution.

### T4 — Fichier de réglages sur la partition de démarrage

Question : un fichier `fleetai.txt` (Wi-Fi) déposé sur la carte après le flash est-il lu et appliqué ?
Procédure : sur l'image de T1 **sans** Wi-Fi préréglé, ajouter une unité systemd à usage unique qui lit `/boot/firmware/fleetai.txt` et exécute `nmcli device wifi connect`. Déposer le fichier depuis macOS puis depuis Windows (éditeur par défaut : Bloc-notes, TextEdit), remettre la carte, démarrer.
Réussite : Wi-Fi joint dans les deux cas ; relever les pièges (extension `.txt.txt`, fins de ligne CRLF, guillemets typographiques, TextEdit en RTF, caractères accentués dans le mot de passe), et si le fichier est supprimé après lecture.

### T5 — Point d'accès de repli

Question : sans réseau joignable, le Pi expose-t-il `FleetAi-xxxx` et une page de saisie du Wi-Fi utilisable sur téléphone ?
Procédure : démarrer sans Wi-Fi préréglé ni câble. Depuis l'iPhone puis l'Android : se connecter au point d'accès, ouvrir la page (détection de portail captif ou `http://fleetai.local` / adresse fixe), saisir le Wi-Fi, vérifier le retour au mode normal et la disparition du point d'accès.
Réussite : parcours complet en moins de deux minutes sur les deux téléphones ; relever si la page s'ouvre toute seule, un mot de passe erroné, et le comportement du Pi 5 vs Pi 4.

### T6 — Ethernet sans réglage

Procédure : flasher l'image brute, brancher le câble, démarrer.
Réussite : adresse obtenue par DHCP et `fleetai.local` résolu depuis macOS, Windows et iOS (relever les échecs mDNS sous Windows).

### T7 — Installation par paquet sur un Pi OS Lite vierge

Question : combien de temps et de commandes pour Signal K + plugin sur une base vierge ?
Procédure : depuis T1, installer Signal K (méthode officielle) puis `signalk-fleetai` avec le script existant (#1021). Chronométrer ; redémarrer ; vérifier que tout repart seul.
Réussite : mesures arrivant dans FleetAi après redémarrage sans intervention ; durée et volume téléchargé notés (utile pour savoir si l'Internet est requis au premier démarrage).

### T8 — Bus CAN / NMEA 2000

Question : la configuration matérielle d'un kit (carte CAN, passerelle USB) peut-elle être préinstallée dans l'image ?
Procédure : activer l'overlay de la carte CAN dans `config.txt`, monter `can0` (ou `vcan0`), configurer la source dans Signal K. Rejouer un enregistrement ou brancher un vrai bus.
Réussite : chemins `propulsion.*` ou `electrical.*` visibles dans Signal K puis dans FleetAi. Noter chaque réglage nécessaire (il devra être préinstallé), et si une passerelle USB (Actisense, Yacht Devices) fonctionne sans aucun réglage.

### T9 — Appairage de bout en bout (API #1034)

Procédure : plugin en mode appairage, lancer l'appairage, saisir le code dans FleetAi, observer. Variantes : code expiré, code saisi deux fois, redémarrage du Pi pendant l'attente, perte de réseau pendant l'attente.
Réussite : jeton écrit une seule fois dans `plugin-config-data/signalk-fleetai.json`, premières mesures sous deux minutes, aucun jeton renvoyé deux fois, aucun jeton dans les journaux.

### T10 — Matrice Imager

Rejouer T1 avec Imager 1.x sur Trixie : les réglages sont-ils ignorés en silence (constat du spike) ? Noter les deux versions et le système de l'ordinateur.

## Feuille de résultats

| Test | Pi 4 | Pi 5 | Imager | Résultat | Observations |
| ---- | ---- | ---- | ------ | -------- | ------------ |
| T1   |      |      |        |          |              |
| T2   | –    | –    |        |          |              |
| T3   |      |      |        |          |              |
| T4   |      |      |        |          |              |
| T5   |      |      |        |          |              |
| T6   |      |      |        |          |              |
| T7   |      |      |        |          |              |
| T8   |      |      |        |          |              |
| T9   |      |      |        |          |              |
| T10  |      |      |        |          |              |

## Décisions que les résultats tranchent

- T2 + T3 : le `.deb` est-il un parcours sans image (une commande ou un champ de l'Imager) ou faut-il l'image ?
- T4 : le fichier sur la carte remplace-t-il l'inscription dans la liste officielle de l'Imager ?
- T5 : le point d'accès de repli suffit-il comme chemin garanti ?
- T8 : quels réglages matériels la liste de kits doit-elle préinstaller ?
- T9 : l'appairage est-il assez robuste pour supprimer la copie manuelle du jeton ?
