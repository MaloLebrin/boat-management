# 2026-09-16 — Montants du front dans la locale de l'app (vague 0.5)

Trois façons de formater un montant cohabitaient côté Vue, deux fausses :

- `use_currency_format` (`fr-FR` codé en dur) sur les budgets, actions
  d'équipement, défauts d'état des lieux et résultat du simulateur — une session
  anglaise lisait `1 234,50 €` ;
- `new Intl.NumberFormat(undefined, …)` dans les composants de facturation,
  la tarification et les saisons — `undefined` est la locale du **navigateur**,
  pas celle de l'app : une session française sur un navigateur anglais lisait
  `€1,200.00` (le cas #461 des dates, réintroduit pour la monnaie) ;
- `useNumberFormat()`, le seul correct (locale de l'app).

- **Correctif.** `useNumberFormat().formatCurrency(value, { currency, fractionDigits })` et `formatCurrencyNoDecimals()` délèguent au `formatCurrency` partagé de `shared/helpers/number_format.ts` ; `use_currency_format` est supprimé et ses 7 consommateurs migrés ; les 9 formateurs locaux (`InvoiceLinesCard`, `InvoiceTotalsPreview`, `InvoiceLinesEditor`, `BoatShowTabPricing`, `PricingSeasonList`, `invoices/index`, `ReservationQuoteCard`, `SimulatorResultCard`, `simulator_share`) passent par le composable. La page publique de partage, dont la locale est une prop, appelle le helper partagé directement et prend son lien depuis `marketingPath()` au lieu d'un ternaire `locale === 'fr'`.
- **Tests.** `tests/inertia/currency_locale.spec.ts` (3 tests, rouges avant le correctif : facturation en session française, budget et simulateur en session anglaise), `use_number_format.spec.ts` complété (fr/en, devise, euros ronds — reprend les cas de l'ancien `use_currency_format.spec.ts`), six specs repointées sur le composable.
- Dépend de la vague 0.5 « emails du simulateur et de facture » (helper `formatCurrency`).
