# 2026-07-05 — [#286] Facturation : génération PDF + envoi email

**Lot 2/4 de l'epic Facturation (#282)** : génération de PDF pour les devis/factures et envoi par email au client avec pièce jointe.

- **Backend** :
  - `app/services/invoice_pdf_service.ts` : génération PDF A4 via pdfkit avec en-tête brandé (logo/couleurs org si plan Enterprise + white-label activé, sinon branding FleetView par défaut), métadonnées (dates, statut, client), tableau des lignes zébré avec pagination automatique, totaux, notes et mentions légales. Tous les libellés via i18n (`invoices.pdf.*`)
  - `app/jobs/send_invoice_email.ts` : job dédié `SendInvoiceEmail` (queue `emails`, 5 retries max) qui recharge l'invoice et l'org, construit un contexte i18n pour la locale demandée via `i18nManager.locale()`, génère le PDF via `InvoicePdfService` résolu par le container (`app.container.make()`), rend le template Edge, envoie l'email avec pièce jointe PDF via `message.attachData(buffer, { filename, contentType })`
  - `app/services/email_queue_service.ts` : nouvelle méthode `sendInvoice({ invoiceId, organizationId, to, locale })` avec clé de dédup unique par envoi (timestamp) pour autoriser les renvois
  - `app/controllers/invoices_controller.ts` : 2 nouvelles actions `downloadPdf` (téléchargement direct du PDF, inline ou attachment) et `send` (enfile l'email + transition automatique `draft → sent`)
  - Routes : `GET /invoices/:id/pdf` (`invoices.pdf`), `POST /invoices/:id/send` (`invoices.send`)
- **Template email** : `resources/views/emails/invoice.edge` (bilingue FR/EN, utilise le layout existant, mentionne le montant total et la pièce jointe)
- **i18n** : namespace `invoices.pdf.*` (titre devis/facture, colonnes tableau, totaux, mentions légales, footer paginé) en + fr ; `flash.invoices.sent` et `flash.invoices.noClientEmail` en + fr
- **Branding** : utilise `PLAN_LIMITS[org.plan].canWhiteLabel` pour décider si le logo/couleurs de l'org sont appliqués ; sinon couleur primaire par défaut `#1e3a5f`
- **Frontend** : boutons « Télécharger le PDF » (lien vers `/invoices/:id/pdf`) et « Envoyer par email » (POST `/invoices/:id/send`) sur la fiche facture (`inertia/pages/invoices/show.vue`), avec affichage des flash succès/erreur ; clés `invoices.actions.*`
- **Sécurité / statut** : envoi refusé (flash) si le client n'a pas d'email ; transition `draft → sent` uniquement (une facture payée/annulée n'est pas rétrogradée) ; PDF et envoi org-scopés (IDOR) et gatés Enterprise
- **Tests** : 6 fonctionnels (`tests/functional/invoices/invoice_pdf_email.spec.ts`) — buffer `%PDF` valide, téléchargement (content-type/taille), IDOR, gating non-Enterprise, envoi → statut `sent` + flash, refus sans email
