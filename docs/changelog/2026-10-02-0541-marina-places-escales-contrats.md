# 2026-10-02 — Marina : places dimensionnées, escales visiteurs, contrats d'amarrage (#891)

Le module Marina livrait un beau plan 2D, mais une place n'y était qu'un nom : ni taille, ni prix,
ni escale, ni contrat. Une capitainerie ne pouvait pas enregistrer un bateau de passage pour trois
nuits, ni facturer une place à l'année. Détail complet : `docs/domain/ports-and-marina.md`.

- **Places.** Migration `1884000000000_add_marina_operations` : `spots` gagne `length_m`, `beam_m`,
  `draft_m`, `kind` (`annual`, `seasonal`, `visitor`, `technical`), `status` saisi (`available`,
  `reserved`, `out_of_service` — « occupée » se déduit d'un bateau amarré ou d'une escale en cours),
  `daily_rate`, `monthly_rate`, `annual_rate`, `notes`. `PUT /spots/:id` et les deux créations les
  acceptent, tous facultatifs ; un ancien corps (nom seul) ne vide pas les champs d'exploitation.
- **Plan.** Les places sans bateau de la flotte prennent la couleur de leur statut (réservée, hors
  service, escale en cours), avec une infobulle nom/statut/dimensions/occupant. Le filtre « Bateau
  de N m » surligne les places **libres** assez longues et les compte ; légende sous le plan.
- **Escales.** Table `marina_stays` : bateau de la flotte ou visiteur (nom, longueur,
  immatriculation, contact — hors flotte et hors quota), place, dates, tarif nuitée (celui de la
  place par défaut), services consommés (JSON), client à facturer. Statuts `expected` → `arrived` →
  `departed` → `invoiced` (ou `cancelled`). Refus : place hors service, chevauchement d'une autre
  escale active, invité absent. Avertissement non bloquant : bateau plus long que la place, place
  attribuée à un bateau de la flotte.
- **Facture d'escale.** `POST /ports/:portId/marina-stays/:marinaStayId/invoice` crée un brouillon
  (place × nuitées, puis une ligne par service, TVA 20 % modifiable) dans la transaction de
  l'escale, qui passe `invoiced` : jamais deux factures pour une escale. Une escale facturée ne se
  supprime plus. `InvoiceService.create` accepte désormais la transaction de l'appelant.
- **Contrats d'amarrage.** Table `mooring_contracts` (client, place, bateau facultatif, début, fin
  incluse facultative, périodicité mensuelle/trimestrielle/annuelle, montant HT). Un seul contrat
  actif par place. Nouveau job `GenerateMooringContractInvoices` (cron 05:45 Europe/Paris) : un
  brouillon par échéance arrivée, rattrapage borné, idempotent, échéances recalculées depuis le
  début du contrat (un 31 janvier ne dérive pas au 28). Résilier arrête la facturation ; un contrat
  déjà facturé se résilie mais ne se supprime pas. Badge « à renouveler » à 30 jours de la fin.
- **Capitainerie.** Nouvel onglet de la fiche port : places occupées, taux d'occupation du jour et
  du mois (place-nuits, sans double compte), arrivées et départs du jour, listes des escales et des
  contrats avec leurs gestes. Props `harbour` et `clients` sur `ports/show`.
- **Routes.** `POST /ports/:portId/marina-stays`, `PATCH …/:marinaStayId/status`,
  `POST …/:marinaStayId/invoice`, `DELETE …/:marinaStayId`, `POST /ports/:portId/mooring-contracts`,
  `PATCH …/:contractId/terminate`, `DELETE …/:contractId` — toutes dans le groupe gardé (Entreprise,
  profil professionnel), autorisées sur la place (`SpotPolicy` : un member pose et fait avancer, seul
  l'admin supprime ; facturer exige aussi `invoices.create`).
- **Garde de suppression.** Une place tenue par une escale active ou un contrat actif ne se
  supprime plus (`flash.spots.hasActiveBooking`).
- **Tests.** `tests/functional/ports/marina_stays.spec.ts`, `mooring_contracts.spec.ts`,
  `tests/integration/jobs/generate_mooring_contract_invoices.spec.ts`,
  `tests/integration/services/harbour_office_service.spec.ts`, `tests/unit/helpers/marina.spec.ts`,
  `tests/inertia/harbour_office.spec.ts` ; fixture cross-org étendue (escale, contrat).
- **Hors périmètre** (suivi à ouvrir) : catalogue de services du port (`port_services`) au lieu des
  lignes libres, prorata de la dernière échéance, rappel e-mail de renouvellement, export dédié des
  escales, réservation en ligne par un plaisancier de passage, suivi AIS.
