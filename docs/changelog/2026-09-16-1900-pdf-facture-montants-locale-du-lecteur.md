# 2026-09-16 — PDF de facture : montants dans la locale du lecteur (vague 0.5)

`InvoicePdfService` formatait les montants du tableau des lignes et des totaux
avec `new Intl.NumberFormat(undefined, …)` : `undefined` désigne la locale du
**serveur**, celle du conteneur de production — un devis demandé en français
sortait avec des montants « €120.00 ». Les dates du même document suivaient
déjà `i18n.locale`.

- **Correctif.** Les deux formateurs passent par `formatCurrency(value, i18n.locale, { currency: invoice.currency })` (`shared/helpers/number_format.ts`) : `120,00 €` en français, `€120.00` en anglais, et la devise de la facture est respectée.
- **Tests.** `tests/functional/invoices/invoice_pdf_email.spec.ts` : nouveau test (rouge avant le correctif) qui capture les chaînes écrites par PDFKit — le flux PDF étant compressé — et vérifie les montants rendus en `fr` et en `en`.
- Dépend de la vague 0.5 « emails du simulateur et de facture » (helper `formatCurrency`).
