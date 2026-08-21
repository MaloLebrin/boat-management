# 2026-07-06 — [#290] Location 2/3 : contrat de location (génération PDF + statuts + envoi email)

**Deuxième PR de l'epic #283 (Contrats de location & états des lieux)**, après #289. Génère un contrat de location PDF à partir d'une réservation (bateau, client, période, conditions générales), avec un cycle de statuts `draft → sent → signed` et un envoi par email au client.

- **Base de données** : migration `1814000000000_create_rental_contracts_table.ts` — table `rental_contracts` (`organization_id`, `reservation_id` FK `boat_reservations` cascade unique — un seul contrat par réservation, `client_id` FK `clients` nullable `SET NULL`, `status` check `draft`/`sent`/`signed`, `signed_at`, `media_id` FK `media` nullable — **réservé pour #291** signature/upload du PDF signé, non exploité dans ce lot)
- **Backend** :
  - `app/models/rental_contract.ts`, `app/services/rental_contract_service.ts` (création depuis une réservation avec résolution du client CRM comme pour les devis, transitions `draft→sent`/`sent→signed`, suppression), `app/services/rental_contract_pdf_service.ts` (génération PDF avec branding org, calquée sur `invoice_pdf_service.ts`)
  - `app/exceptions/rental_contract_errors.ts`, `app/transformers/rental_contract_transformer.ts`
  - `shared/types/permissions.ts` : nouvelles capacités `rentalContracts.view/create/edit` (member) et `rentalContracts.delete` (admin-only) ; `app/policies/rental_contract_policy.ts`
  - Envoi email : `app/services/email_queue_service.ts#sendRentalContract`, `app/jobs/send_rental_contract_email.ts` (régénère le PDF dans le worker, pièce jointe), template `resources/views/emails/rental_contract.edge`
  - Routes : `GET/POST boats/:boatId/reservations/:reservationId/contract`, `GET .../contract/pdf`, `POST .../contract/send`, `POST .../contract/sign`, `DELETE .../contract`
- **Frontend** : page `boats/reservation_contract`, composants `ContractPanel`/`ContractStatusBadge`, bouton d'accès depuis `ReservationList`
- **i18n** : nouveau domaine `rentalContracts.json` (en/fr, incluant les textes du PDF), clés `flash.rentalContracts.*`, `reservations.actions.contract`
- **Tests** : `tests/functional/boats/rental_contracts.spec.ts` (CRUD, policy admin/member, unicité par réservation, transitions de statut, scoping org, téléchargement PDF), `tests/functional/boats/send_rental_contract_email_job.spec.ts` (génération PDF + envoi email avec pièce jointe)
