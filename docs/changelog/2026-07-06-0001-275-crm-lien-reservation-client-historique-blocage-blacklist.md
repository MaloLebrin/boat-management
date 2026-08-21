# 2026-07-06 — [#275] CRM : lien réservation ↔ client (historique + blocage blacklist)

**Lot 3/4 de l'epic CRM léger (#108)** : relie une réservation à une fiche client, avec historique côté client et blocage des clients blacklistés.

- **Base de données** : migration `1812000000000_add_client_id_to_boat_reservations_table.ts` — ajoute `client_id` (FK `clients`, `SET NULL`, nullable, indexée) à `boat_reservations` ; les champs texte `client_name`/`client_email`/`client_phone` restent comme **snapshot dénormalisé** (`down()` implémenté)
- **Modèle** : `boat_reservation.ts` — colonne `clientId` (relation résolue par requête directe, sans `@belongsTo` pour éviter une régression de typage `preload` self-référent Lucid)
- **Backend** :
  - `boat_reservation_service.ts` : résolution du client org-scopée (`#resolveClientId`) à la création **et** à la mise à jour, avec **blocage des clients blacklistés** (`ReservationBlacklistedClientError`) ; un `client_id` d'une autre organisation est ignoré ; `listForClient(orgId, clientId)` pour l'historique
  - `client_service.ts` : `listOptions(orgId)` (sélecteur) ; `#toRow` délègue à un nouveau `client_transformer.ts`
  - `clients_controller.ts` : action `show` (`GET /clients/:id`, gatée Enterprise) rendant la fiche client + l'historique des réservations
  - `boat_reservations_controller.ts` : persiste `clientId`, passe `clientOptions` à la page, mappe l'erreur blacklist en flash ; `reservations_controller`/`invoice_service` inchangés côté contrat
  - **Synergie #288** : `createQuoteFromReservation` privilégie désormais le `client_id` de la réservation (FK) avant de retomber sur l'email snapshot
- **Frontend** :
  - Sélecteur de client (optionnel) dans `ReservationForm.vue` et `ReservationEditModal.vue` (remplit le nom snapshot à la sélection) ; `clientOptions` propagé via `boats/reservations.vue` → `ReservationList`
  - Nouvelle fiche client `inertia/pages/clients/show.vue` (informations + historique des réservations) ; lien « Voir » depuis la liste des clients
- **i18n** en + fr : `reservations.form.client`/`noClientOption`, `clients.view`, `clients.show.*`, `flash.reservation.blacklistedClient`
- **Documentation** : nouveau `docs/domain/clients.md` (module CRM clients + lien réservation ↔ client : résolution org-scopée, blocage blacklist, historique, synergie #288), référencé dans `docs/README.md` et croisé depuis `docs/domain/reservations-and-pricing.md`
- **Tests** :
  - 6 fonctionnels (`tests/functional/boats/reservation_client_link.spec.ts`) : lien à la création, refus blacklist (création + mise à jour), `client_id` cross-org ignoré, suppression client → `client_id` NULL (snapshot conservé), historique sur la fiche client
  - Front (Vitest) : sélecteur de client dans le formulaire de réservation ; mocks `useForm` mis à jour pour `transform()`
