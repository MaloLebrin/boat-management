# Domaine — Équipiers (crew members)

## Objectif fonctionnel

Gérer les équipiers d'une organisation et leur présence à bord lors des sorties :

- CRUD des équipiers de l'organisation (nom, email, téléphone, notes)
- Certifications par équipier (type réglementaire, numéro de référence, date d'expiration)
- Rattachement d'équipiers à une sortie (navigation log) avec un rôle (skipper / équipier / passager)
- Génération du rôle d'équipage en PDF (format réglementaire DCSM)
- Alertes d'expiration des certifications : notifications, e-mail, badges, widget (#882)

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

| Colonne            | Type              | Contrainte                                                            |
| ------------------ | ----------------- | --------------------------------------------------------------------- |
| `id`               | integer PK        | —                                                                     |
| `crew_member_id`   | FK → crew_members | CASCADE                                                               |
| `type`             | enum              | Vocabulaire partagé des titres de navigation (#585) — voir ci-dessous |
| `reference_number` | string            | nullable                                                              |
| `expires_at`       | date              | nullable, indexé                                                      |

**Vocabulaire des titres de navigation (#585).** Source unique
`shared/types/navigation_title.ts`, **partagée avec `clients.navigation_permit_type`** :
`coastal_permit`, `offshore_permit`, `inland_permit`, `captain_200`, `vhf`, `crr`,
`stcw_basic`, `stcw_proficiency`, `medical_certificate`, `first_aid`, `other`.
Contrainte CHECK en base (migration `1830000000000_*`). Ne jamais redéclarer la
liste ailleurs : les deux domaines doivent rester alignés.

Libellés : namespace i18n unique `common.navigationTitles.*` (`fr` + `en`),
lu côté front par `useNavigationTitles()` (`inertia/composables/use_navigation_titles.ts`).

**Durée de validité par défaut.** `shared/helpers/navigation_title.ts` porte les
durées des titres qui se périment (visite médicale 2 ans, STCW 5 ans) et expose
`suggestedExpiryDate(type)`. Le formulaire s'en sert pour **proposer** une date
d'expiration : la suggestion ne remplace `expires_at` que s'il est vide ou porte
encore une proposition précédente, jamais une date saisie. Les titres délivrés à
vie (permis français, CRR, PSC1) ne proposent rien.

### `navigation_log_crew` (pivot)

| Colonne             | Type                 | Contrainte                                    |
| ------------------- | -------------------- | --------------------------------------------- |
| `navigation_log_id` | FK → navigation_logs | CASCADE                                       |
| `crew_member_id`    | FK → crew_members    | CASCADE                                       |
| `role`              | enum                 | `skipper \| crew \| passenger`, défaut `crew` |
| —                   | unique               | `(navigation_log_id, crew_member_id)`         |

## ACL (qui a le droit ?)

Référence : `app/policies/crew_member_policy.ts`.

| Action   | Capacité lue  | Qui passe                    |
| -------- | ------------- | ---------------------------- |
| `create` | `crew.create` | admin, member                |
| `update` | `crew.update` | admin, member                |
| `delete` | `crew.delete` | admin seulement (admin-only) |

Trois choses à connaître avant de lire ce tableau (#696) :

- **`GET /crew` autorise sur `create`, pas sur une lecture.** `CrewMemberPolicy`
  n'a pas de méthode `view`, et `CrewMembersController.index` appelle
  `authorize('create')`. Lire la liste exige donc la capacité de créer. Sans
  conséquence aujourd'hui — `mechanic` et `boat_owner`, les deux rôles sans
  `crew.create`, n'ont rien à faire sur cet écran — mais un rôle en lecture
  seule serait refusé. Figé par `tests/functional/crew/crew_members.spec.ts`.
- **Aucune des trois méthodes ne prend de ressource.** Elles ne vérifient que la
  capacité, jamais l'appartenance. Toute l'isolation multi-tenant de
  `PUT /crew/:id` et `DELETE /crew/:id` — qui ne portent pas d'organisation dans
  leur URL — tient au `where('organizationId', …)` de
  `CrewService.getForOrganizationOrFail`.
- **Une fiche d'une autre organisation ne rend pas un 404** : le service lève
  `CrewMemberNotFoundError`, le contrôleur pose le flash `crew.notFound` et
  renvoie **302 vers `/crew`**. Un refus de rôle, lui, renvoie 302 vers `/` en
  écriture et **403** en lecture.

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

| Méthode                                  | Description                                                    |
| ---------------------------------------- | -------------------------------------------------------------- |
| `listForOrganization(org)`               | Liste complète avec certifications preloadées                  |
| `listOptionsForOrganization(org)`        | Liste allégée `{ id, fullName, certificationStatus }`          |
| `listCertificationAlerts(orgId)`         | Certifications échues ou à 60 jours, les plus urgentes d'abord |
| `getDashboardCertifications(orgId)`      | Widget : comptes par état + 5 lignes (#882)                    |
| `getForOrganizationOrFail(org, id)`      | Lookup avec vérification organisation                          |
| `create(org, payload)`                   | Crée un équipier                                               |
| `update(member, payload)`                | Met à jour un équipier                                         |
| `delete(member)`                         | Supprime un équipier (cascade sur certifications et pivot)     |
| `addCertification(member, payload)`      | Ajoute une certification                                       |
| `deleteCertification(member, certId)`    | Supprime une certification                                     |
| `syncCrewForNavigationLog(log, payload)` | Sync pivotTable équipage d'une sortie                          |

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
- Badge statut certification (`CrewCertificationBadge.vue`) : valide / expire dans N jours / expirée depuis N jours, d'après `status` (fenêtre de 60 jours, #882)
- Badge d'équipier à côté du nom : « Certification expirée » ou « À renouveler » (état le plus grave, `certificationStatus`)

### Onglet navigation logs — panel équipage

Référence : `inertia/components/boats/show/tabs/NavigationLogCrewPanel.vue`.

Intégré dans `BoatShowTabNavigationLogs.vue` sous chaque entrée de sortie.

Props :

- `boatId`, `logId`
- `crew: NavigationLogCrewRow[]` — membres déjà rattachés
- `crewMemberOptions: CrewMemberOption[]` — membres disponibles dans l'organisation
- `canUpdate`

Fonctionnalités :

- Ajout d'un membre avec sélection du rôle — l'option d'un équipier au certificat expiré ou à renouveler porte la mention (#882)
- Badge « Certification expirée » sur un membre embarqué et avertissement `role="status"` au-dessus du formulaire : **jamais bloquant** (le certificat renouvelé peut ne pas encore être saisi)
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

type CrewCertificationStatus = 'valid' | 'expiring_soon' | 'expired' | 'undated'

interface CrewMemberRow { …, certifications[], certificationStatus: CrewCertificationStatus | null }
interface CrewCertificationRow { id, type, referenceNumber, expiresAt, isExpired, expiresInDays, status }
interface NavigationLogCrewRow { crewMemberId, fullName, role }
interface CrewMemberOption { id, fullName, certificationStatus }
interface CrewCertificationAlert { crewMemberId, crewMemberName, certificationId, type, expiresAt, expiresInDays, status }
interface DashboardCrewCertifications { expiredCount, expiringSoonCount, items: CrewCertificationAlert[] }
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

## Alertes d'expiration des certifications (#882)

**Règle d'état** — `shared/helpers/crew_certification.ts`, sans luxon (importée
côté Inertia) : `crewCertificationStatus(expiresInDays)` rend `expired` (échue),
`expiring_soon` (≤ 60 jours), `valid` ou `undated` (sans date : permis à vie,
date non saisie). Un équipier prend l'état le plus grave de ses certifications
(`worstCrewCertificationStatus`, `null` sans certification). La même règle sert
aux badges, au sélecteur du journal de bord, au widget et aux alertes.

**Notifications** — `NotificationScanService.scanCrewCertifications` (job
quotidien `scan_fleet_notifications`) :

- types `crew_certification.expiring_soon` (`warning`) et
  `crew_certification.expired` (`error`, poussable) ;
- **une notification par équipier et par état**, `count` = nombre de
  certifications, `days` = échéance la plus proche ;
- destinataires : les admins **et** l'équipier lui-même quand son e-mail
  (insensible à la casse) est celui d'un membre de **la même** organisation ;
  lien `/crew` si le destinataire a `crew.create`, sinon aucun lien ;
- anti-doublon par fenêtre : clé `metadata.crewAlertKey` = `<équipier>:60`,
  `:30`, `:7` (plus petite fenêtre qui contient l'échéance) ou `:expired`.
  Une échéance n'alerte qu'une fois par fenêtre ; une certification échue, une
  fois par mois (30 jours) ;
- titre et corps rédigés dans la langue du destinataire (`users.locale`).

**E-mail** — `ReminderEmailService.sendCrewCertificationReminders` (job
quotidien `SendReminderEmails`, 08:00) : les certifications qui expirent dans
**exactement** 60, 30 ou 7 jours, un e-mail par admin de l'organisation, dans
sa langue (`crew.emails.reminder.*`, gabarit
`reminder_crew_certification_expiry.edge`). Le job étant quotidien, une
certification donne au plus trois e-mails, sans table d'historique.

**Widget** — « Certifications à renouveler » (`crew_certifications`, galerie,
masqué par défaut, dispo avec `crew.create`) : comptes échues / à 60 jours et
les cinq plus urgentes, via `CrewService.getDashboardCertifications`.

**Assistant** — `AssistantContextService.buildFleetDigestLines` ajoute au
digest les certifications échues ou à 60 jours (pour qui a `crew.create`) : le
copilote peut répondre « qui peut skipper samedi ? ».

**Hors périmètre** : le rôle d'équipage PDF ne filtre ni ne signale les
certificats (document réglementaire, à valider par le capitaine) ;
préférences de notification par type (#888). Le planning d'équipage est décrit
ci-dessous (#883).

## Planning d'équipage (#883)

Pour une école de voile ou un loueur avec skipper, le planning des personnes
compte autant que celui des bateaux : qui embarque sur quelle réservation, qui
est libre, qui a ses certificats.

**Gating** — module Location (`canManageReservations`), comme les
réservations. La liste `/crew`, les certifications et la fiche équipier
restent ouvertes à tous les plans ; sans module, la fiche n'affiche que les
sorties du journal de bord.

### Modèle de données

- `boat_reservation_crew_members` (`BoatReservationCrewMember`) :
  `boat_reservation_id` (cascade), `crew_member_id` (cascade), `role`
  (`skipper` | `crew` | `instructor`), `notes`, `reminder_sent_at` (rappel
  J-1 envoyé). Unique sur (réservation, équipier).
- `crew_unavailabilities` (`CrewUnavailability`) : `crew_member_id`
  (cascade), `starts_on` / `ends_on` (jours **inclus**), `reason`.

### Règle de disponibilité — `CrewPlanningService`

Un équipier est **pris** sur un créneau `[début, fin[` s'il est affecté à une
autre réservation `option` ou `confirmed` qui le recoupe (fin exclue : un
retour à 18 h n'empêche pas un départ à 18 h), ou si une indisponibilité
couvre l'un de ses jours (jours du créneau calculés dans le fuseau du serveur,
la fin exclue). Une réservation annulée ne bloque personne et n'embarque plus
personne. Fonctions pures : `shared/helpers/crew_planning.ts`
(`intervalsOverlap`, `dayRangeOverlaps`, `navigationLogRoleFor`).

- `assign` refuse un équipier pris (`CrewMemberUnavailableError`, avec la
  liste des conflits), déjà affecté (`CrewMemberAlreadyAssignedError`),
  d'une autre organisation (`CrewMemberNotFoundError`) ou une réservation
  annulée (`CrewAssignmentReservationCancelledError`). La ligne de l'équipier
  est verrouillée (`FOR UPDATE`) : deux affectations simultanées de la même
  personne se sérialisent.
- Une certification datée qui expire **avant la fin** de la réservation est
  un avertissement (`certification_lapses`, flash `info`), jamais un refus.
- Une réservation déplacée après coup peut créer un chevauchement : le bloc
  Équipage le signale (« Chevauchement apparu depuis l'affectation »).

### Routes

| Route                                                                  | Contrôleur                                                    | Droit               |
| ---------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------- |
| `GET /boats/:boatId/reservations/:reservationId/crew`                  | `ReservationCrewController.show` → `boats/reservation_crew`   | `BoatPolicy.view`   |
| `POST /boats/:boatId/reservations/:reservationId/crew`                 | `.store` (`assignReservationCrewValidator`)                   | `BoatPolicy.manage` |
| `DELETE /boats/:boatId/reservations/:reservationId/crew/:assignmentId` | `.destroy`                                                    | `BoatPolicy.manage` |
| `GET /boats/:boatId/reservations/:reservationId/crew/pdf`              | `.pdf` — rôle d'équipage de la réservation                    | `BoatPolicy.view`   |
| `GET /crew/planning` (`?from=YYYY-MM-DD`)                              | `CrewPlanningController.index` → `organization/crew_planning` | `crew.create`       |
| `POST /crew/:id/unavailabilities`                                      | `.storeUnavailability`                                        | `crew.update`       |
| `DELETE /crew/:id/unavailabilities/:unavailabilityId`                  | `.destroyUnavailability`                                      | `crew.update`       |
| `GET /crew/:id`                                                        | `CrewMembersController.show` → `organization/crew_member`     | `crew.create`       |

Les routes de réservation vivent dans le groupe gardé par le module Location
de `start/routes/boats.ts` ; le calendrier et les indisponibilités dans un
groupe gardé de `start/routes/crew.ts`.

### Propagations

- **Journal de bord** : `NavigationLogService.createForBoat` embarque d'office
  l'équipage de la réservation active du bateau qui couvre le jour du départ
  (`CrewPlanningService.crewForDeparture`) ; `instructor` devient `crew`. Il
  reste modifiable depuis le panneau équipage de la sortie.
- **Rôle d'équipage PDF** : `CrewRolePdfService.generateForReservation`,
  imprimable avant le départ (bateau, client, dates).
- **Contrat** : pour une location `skippered`, le PDF du contrat nomme le
  skipper affecté (`rentalContracts.pdf.skipper`).
- **Planning** : `PlanningReservation.crewMemberIds` alimente le filtre
  « Équipier » de `/planning`.

### Notifications

- `crew.assigned` (poussable) à l'affectation, à l'équipier dont l'e-mail est
  celui d'un membre de l'organisation ; lien vers les réservations du bateau
  s'il a `boats.view`.
- `crew.assignment_reminder` (poussable) la veille d'un départ, par le scan
  quotidien (`NotificationScanService` → `sendDayBeforeReminders`), une seule
  fois par affectation (`reminder_sent_at`), avec bateau, client et horaires.

### Assistant

`AssistantContextService` ajoute l'équipage des réservations des 14 prochains
jours (12 lignes au plus) pour qui a `crew.create` : « qui skippe le catamaran
samedi ? ». Entrée `crew-planning` de `product_knowledge.ts`, cible
`crew.planning.index`.

### UI

- `boats/reservation_crew.vue` : `ReservationCrewList` (rôles, badges de
  certification, conflits, retrait) et `ReservationCrewAssignForm` (équipiers
  libres d'abord, les pris grisés avec ce qui les occupe ; rôle `skipper` par
  défaut pour une location `skippered` sans skipper). Accès par le bouton
  « Équipage » des actions d'une ligne de réservation.
- `organization/crew_planning.vue` + `CrewPlanningGrid` : quatre semaines,
  une ligne par équipier ; brand = embarqué, ambre = indisponible, rouge =
  deux occupations le même jour.
- `organization/crew_member.vue` : certifications, `CrewUnavailabilityPanel`,
  `CrewMemberHistory` (réservations et sorties, les plus récentes d'abord).
- i18n : `crew.planning.*`, `flash.crew.planning.*`,
  `notifications.messages.crew.*`, `planning.crewFilter.*`,
  `reservations.actions.crew*`.

**Hors périmètre** : paie et rémunération des skippers.
