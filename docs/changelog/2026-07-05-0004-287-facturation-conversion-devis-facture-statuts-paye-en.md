# 2026-07-05 — [#287] Facturation : conversion devis → facture + statuts payé/en retard

**Lot 3/4 de l'epic Facturation (#282)** : cycle de vie du document — conversion d'un devis en facture, marquage « payé » et bascule automatique en « en retard ».

- **Base de données** : migration `1811000003000_add_lifecycle_to_invoices_table.ts` — ajoute `paid_at` (date, nullable) et `source_quote_id` (FK auto-référente vers `invoices`, SET NULL, indexée) à la table `invoices` (down implémenté)
- **Modèle** : `app/models/invoice.ts` — colonnes `paidAt` et `sourceQuoteId` (la relation auto-référente n'est pas déclarée : Lucid ne sait pas typer un `preload` self-référent → les documents liés sont chargés explicitement, org-scopés)
- **Backend** :
  - `app/services/invoice_service.ts` :
    - `convertToInvoice(quote)` : crée une nouvelle facture (`kind: 'invoice'`, nouveau numéro `FAC-` via le compteur gap-free), recopie client/réservation/lignes/TVA/notes du devis, `sourceQuoteId` pointant vers le devis d'origine, statut réinitialisé à `draft`. Un devis ne peut être converti qu'une fois (garde contre double conversion et contre la conversion d'un non-devis)
    - `markAsPaid(invoice)` : passe le statut à `paid` et horodate `paidAt` (uniquement pour une facture non annulée)
    - `markOverdueInvoices(now)` : bascule en `overdue` toute facture `sent`, non payée, dont l'échéance est dépassée (idempotent) ; renvoie le nombre de lignes mises à jour
    - `getLinks(invoice)` : résout le devis d'origine et la facture convertie (org-scopés)
  - `app/exceptions/invoice_errors.ts` : `NotAQuoteError`, `QuoteAlreadyConvertedError`, `CannotMarkPaidError`
  - `app/controllers/invoices_controller.ts` : actions `convert` (POST `/invoices/:id/convert`) et `markPaid` (POST `/invoices/:id/pay`), gatées Enterprise + policy `update`, avec gestion des erreurs métier en flash
  - `app/jobs/mark_overdue_invoices.ts` + `start/scheduler.ts` : job planifié quotidien (6 h, Europe/Paris) qui appelle `markOverdueInvoices`
- **Frontend** (`inertia/pages/invoices/show.vue`) : boutons « Convertir en facture » (devis non converti) et « Marquer comme payée » (facture non payée/annulée) ; liens vers le devis d'origine / la facture convertie ; affichage de la date de paiement. Extraction du tableau des lignes en `components/invoices/InvoiceLinesCard.vue` (respect de la limite de 250 lignes)
- **i18n** en + fr : `invoices.actions.convert`/`markPaid`, `invoices.show.paidOn`/`convertedFrom`/`convertedTo` ; `flash.invoices.converted`/`notAQuote`/`alreadyConverted`/`paid`/`cannotMarkPaid`
- **Tests** :
  - 8 fonctionnels (`tests/functional/invoices/invoice_lifecycle.spec.ts`) : conversion devis→facture (numéro `FAC-`, lien, lignes recopiées, statut `draft`), refus de convertir un non-devis, refus de double conversion, org-scoping (IDOR), marquage payé + horodatage, refus de marquer un devis payé, gating non-Enterprise, `markOverdueInvoices` ne bascule que les factures `sent`/non payées/échues
  - 4 front (`tests/inertia/invoice_show_actions.spec.ts`) : visibilité/POST des boutons convertir et payer selon `kind`/statut
