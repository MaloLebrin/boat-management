# 2026-07-05 — [#288] Facturation : créer un devis depuis une réservation

**Lot 4/4 (dernier) de l'epic Facturation (#282)** : raccourci métier pour générer un devis pré-rempli directement depuis une réservation, avec lien bidirectionnel réservation ↔ devis/facture.

- **Backend** :
  - `app/services/invoice_service.ts` :
    - `createQuoteFromReservation(org, reservation, { lineLabel })` : crée un devis brouillon (`kind: 'quote'`, numéro `DEV-`) lié à la réservation (`reservation_id`), résout le client via l'email snapshot de la réservation (sinon conserve le `client_name` texte libre comme snapshot), et ajoute une ligne unique tarifée à partir du `total_price` de la réservation (qui reflète déjà la tarification #284 quand disponible)
    - `listLinksByReservationIds(orgId, ids)` : lookup groupé (org-scopé) des devis/factures rattachés à un lot de réservations, pour l'affichage du lien bidirectionnel
  - `app/services/boat_reservation_service.ts` : `findForOrganization(orgId, id)` (réservation org-scopée, tous bateaux, avec le bateau préchargé)
  - `app/controllers/invoices_controller.ts` : action `createFromReservation` (`POST /invoices/from-reservation/:reservationId`), gatée Enterprise + policy `create`, construit le libellé de ligne via i18n et redirige vers le devis créé
  - `app/controllers/reservations_controller.ts` : la liste des réservations expose désormais `linkedInvoices` par réservation + le flag `canCreateQuote` (Enterprise)
  - Transformers : `toInvoiceDetail` expose `reservationBoatId` (deep-link) ; `toBoatReservationRow` accepte `linkedInvoices`
- **Note dépendance** : #275 (FK `client_id` sur `boat_reservations`) n'est pas encore livré → la résolution du client se fait par **email snapshot** (dégradation propre) ; elle basculera sur la FK directe quand #275 sera fait, sans changer le contrat
- **Frontend** :
  - `inertia/components/reservations/FleetReservationList.vue` : colonne « Documents » listant les devis/factures liés (liens) + bouton « Créer un devis » (Enterprise) qui `POST` vers la route de création
  - `inertia/pages/invoices/show.vue` : la réservation liée devient un lien vers la page des réservations du bateau
- **i18n** en + fr : `reservations.actions.createQuote`, `reservations.columns.documents`, `invoices.fromReservation.line`, `invoices.show.viewReservation`, `flash.invoices.quoteFromReservation`
- **Tests** :
  - 7 fonctionnels (`tests/functional/invoices/invoice_from_reservation.spec.ts`) : création du devis pré-rempli (numéro `DEV-`, `reservation_id`, ligne depuis `total_price`) ; résolution client par email ; conservation du nom libre sans client correspondant ; ligne à 0 sans `total_price` ; org-scoping (IDOR) ; gating non-Enterprise ; la liste des réservations expose `linkedInvoices` + `canCreateQuote`
  - 3 front (`tests/inertia/fleet_reservation_list.spec.ts`) : bouton « Créer un devis » (visibilité selon Enterprise + POST) et liens vers les documents rattachés
