# 2026-09-28 — Avoirs (notes de crédit) sur les factures émises (#877)

Depuis #717, une facture émise est figée — la bonne règle comptable — mais rien
ne permettait de la corriger : une erreur de montant se rattrapait par une
annulation et une nouvelle facture, ce qui n'est pas conforme en France. Une
facture émise s'**avoire** désormais, en tout ou partie.

## Émission

- Bloc « Avoirs » sur la fiche d'une facture envoyée, en retard ou payée
  (`InvoiceCreditNotesCard.vue`) : avoirs déjà émis, total avoirs, reste à
  régler, bouton « Émettre un avoir ».
- Écran `GET /invoices/:id/credit-note` (`inertia/pages/invoices/credit_note.vue`) :
  motif obligatoire, lignes pré-remplies depuis la facture (avoir total), à
  retirer ou ajuster pour un avoir partiel, aperçu au taux de TVA de la
  facture, montant encore créditable.
- `POST /invoices/:id/credit-notes` (`CreditNotesController`, capacité
  `invoices.create`, module CRM & Facturation requis) → `CreditNoteService.issue`.
  Sans `lines`, avoir total en miroir (refusé si un avoir existe déjà).
- Règles : l'avoir hérite du client, de la réservation, de la devise et du
  taux de TVA ; montants **positifs** ; `Σ avoirs ≤ total` de la facture,
  facture verrouillée `FOR UPDATE` pendant l'émission. Refusé sur un devis, un
  brouillon, une facture annulée ou déjà entièrement avoirée.

## Modèle

- Migration `1868000000000_add_credit_notes_to_invoices` :
  `invoices.kind` accepte `credit_note`, `invoices.status` accepte `credited`
  (contraintes CHECK recréées), nouvelle FK `invoices.credited_invoice_id`
  (auto-référente, `RESTRICT`, indexée). Le `down()` supprime les avoirs.
- Numérotation dédiée `AV-000001` (compteur `invoice_counters.kind =
'credit_note'`, sans trou). `InvoiceService.allocateNumber` devient public.
- Un avoir naît `sent` (« Émis ») ; son paiement, saisi par
  `PATCH /invoices/:id/payment`, est le **remboursement** (`paid`,
  « Remboursé »). La facture passe à `credited` (« Annulée par avoir ») quand
  les avoirs atteignent son total — elle n'encaisse plus rien et garde son
  `paid_at` si elle était payée.
- Un avoir, et une facture qui en porte, ne se suppriment pas.

## Effets de bord

- `InvoiceDetail` gagne `creditedInvoiceId`, `creditedInvoice`, `creditNotes`,
  `creditedTotal`, `balanceDue` (helper partagé `invoiceBalanceDue`).
- Paiement en ligne (#876) : la page `/pay/:token` et la session Checkout
  portent le **reste à régler** net des avoirs ; un paiement Stripe reçu sur
  une facture `credited` est ignoré (journalisé).
- Tableau de bord « Facturation » : encours et impayés nets des avoirs,
  encaissé du mois net des avoirs remboursés.
- PDF : titre « Avoir », mention « Avoir sur la facture n° … du … », statut
  Émis/Remboursé, « Total de l'avoir (à déduire) », « Motif de l'avoir ».
  E-mail : « l'avoir » / « Avoir » dans le gabarit existant.
- Liste `/invoices` : filtre de type « Avoir », filtre de statut « Annulée par
  avoir ». Badge de statut adapté aux avoirs.
- Journal d'audit : `invoice.credit_note_issued`.
- Copilote : entrée `invoice-credit-note` dans `product_knowledge.ts`.

## Hors périmètre

- Machine à états stricte sur `status` (devis et brouillons restent librement
  modifiables par le formulaire).
- Proposition d'un avoir à l'annulation d'une réservation facturée.
- Remboursement Stripe déclenché depuis FleetAi, e-mail dédié aux avoirs,
  export comptable (FEC).
