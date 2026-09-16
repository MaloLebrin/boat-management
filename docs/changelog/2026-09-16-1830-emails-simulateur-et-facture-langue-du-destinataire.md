# 2026-09-16 — Emails du simulateur et de facture dans la langue du destinataire (vague 0.5)

La relance J+7 du simulateur public formatait ses montants en `fr-FR` quelle
que soit la langue du lead : un lead anglophone lisait « between 1 200 € and
3 400 € ». Les trois jobs d'email (relances J+3/J+7, rapport du simulateur,
envoi de devis/facture) construisaient par ailleurs leurs sujets et textes en
ternaires `isFr ? … : …`, contraires à la règle i18n du projet, chacun avec son
propre `Intl.NumberFormat`.

- **`shared/helpers/number_format.ts`** : `formatCurrency(value, locale, { currency, fractionDigits })` — un seul formateur monétaire qui suit la locale du lecteur (`1 234,56 €` / `€1,234.56`), jamais celle du serveur.
- **Jobs.** `SendSimulatorNurturingJob`, `SendSimulatorReportJob` et `SendInvoiceEmail` passent par `i18nManager.locale(locale)` + `i18n.t()` pour sujets, textes, conseils et libellés de catégories, et par `formatCurrency()` pour les montants. Le rapport affiche désormais ses totaux formatés (et non `1200 - 3400 EUR`). Les gabarits Edge conservent leur bascule `isFr` interne (hors périmètre).
- **Clés i18n** (`en` + `fr`) : `marketing.emails.nurturingD3`, `marketing.emails.nurturingD7`, `marketing.emails.simulatorReport` (namespace backend, exclu d'`appT`) et `invoices.email` (sujet, texte, libellés devis/facture). Les textes français retrouvent leurs accents.
- **Tests.** `tests/unit/helpers/number_format.spec.ts` (4 tests : fr/en, euros ronds, autre devise, locale inconnue → anglais, jamais le serveur) ; `tests/functional/simulator/simulator_email_jobs.spec.ts` (3 tests : relances et rapport en anglais et en français, montants inclus) ; `send_invoice_email_job.spec.ts` complété (sujet, corps et montant en `en` et `fr`).
