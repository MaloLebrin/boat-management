# 2026-07-05 — [#285] Facturation : socle devis/factures (CRUD, numérotation, plan Enterprise)

**Lot 1/4 de l'epic Facturation (#282)** : nouveau module `invoices` org-scopé (devis + factures), réservé au plan Enterprise. Comprend le CRUD complet, la numérotation sans trou et le gating Enterprise.

- **Base de données** :
  - Table `invoices` (`organization_id`, `client_id` FK SET NULL, `reservation_id` FK SET NULL, `kind` enum quote/invoice, `number`, `client_name` snapshot, `status` enum draft/sent/paid/overdue/cancelled, `issued_at`, `due_at`, decimals `subtotal`/`tax_rate`/`tax_amount`/`total`, `currency`, `notes`, timestamps) + contrainte UNIQUE `(organization_id, kind, number)` + index `(organization_id, kind, status)` et `(organization_id, issued_at)`
  - Table `invoice_lines` (`invoice_id` FK CASCADE, `label`, `quantity`, `unit_price`, `amount`, `position`, timestamps) + index `invoice_id`
  - Table `invoice_counters` (`organization_id` FK CASCADE, `kind`, `last_number`, timestamps) + contrainte UNIQUE `(organization_id, kind)`
- **Numérotation gap-free** : préfixe `DEV-` pour les devis, `FAC-` pour les factures, numéro sur 6 chiffres (ex: `FAC-000001`). Allocation via INSERT ON CONFLICT IGNORE + SELECT FOR UPDATE sur `invoice_counters`
- **Backend** :
  - `app/models/invoice.ts`, `app/models/invoice_line.ts`, `app/models/invoice_counter.ts` (decimals en `string`)
  - `app/services/invoice_service.ts` : CRUD org-scopé, `normalizeFilters`, `search` (pagination, filtres status/kind/clientId/q/period), `listClientOptions`, numérotation gap-free transactionnelle, snapshot `client_name`
  - `app/validators/invoice.ts` : `createInvoiceValidator`, `updateInvoiceValidator`
  - `app/transformers/invoice_transformer.ts` : `toInvoiceRow`, `toInvoiceDetail`
  - `app/policies/invoice_policy.ts` (suppression admin-only)
  - `app/exceptions/invoice_errors.ts` : `InvoiceNotFoundError`
  - `app/controllers/invoices_controller.ts` : actions index/show/create/store/edit/update/destroy
  - Routes `start/routes/invoices.ts` : GET/POST/PUT/DELETE `/invoices`
- **Gating Enterprise** : flag `canManageInvoices` dans `shared/types/plan.ts` (Enterprise uniquement), `quotaService.canManageInvoices()` + `assertCanManageInvoices()`, `QuotaFeature 'invoices'`
- **Cœur partagé** : `shared/helpers/invoice_totals.ts` — fonction pure `computeInvoiceTotals(lines, taxRate)` (montant par ligne, sous-total, TVA sur assiette unique, total ; arrondi 2 décimales) utilisée backend (persistance) ET frontend (aperçu live)
- **Types partagés** : `shared/types/invoice.ts` (`InvoiceKind`, `InvoiceStatus`, `InvoiceRow`, `InvoiceDetail`, `InvoiceLineInput`, `InvoiceLineRow`, `CreateInvoicePayload`, `UpdateInvoicePayload`, `InvoiceListFilters`, `InvoicesPaginated`)
- **Frontend** : liste filtrable (`/invoices`, filtres statut/type/client/période + pagination), pages dédiées détail (`/invoices/:id`) et création/édition multi-lignes (`/invoices/new`, `/:id/edit`) avec éditeur de lignes et aperçu live des totaux ; item de menu « Factures » visible uniquement en Enterprise
- **i18n** : namespace `invoices.*` + `nav.invoices` + `flash.invoices.*` (created, updated, deleted, notFound) + `flash.quota.invoicesExceeded` (en + fr)
- **Tests** : 6 unitaires (`computeInvoiceTotals`) + 10 fonctionnels (CRUD, numérotation séquentielle/indépendante par kind/non réutilisée après suppression, totaux serveur, snapshot client, cascade des lignes, org-scoping, IDOR, gating, non authentifié) + 3 Vitest (éditeur de lignes)
