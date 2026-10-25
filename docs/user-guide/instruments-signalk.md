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

Un plugin installé sur le serveur Signal K peut envoyer lui-même les relevés. L'administrateur génère un **jeton d'ingestion** depuis la carte « Plugin Signal K » de l'onglet Instruments : il n'est affiché qu'**une seule fois**, FleetAi n'en garde que l'empreinte, et on peut le régénérer ou le révoquer à tout moment. Le plugin lui-même est maintenu hors de ce dépôt ; le contrat de l'API est dans `docs/domain/instruments.md`.

## Problèmes fréquents

| Symptôme                        | Cause probable                                                                                             |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| « Serveur injoignable »         | le téléphone n'est pas sur le Wi-Fi du bateau, ou l'adresse est fausse                                     |
| « Non autorisé »                | jeton absent, expiré, ou compte sans lecture                                                               |
| Erreur de certificat            | certificat auto-signé non accepté sur cet appareil, ou nom de domaine qui ne correspond pas                |
| Jauges figées avec « périmé »   | plus de nouvelles valeurs depuis plus de deux minutes : écran verrouillé, serveur éteint ou hors de portée |
| Aucune valeur dans l'historique | l'écran est resté fermé : l'acquisition ne tourne que page ouverte, ou via le plugin                       |
