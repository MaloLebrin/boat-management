# Brancher les instruments de bord (Signal K)

Mode d'emploi pour relier le serveur **Signal K** de ton bateau à FleetAi. Il faut un plan **Pro** ou **Entreprise** et un rôle d'administrateur pour brancher le serveur. Le fonctionnement et le contrat technique sont décrits dans [`docs/domain/instruments.md`](../domain/instruments.md).

## Ce dont tu as besoin

- Un **serveur Signal K** à bord (OpenPlotter sur Raspberry Pi, Victron Cerbo GX avec Signal K, ou une passerelle compatible), relié à ton réseau NMEA 2000 ou NMEA 0183.
- Un téléphone ou une tablette sur le **Wi-Fi du bateau**, avec FleetAi ouvert (ou installé sur l'écran d'accueil).
- Une **adresse sécurisée** pour ce serveur (voir l'étape 2).

FleetAi ne fait que **lire** : aucune commande n'est envoyée au bateau.

## 1. Activer la sécurité de Signal K et créer un compte en lecture seule

1. Dans l'interface d'administration de Signal K, ouvre **Security** et active la sécurité si elle ne l'est pas.
2. Crée un utilisateur dédié, avec la permission **Read only** : FleetAi n'a pas besoin d'écrire.
3. Génère un **jeton** pour cet utilisateur. L'emplacement exact dépend de ta version de Signal K ; en cas de doute, la documentation de Signal K décrit l'authentification par jeton.

Un serveur dont la sécurité est active mais sans compte répond « non autorisé » : FleetAi s'arrête alors sur une erreur d'autorisation au lieu d'afficher des jauges vides.

## 2. Donner au serveur une adresse en HTTPS

FleetAi est servi en HTTPS, et un navigateur refuse de lire un serveur Signal K en `http://` ou `ws://` depuis une page HTTPS. Trois situations :

| Situation                                                                                                                        | Chrome / Android, ordinateur                                                               | iPhone                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| **Nom de domaine + certificat de confiance** (par exemple Let's Encrypt, nom qui pointe vers l'IP du bateau sur le réseau local) | fonctionne                                                                                 | fonctionne, sans manipulation sur l'appareil                                                              |
| **Certificat auto-signé** de Signal K (SSL activé, port 3443)                                                                    | fonctionne après avoir ouvert une fois `https://<adresse>:3443` et accepté l'avertissement | **non validé** : iOS est plus strict, le profil de certificat doit être installé et approuvé sur l'iPhone |
| **`http://` sans TLS**                                                                                                           | bloqué                                                                                     | bloqué                                                                                                    |

Le chemin le plus simple et le plus fiable est le premier. Certaines distributions (par exemple OpenPlotter avec Caddy) le proposent déjà.

> **À savoir.** La configuration iPhone avec certificat auto-signé n'a pas encore été mesurée sur appareil par l'équipe : ne pars pas de l'hypothèse qu'elle fonctionne. Si tu dépends d'un iPhone à bord, privilégie le nom de domaine avec certificat de confiance.

## 3. Brancher le serveur dans FleetAi

1. Ouvre la fiche du bateau, onglet **Instruments**.
2. Renseigne l'**adresse du serveur** (par exemple `https://signalk.mon-bateau.example:3443`), le **jeton** de lecture, puis enregistre. Le jeton est chiffré et ne se relit plus ensuite.
3. Active la source. Avec l'écran ouvert sur le Wi-Fi du bord, les jauges s'affichent en direct.

Seuls l'administrateur peut brancher, désactiver ou retirer la source. Un membre qui peut modifier le bateau envoie les relevés tant que l'écran est ouvert ; un lecteur voit les dernières valeurs connues.

## 4. Relier un moteur à ses heures

Dans la fiche du moteur, renseigne l'**identifiant instruments** (le segment qui suit `propulsion.` dans Signal K, par exemple `port` ou `main`). Les heures du moteur avancent ensuite d'une heure entière à la fois, à partir des relevés, et les échéances d'entretien suivent.

## 5. Alertes

Des règles prêtes à l'emploi (batterie sous 20 %, température moteur élevée, petits fonds, alarmes Signal K) sont actives. Un administrateur peut en ajouter pour n'importe quelle mesure numérique, avec un seuil et une marge de retour. Toute l'équipe est prévenue à l'ouverture d'une alerte.

## Alternative sans navigateur : le plugin

Un plugin installé sur le serveur Signal K peut envoyer lui-même les relevés. L'administrateur génère un **jeton d'ingestion** depuis la carte « Plugin Signal K » de l'onglet Instruments : il n'est affiché qu'**une seule fois**, FleetAi n'en garde que l'empreinte, et on peut le régénérer ou le révoquer à tout moment. Le plugin lui-même (`signalk-fleetai`, [code source](https://github.com/MaloLebrin/signalk-fleetai)) est maintenu hors de ce dépôt ; le contrat de l'API est dans `docs/domain/instruments.md`. Il lit seulement : il n'écrit jamais dans Signal K, n'envoie que les chemins du catalogue FleetAi, garde les lots sur disque tant que le bord n'a pas Internet et les rejoue dans l'ordre. Son état se lit dans l'admin Signal K (_Plugin Config_ → FleetAi) : « Last batch accepted … ago », « Waiting for network (N batches) », ou « Token rejected » si le jeton a été régénéré ou révoqué — il faut alors coller le nouveau jeton et réactiver le plugin.

**Installation en une commande.** Depuis un terminal du Raspberry (OpenPlotter) ou de tout serveur Signal K sous Linux, avec l'utilisateur qui fait tourner Signal K (pas en root) :

```bash
curl -fsSL https://fleetai.app/install/signalk-plugin.sh | FLEETAI_TOKEN=fai_ing_… bash
```

Remplace `fai_ing_…` par ton jeton. Le script vérifie Node, npm et `signalk-server`, installe le plugin dans le dossier de configuration (`~/.signalk` ou `$SIGNALK_NODE_CONFIG_DIR`), écrit sa configuration (sans jamais afficher le jeton) puis redémarre Signal K s'il tourne comme service. Il peut être relancé sans risque : tes réglages (par exemple la période d'envoi) sont conservés. Il **n'installe pas Signal K** : s'il est absent, il t'oriente vers l'installateur officiel ou l'image OpenPlotter.

**Alternative sans terminal.** Dans l'admin Signal K, _Appstore_ → cherche `signalk-fleetai` → _Install_, redémarre le serveur, puis _Plugin Config_ → FleetAi : colle l'adresse d'ingestion et le jeton.

## Problèmes fréquents

| Symptôme                                                      | Cause probable                                                                                                                                                                                                       |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| « Serveur injoignable »                                       | le téléphone n'est pas sur le Wi-Fi du bateau, ou l'adresse est fausse                                                                                                                                               |
| « Le navigateur bloque les adresses http:// » (contenu mixte) | l'adresse du serveur commence par `http://` alors que FleetAi est en HTTPS : utilise une adresse `https://` (section 2) ou laisse le plugin envoyer les données (le bandeau indique alors « Lecture par le plugin ») |
| « Non autorisé »                                              | jeton absent, expiré, ou compte sans lecture                                                                                                                                                                         |
| Erreur de certificat                                          | certificat auto-signé non accepté sur cet appareil, ou nom de domaine qui ne correspond pas                                                                                                                          |
| Jauges figées avec « périmé »                                 | plus de nouvelles valeurs depuis plus de deux minutes : écran verrouillé, serveur éteint ou hors de portée                                                                                                           |
| Aucune valeur dans l'historique                               | l'écran est resté fermé : l'acquisition ne tourne que page ouverte, ou via le plugin                                                                                                                                 |
