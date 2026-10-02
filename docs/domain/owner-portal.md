# Domaine — Portail propriétaire (#890)

## Objectif fonctionnel

Le rôle `boat_owner` cible le propriétaire qui confie son bateau à un
gestionnaire (marina, société de gestion, loueur en « management »). Il paie
pour que quelqu'un s'occupe de son bateau : il veut savoir ce qui a été fait,
ce que ça a coûté, et pouvoir demander quelque chose. Le portail n'est plus une
vitrine en lecture seule : il montre le dossier du bateau et ouvre deux
interactions, la **demande** et l'**accord sur un devis**.

## ACL

`boat_owner` n'a **aucune** capability (`BOAT_OWNER_CAPABILITIES` est vide).
Tout l'accès du portail repose sur le pivot `boat_owners` :

- chaque route résout le bateau par `BoatOwnerService.getOwnedBoat(user, id)`,
  qui ne trouve que les bateaux rattachés à l'utilisateur ;
- un bateau non rattaché (même organisation ou autre) redirige vers
  `/owner/boats` avec un flash, sans rien écrire ;
- `OwnerPortalService` reçoit un bateau déjà résolu : il ne décide pas de
  l'accès, il borne ce qu'on lit et écrit sur ce bateau.

`tests/functional/security/cross_org_routes.spec.ts` couvre les trois routes
d'écriture comme les autres routes à paramètre.

## Routes

| Route                                         | Contrôleur                               | Rôle                    |
| --------------------------------------------- | ---------------------------------------- | ----------------------- |
| `GET /owner/boats`                            | `BoatOwnerPortalController.index`        | Liste de ses bateaux    |
| `GET /owner/boats/:id`                        | `BoatOwnerPortalController.show`         | Dossier du bateau       |
| `POST /owner/boats/:id/requests`              | `BoatOwnerPortalController.storeRequest` | Demande au gestionnaire |
| `POST /owner/boats/:id/tasks/:taskId/approve` | `BoatOwnerPortalController.approve`      | Accepte un devis        |
| `POST /owner/boats/:id/tasks/:taskId/reject`  | `BoatOwnerPortalController.reject`       | Refuse un devis         |

Les écritures répondent par une redirection Inertia (`redirect().back()`) et
un flash `flash.owner.*`.

## Ce que le propriétaire voit

Chaque prop passe par un transformer à liste de champs **explicite**
(`app/transformers/boat_owner_transformer.ts`, types dans
`shared/types/owner_portal.ts`). Une colonne ajoutée demain à ces tables ne
part pas chez lui tant qu'on ne l'ajoute pas au transformer ;
`tests/functional/owner/owner_portal.spec.ts` fige les clés.

| Prop                                | Source                                                                     | Exclu volontairement                                         |
| ----------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `dashboard`                         | `OwnerPortalService.dashboard`                                             | —                                                            |
| `documents`                         | `boat_documents`                                                           | coût, fichier, notes                                         |
| `expenses`                          | `boat_budget_entries` **avec `visible_to_owner = true`**                   | description interne                                          |
| `incidents`                         | `boat_incidents`                                                           | description, auteur, lieu, assurance                         |
| `trips`                             | `navigation_logs` clôturés (20 derniers)                                   | équipage, notes, météo                                       |
| `requests`                          | tâches `requested_by_owner_id` ou `owner_approval_status` non nuls         | notes d'une tâche créée par l'équipe, responsable, coût réel |
| `maintenanceEvents`, `reservations` | inchangés (#781)                                                           | —                                                            |
| `invoices`                          | factures des locations du bateau **et** factures adressées au propriétaire | —                                                            |

Une facture est « adressée au propriétaire » quand son client CRM porte
l'e-mail de l'utilisateur (comparaison insensible à la casse), dans
l'organisation du bateau, hors brouillons et devis.

### Tableau de bord

- **Dépenses sur 12 mois** et répartition par catégorie : uniquement les
  dépenses partagées.
- **Prochaines échéances** (90 jours, 5 au plus) : documents qui expirent et
  tâches ouvertes datées.
- **Dernière sortie**, **état du bateau** (statut de disponibilité, #870),
  **devis à valider**.

## Demandes

`POST /owner/boats/:id/requests` (titre 3-160 caractères, description
facultative ≤ 2000) crée une **tâche de maintenance** ouverte, sujet `boat`,
sans échéance ni responsable, avec `requested_by_owner_id`. L'action est
journalisée (`maintenance_task.owner_request`) et l'équipe (admin, membre,
mécanicien) reçoit `owner.request_created`. Côté équipe, la tâche porte la
mention « Demande du propriétaire » dans son résumé d'ordre de travail.

Le propriétaire suit le statut vu de chez lui (`ownerRequestStatusOf`) :
**reçue** (ouverte, ni date ni responsable), **planifiée** (une échéance ou un
responsable), **faite**.

## Accord sur un devis

Une tâche **ouverte** dont le coût prévu atteint
`OWNER_APPROVAL_THRESHOLD_EUR` (500 €), sur un bateau qui a au moins un
propriétaire, passe en `owner_approval_status = 'pending'` à la création ou à
chaque changement de coût (`BoatMaintenanceTaskService.syncOwnerApproval`) ;
les propriétaires reçoivent `owner.approval_requested`.

- Un nouveau coût redemande l'accord, même après une décision.
- Un coût repassé sous le seuil lève une demande encore en attente ; une
  décision déjà prise reste.
- Le propriétaire accepte ou refuse une seule fois
  (`OwnerApprovalNotPendingError` ensuite) ; la décision est horodatée
  (`owner_approval_decided_at`, `owner_approval_decided_by`), journalisée
  (`maintenance_task.owner_approve` / `owner_reject`) et notifiée à l'équipe
  (`owner.approval_decided`).

L'accord est une information pour le gestionnaire : il ne bloque pas la
clôture de la tâche.

## Notifications au propriétaire

Famille `fleet` (préfixe `owner.`), poussables, vers `/owner/boats/:id` :

| Type                       | Déclencheur                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------- |
| `owner.maintenance_done`   | `BoatMaintenanceTaskService.markDone`                                               |
| `owner.incident_created`   | `BoatIncidentService.createForBoat` (type traduit, sans description)                |
| `owner.approval_requested` | devis soumis (voir plus haut)                                                       |
| `owner.document_expiring`  | scan quotidien, documents expirant sous 30 jours                                    |
| `owner.invoice_sent`       | `InvoiceService.markSent` sur une facture brouillon dont le client porte son e-mail |

Les destinataires sont résolus par `NotificationAudienceService.ownersOfBoat`
(pivot + membership `boat_owner` de l'organisation, comptes anonymisés exclus)
ou `ownersByEmail` pour une facture. L'auteur d'une action n'est pas notifié.

## Côté gestionnaire

- Budget : la case « Visible du propriétaire » (`visibleToOwner`) partage une
  dépense ; décochée par défaut. Une édition qui ne porte pas la case ne la
  décoche pas.
- Tâches : le résumé d'ordre de travail affiche « Demande du propriétaire » et
  l'état de l'accord (`requestedByOwner`, `ownerApproval` dans
  `MaintenanceTaskWorkOrder`).

## Hors périmètre

- Paiement en ligne des factures du gestionnaire par le propriétaire (issue
  Stripe Connect).
- Partage d'un statut public.
- Photo jointe à une demande et fil de commentaires sur la tâche ; rapport
  mensuel par e-mail en version propriétaire (dépend de l'issue rapports).
