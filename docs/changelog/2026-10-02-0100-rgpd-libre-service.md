# 2026-10-02 — Compte et organisation en libre-service : export, départ, suppression (#886)

Le RGPD était traité pour les clients du loueur (module CRM), pas pour l'utilisateur de FleetAi lui-même. Il ne pouvait ni exporter ses données, ni quitter une organisation, ni supprimer son compte, et une organisation ne pouvait pas être supprimée. La politique de confidentialité promettait pourtant ces droits.

- **Données.** Migration `1881000000000_add_account_and_organization_deletion` :
  - `users.deletion_requested_at` : demande de suppression du compte ;
  - `users.anonymized_at` : compte purgé ;
  - `organizations.deletion_requested_at` : suppression programmée de l'organisation ;
  - deux index partiels sur les demandes en attente.
- **Exporter mes données.** `GET /settings/me/export` télécharge un fichier JSON (`fleetai.personal-data` v1, portabilité). Il contient le profil et les préférences, les organisations, les sessions, les abonnements push, les notifications, le journal d'audit de la personne, ses saisies (incidents, actions d'équipement, changements de statut, références des fichiers envoyés) et ses conversations avec le copilote. Les données de l'organisation restent dans les exports flotte (#879). Audit `account.export`.
- **Quitter une organisation.** `DELETE /settings/me/memberships/:organizationId`. Refusé au dernier admin et sur la seule organisation du compte. Les tâches ouvertes qui lui étaient confiées redeviennent non assignées, les admins sont notifiés, et le compte bascule sur une autre organisation si c'était l'organisation active. Audit `member.left`.
- **Supprimer mon compte.** `DELETE /settings/me` (mot de passe + case de confirmation).
  - Refusé au dernier admin d'une organisation active : il doit nommer un autre admin ou supprimer l'organisation. Une organisation déjà en cours de suppression ne bloque pas.
  - Tous les accès sont coupés (sessions, remember-me, push), l'utilisateur est renvoyé au login, et l'e-mail « Suppression de votre compte FleetAi programmée » part (gabarit `emails/deletion_scheduled`).
  - **Rétractation de 14 jours** : se reconnecter annule la demande (audit `account.delete_cancelled`).
  - Ensuite, le job `PurgeDeletedAccounts` (04:30) **anonymise** le compte. La ligne `users` survit, parce que `boat_equipment_actions.created_by` est en `CASCADE` et qu'un `DELETE` effacerait l'historique de la flotte. Adresse `deleted-user-<id>@deleted.invalid`, nom, préférences, 2FA et mot de passe vidés. Adhésions, notifications, sessions, jetons, codes de secours, avatar et accès propriétaire sont supprimés, et les invitations acceptées perdent l'adresse. Le journal d'audit garde ses lignes (`account.purged`).
- **Supprimer l'organisation.** `DELETE /settings/org` (`organization.manage`, nom de l'organisation à saisir + mot de passe).
  - L'abonnement Stripe passe en `cancel_at_period_end`, ce qui reste réversible. Chaque membre reçoit un e-mail, et un bandeau rappelle la date de purge à tous (prop partagée `organizationDeletionScheduledFor`).
  - **Grâce de 30 jours** : l'organisation reste utilisable et exportable, et `POST /settings/org/restore` annule.
  - Au terme, le job `PurgeDeletedOrganizations` (04:45) :
    - résilie l'abonnement ;
    - efface les fichiers Cloudinary ligne par ligne (PDF compris), puis le logo ;
    - purge les bateaux, corbeille comprise ;
    - bascule les membres qui ont une autre organisation et anonymise ceux qui n'en ont pas ;
    - supprime l'organisation.
  - Audit `organization.delete_requested` / `organization.delete_cancelled`.
- **Après une résiliation**, rien n'est purgé automatiquement : la FAQ et les CGV promettent que l'organisation repasse sur Starter et garde ses données. La suppression définitive reste une démarche de l'admin, décrite ci-dessus.
- **Compte démo** : exclu de l'export, du départ et de la suppression.
- **Écrans.**
  - `/settings/me` gagne une zone dangereuse : « Exporter mes données », « Mes organisations » et « Supprimer mon compte ».
  - `/settings/org` gagne « Supprimer l'organisation », réservé aux admins.
  - Le layout affiche le bandeau de suppression programmée.
  - Clés `settings.danger.*`, `flash.account.*`, `flash.organizationDeletion.*`, en vouvoiement.
- **Textes légaux.** La politique de confidentialité (durée de conservation) et les CGU (résiliation) mentionnent la suppression depuis les réglages et ses délais. Leur date de mise à jour passe au 2 octobre 2026.
- **Assistant.** Nouvelles entrées `account-data-and-deletion` et `organization-deletion` dans la base de connaissance.
- **Tests.**
  - Fonctionnels : export limité à la personne ; départ, dernier admin, seule organisation, organisation étrangère ; suppression (mot de passe, confirmation, dernier admin, coupure des accès, rétractation par reconnexion, anonymisation au terme et pas avant) ; organisation (refus au membre, nom erroné, programmation et annulation avec Stripe simulé, purge des fichiers, bateaux et membres, grâce respectée) ; compte démo.
  - Vitest : cartes de la zone dangereuse et bandeau.
- **Hors périmètre** : le compte Stripe Connect de l'organisation (#876) n'est pas fermé par la purge.
