# Domaine — Équipiers (crew members)

## Objectif fonctionnel

Gérer les équipiers d'une organisation et leur présence à bord lors des sorties :

- CRUD des équipiers de l'organisation (nom, email, téléphone, notes)
- Certifications par équipier (type réglementaire, numéro de référence, date d'expiration)
- Rattachement d'équipiers à une sortie (navigation log) avec un rôle (skipper / équipier / passager)
- Génération du rôle d'équipage en PDF (format réglementaire DCSM)

## Modèle de données

Références : `app/models/crew_member.ts`, `app/models/crew_certification.ts`, `database/migrations/1799000000000_*`.

### `crew_members`

| Colonne           | Type               | Contrainte |
| ----------------- | ------------------ | ---------- |
| `id`              | integer PK         | —          |
| `organization_id` | FK → organizations | CASCADE    |
| `first_name`      | string             | NOT NULL   |
| `last_name`       | string             | NOT NULL   |
| `email`           | string             | nullable   |
| `phone`           | string             | nullable   |
| `notes`           | text               | nullable   |

### `crew_certifications`

| Colonne            | Type              | Contrainte                                                                            |
| ------------------ | ----------------- | ------------------------------------------------------------------------------------- |
| `id`               | integer PK        | —                                                                                     |
| `crew_member_id`   | FK → crew_members | CASCADE                                                                               |
| `type`             | enum              | `coastal_permit \| offshore_permit \| vhf \| stcw_basic \| stcw_proficiency \| other` |
| `reference_number` | string            | nullable                                                                              |
| `expires_at`       | date              | nullable, indexé                                                                      |

### `navigation_log_crew` (pivot)

| Colonne             | Type                 | Contrainte                                    |
| ------------------- | -------------------- | --------------------------------------------- |
| `navigation_log_id` | FK → navigation_logs | CASCADE                                       |
| `crew_member_id`    | FK → crew_members    | CASCADE                                       |
| `role`              | enum                 | `skipper \| crew \| passenger`, défaut `crew` |
| —                   | unique               | `(navigation_log_id, crew_member_id)`         |

## ACL (qui a le droit ?)

Référence : `app/policies/crew_member_policy.ts`.

| Action   | Règle                                               |
| -------- | --------------------------------------------------- |
| `create` | membre de l'organisation (`organizationId != null`) |
| `update` | membre de l'organisation                            |
| `delete` | admin de l'organisation uniquement (via `before()`) |

## Routes → controllers → services → UI

Références routes : `start/routes/crew.ts`, `start/routes/boats.ts`.

### Gestion des équipiers (`/crew`)

- `GET /crew` (`crew.index`)
  - Controller : `app/controllers/crew_members_controller.ts` → `index`
  - Service : `CrewService.listForOrganization`
  - Page : `inertia/pages/organization/crew.vue`
- `POST /crew` (`crew.store`)
  - Controller : `CrewMembersController.store`
  - Validator : `createCrewMemberValidator` (`app/validators/crew.ts`)
  - Redirect : `/crew`
- `PUT /crew/:id` (`crew.update`)
  - Controller : `CrewMembersController.update`
  - Validator : `updateCrewMemberValidator`
  - Redirect : `/crew`
- `DELETE /crew/:id` (`crew.destroy`)
  - Controller : `CrewMembersController.destroy` — admin seulement
  - Redirect : `/crew`

### Certifications

- `POST /crew/:memberId/certifications` (`crew.certifications.store`)
  - Controller : `app/controllers/crew_certifications_controller.ts` → `store`
  - Validator : `createCrewCertificationValidator`
  - Redirect : `/crew`
- `DELETE /crew/:memberId/certifications/:certId` (`crew.certifications.destroy`)
  - Controller : `CrewCertificationsController.destroy`
  - Redirect : `/crew`

### Équipage d'une sortie (sur `/boats/:boatId`)

- `PATCH /boats/:boatId/navigation-logs/:logId/crew` (`boats.navigationLogs.crew.sync`)
  - Controller : `app/controllers/navigation_log_crew_controller.ts` → `sync`
  - Validator : `syncNavigationLogCrewValidator` — `crew[]` avec `crewMemberId` + `role`
  - Comportement : **remplace** tout l'équipage de la sortie (sync pivotTable)
  - ACL : `NavigationLogPolicy.update` (même org)
  - Redirect : `/boats/:id?tab=navigation-logs`

### PDF rôle d'équipage

- `GET /boats/:boatId/navigation-logs/:logId/crew-role.pdf` (`boats.navigationLogs.crewRole.download`)
  - Controller : `app/controllers/crew_role_pdf_controller.ts` → `download`
  - Service : `app/services/crew_role_pdf_service.ts` (PDFKit)
  - ACL : `NavigationLogPolicy.update`
  - Retourne un PDF attaché (`Content-Disposition: attachment`)

## Service — `CrewService`

Référence : `app/services/crew_service.ts`.

| Méthode                                  | Description                                                |
| ---------------------------------------- | ---------------------------------------------------------- |
| `listForOrganization(org)`               | Liste complète avec certifications preloadées              |
| `listOptionsForOrganization(org)`        | Liste allégée `{ id, fullName }` pour les selects          |
| `getForOrganizationOrFail(org, id)`      | Lookup avec vérification organisation                      |
| `create(org, payload)`                   | Crée un équipier                                           |
| `update(member, payload)`                | Met à jour un équipier                                     |
| `delete(member)`                         | Supprime un équipier (cascade sur certifications et pivot) |
| `addCertification(member, payload)`      | Ajoute une certification                                   |
| `deleteCertification(member, certId)`    | Supprime une certification                                 |
| `syncCrewForNavigationLog(log, payload)` | Sync pivotTable équipage d'une sortie                      |

## UI

### Page `/crew`

Référence : `inertia/pages/organization/crew.vue`.

Props reçues :

- `crewMembers: CrewMemberRow[]` — liste avec certifications
- `canDelete: boolean`

Fonctionnalités inline :

- Formulaire de création (`CrewMemberForm.vue`) affiché à la demande
- Édition inline par membre (`CrewMemberForm.vue` avec les données existantes)
- Ajout de certification par membre (`CrewCertificationForm.vue`)
- Badge statut certification (`CrewCertificationBadge.vue`) : valide / expire dans N jours / expirée

### Onglet navigation logs — panel équipage

Référence : `inertia/components/boats/show/tabs/NavigationLogCrewPanel.vue`.

Intégré dans `BoatShowTabNavigationLogs.vue` sous chaque entrée de sortie.

Props :

- `boatId`, `logId`
- `crew: NavigationLogCrewRow[]` — membres déjà rattachés
- `crewMemberOptions: CrewMemberOption[]` — membres disponibles dans l'organisation
- `canUpdate`

Fonctionnalités :

- Ajout d'un membre avec sélection du rôle
- Suppression d'un membre (sync immédiat via `PATCH`)
- Lien de téléchargement PDF du rôle d'équipage

### Données transmises par `BoatsController.show`

`crewMemberOptions` est chargé via `CrewService.listOptionsForOrganization(user.organization)` et passé au transformer, puis à l'onglet navigation logs.

La liste complète des équipiers avec crew preloadé est chargée dans `NavigationLogService.listForBoat` (preload `crew` sur chaque log).

## Types partagés

Référence : `shared/types/crew.ts`.

```ts
type CrewCertificationType = 'coastal_permit' | 'offshore_permit' | 'vhf' | 'stcw_basic' | 'stcw_proficiency' | 'other'
type NavigationLogCrewRole = 'skipper' | 'crew' | 'passenger'

interface CrewMemberRow { id, firstName, lastName, fullName, email, phone, notes, certifications[] }
interface CrewCertificationRow { id, type, referenceNumber, expiresAt, isExpired, expiresInDays }
interface NavigationLogCrewRow { crewMemberId, fullName, role }
interface CrewMemberOption { id, fullName }
```

`NavigationLogRow` (dans `shared/types/navigation_log.ts`) inclut le champ `crew: NavigationLogCrewRow[]`.

## i18n

Namespaces ajoutés : `crew` (FR + EN). Clés `nav.crew` ajoutées dans `nav.json`. Messages flash dans `flash.crew`.

Le namespace `crew` est transmis au frontend via le middleware Inertia (non exclu).

## PDF rôle d'équipage

Service : `app/services/crew_role_pdf_service.ts` (PDFKit).

Contenu du document :

- En-tête : titre, date/heure de départ, date d'arrivée (si disponible), trajet (ports)
- Tableau équipiers : nom complet / rôle / email
- Pied de page : mention "document à valider par le capitaine"

Nom du fichier généré : `role-equipage-YYYY-MM-DD.pdf`.
