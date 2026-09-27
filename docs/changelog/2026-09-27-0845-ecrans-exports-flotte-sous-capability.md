# 2026-09-27 — Planning, historique, PDF et exports CSV gardés par capability (#845)

Plusieurs écrans et exports de flotte s'arrêtaient à `auth.authenticate()` et au scope organisation. Un `boat_owner`, dont le jeu de capabilities est volontairement vide, pouvait donc :

- ouvrir `/planning` ou `/maintenance/history` et voir les tâches et l'historique des bateaux des autres propriétaires ;
- télécharger le PDF de l'historique de la flotte ou le carnet d'entretien de n'importe quel bateau de l'organisation ;
- exporter en CSV la maintenance, les avitaillements ou le journal de bord de n'importe quel bateau (seul `budget.csv` appelait `BoatPolicy.view`).

## Correctif

| Route                                                        | Garde                                                     | boat_owner         |
| ------------------------------------------------------------ | --------------------------------------------------------- | ------------------ |
| `GET /planning`, `GET /maintenance/history`                  | `boatOwnerPortalRedirect()` puis `MaintenancePolicy.view` | 302 `/owner/boats` |
| `GET /maintenance/history.pdf`                               | `MaintenancePolicy.view`                                  | 403                |
| `GET /boats/:id/maintenance-log.pdf`                         | `MaintenancePolicy.view` (bateau)                         | 403                |
| `GET /boats/:id/export/maintenance.csv`                      | `MaintenancePolicy.view` (bateau)                         | 403                |
| `GET /boats/:id/export/fuel-logs.csv`, `navigation-logs.csv` | `BoatPolicy.view` (bateau)                                | 403                |

- **`MaintenancePolicy.view` accepte un bateau optionnel**, comme `BoatPolicy.view`. Sans bateau (écrans flotte), la capability `maintenance.view` décide seule ; le service scope déjà par organisation. La matrice unitaire existante couvre la méthode.
- **Carnet d'entretien et `maintenance.csv` sous `MaintenancePolicy`, pas `BoatPolicy`** : l'issue proposait `BoatPolicy.view` pour le carnet. Mais un `mechanic` a `maintenance.view` sans `boats.view`. Or il lit légitimement l'historique d'un bateau et l'exporte en PDF depuis l'écran maintenance ; `BoatPolicy` le lui aurait retiré. La garde suit la donnée servie.
- **Carburant et journal de bord sous `BoatPolicy.view`**, alignés sur `budget.csv`. Ces données n'entrent pas dans le périmètre `maintenance.*` : un `mechanic` reçoit donc désormais 403 sur ces deux exports.
- **Helper `resolveExportBoat`** dans `CsvExportController` : quota, résolution du bateau et autorisation en un seul préambule, avec un callback d'autorisation **obligatoire**. Un cinquième export ne peut plus oublier la policy.

## Tests

`tests/functional/maintenance/fleet_capability_guard.spec.ts`, 9 cas :

- `boat_owner` → 302 `/owner/boats` sur les deux écrans, et 403 sur les cinq téléchargements, y compris pour un bateau auquel il est rattaché ;
- `mechanic` → 200 sur les écrans et les trois téléchargements de maintenance, 403 sur carburant et journal de bord ;
- `member` → 200 sur les cinq téléchargements.

Sans le correctif, 5 cas échouent.

## Docs

`docs/domain/auth-acl.md` (nouvelle section « Écrans et exports flotte »), `docs/domain/csv-import-export.md`, `docs/domain/maintenance-tasks.md`.
