# 2026-09-27 — Téléchargements de documents : même seuil que la fiche qui les affiche (#846)

Les uploads et suppressions de médias passaient par le bouncer ; les quatre **téléchargements**, non. Ils authentifiaient, scopaient l'entité par organisation, puis relayaient le fichier depuis Cloudinary. À l'intérieur d'une organisation, rien ne filtrait donc par rôle :

- un `mechanic` (capabilities maintenance seules) téléchargeait le permis ou la pièce d'identité d'un client via `/clients/:id/media/:mediaId/download`, alors que le CRM lui est fermé ;
- un `boat_owner`, dont le jeu de capabilities est volontairement vide, récupérait les documents administratifs (acte de francisation, assurance) de n'importe quel bateau de l'exploitant.

## Correctif

| Route                                                                        | Garde ajoutée              |
| ---------------------------------------------------------------------------- | -------------------------- |
| `GET /clients/:id/media/:mediaId/download`                                   | `ClientPolicy.view`        |
| `GET /boats/:boatId/media/:mediaId/download`                                 | `BoatPolicy.view` (bateau) |
| `GET /boats/:boatId/engines/:engineId/media/:mediaId/download`               | `BoatPolicy.view` (bateau) |
| `GET /boats/:boatId/engines/:engineId/parts/:partId/media/:mediaId/download` | `BoatPolicy.view` (bateau) |

La garde est posée **avant** la lecture Cloudinary : un refus renvoie 403, et aucun fichier n'est lu.

- **`ClientPolicy.view`** est nouvelle. Il n'existe pas de capability `clients.view` : la liste et la fiche client étaient gardées par `authorize('create')`, et `view` reprend ce même seuil (`clients.create`). `index` et `show` passent sur `view`, sans changer de comportement. Le téléchargement suit ainsi la fiche, et un document n'est pas plus accessible que l'écran qui l'affiche.
- **`BoatPolicy.view`** (capability `boats.view`) est la garde de `/boats/:id` et des exports CSV. Un `boat_owner` passe par son portail `/owner/boats/:id`, même pour un bateau qui est le sien : les routes staff servent tous les documents du bateau.

**Pas de helper `authorizeMediaDownload`** : l'issue le proposait pour choisir la policy d'après `media.entityType`. Mais chaque route résout déjà son entité parente (client, bateau) avant de chercher le média, et c'est sur cette entité que porte la policy. Un aiguillage par `entityType` aurait dupliqué ce que la route sait déjà.

## Tests

`tests/functional/boats/media_download.spec.ts`, nouveau groupe « matrice des rôles intra-organisation », 13 cas :

- `mechanic` et `boat_owner` → 403 sur chacune des trois routes bateau et sur le document client ;
- un `boat_owner` **rattaché** au bateau → 403 aussi ;
- `member` → 200 sur les quatre routes.

Chaque refus vérifie en plus que le fake Cloudinary n'a rien servi : un 403 posé après la lecture aurait le bon statut et fuirait quand même.

`tests/unit/policies/client_policy.spec.ts` : `view` entre dans la matrice (admin et member autorisés, mechanic et boat_owner refusés).

Le test qui figeait l'écart inverse (« un mechanic télécharge — la route n'a aucun bouncer », #692) attend désormais 403. Sans le correctif, 10 cas échouent.

## Docs

`docs/domain/clients.md` (§4 et ACL), `docs/domain/equipment-media.md`.
