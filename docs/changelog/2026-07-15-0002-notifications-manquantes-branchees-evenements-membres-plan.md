# 2026-07-15 — Notifications manquantes branchées (événements membres/plan/invitation + scan planifié)

Le système de notifications déclarait de nombreux `NotificationType` sans producteur : seuls 5 étaient réellement émis. Cette évolution branche tous les types manquants. `member.joined` n'était d'ailleurs jamais dispatché (event + listener existants mais aucun `.dispatch()`) — c'est désormais corrigé.

- **Notifications événementielles** (destinataires : admins de l'org **+** membre concerné le cas échéant) :
  - `member.removed` — retrait d'un membre : notifie les admins restants et l'utilisateur retiré. Nouvel event `OrganizationMemberRemoved`, dispatché dans `OrganizationMemberService.removeMember` (identité capturée avant suppression de la ligne).
  - `member.role_changed` — changement de rôle : notifie le membre concerné (message à la 2ᵉ personne) et les admins. Nouvel event `OrganizationMemberRoleChanged` (porte `fromRole`/`toRole`), dispatché dans `OrganizationMemberService.updateRole` (uniquement si le rôle change réellement).
  - `plan.upgraded` — montée de plan : notifie les admins. Nouvel event `OrganizationPlanUpgraded`, pendant de `OrganizationPlanDowngraded` ; `SubscriptionService.applyOrgPlan` renvoie désormais la direction (`up`/`down`) et dispatche l'event correspondant après commit.
  - `invitation.accepted` — acceptation d'invitation : notifie l'invitant. Nouvel event `OrganizationInvitationAccepted`, dispatché dans `OrganizationInvitationService.accept` (avec `OrganizationMemberJoined`) après commit.
- **Notifications planifiées** (destinataires : admins de l'org) : nouveau job cron `ScanFleetNotifications` (07:00, `start/scheduler.ts`) déléguant à `NotificationScanService` (`app/services/notification_scan_service.ts`). Il scanne la flotte et agrège **par bateau** :
  - `maintenance.overdue` / `maintenance.due_soon` (tâches `open` par `dueAt`, fenêtre 30 j) ;
  - `document.expired` / `document.expiring_soon` (documents bateau par `expiresAt`) ;
  - `safety_equipment.expired` / `safety_equipment.expiring_soon` (équipements de sécurité par `expiryDate`).
  - **Anti-doublon** : nouveau `NotificationService.createIfNotRecent()` — pas de re-notification d'une même entité (clé `metadata`) avant 30 jours, pour éviter le spam d'un scan quotidien. _Les documents **clients** sont hors périmètre (aucun champ d'expiration en base)._
- **i18n FR + EN** : ajout des messages `notifications.messages.*` pour les 10 nouveaux types, et correction de l'écart `notifications.types.module.deactivated` (libellé manquant).
- **Aucun changement frontend** : cloche, panneau et page consomment génériquement `NotificationForFront`.
