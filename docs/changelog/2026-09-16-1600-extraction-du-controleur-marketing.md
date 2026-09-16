# Extraction du contrôleur marketing : `MarketingContentService` et `MarketingPricingTableService`

**Date** : 2026-09-16 — plan de refactorisation TDD, vague 2.1.

## Problème

`app/controllers/marketing_controller.ts` faisait 1 972 lignes : dix builders
de copie (home, tarifs, à propos, contact, guide, aide, confidentialité, CGU,
mentions légales, CGV) et la logique tarifaire (`pricingCopyParams`,
`quotaCell`, `flagRow`, `auditCell`) vivaient dans le contrôleur, à côté de
onze actions d'une ligne.

## Changement — extraction seule, contrat de props inchangé

- `app/services/marketing_content_service.ts` : une méthode par page
  (`homePage(i18n)`, `pricingPage(i18n)`, `aboutPage`, `contactPage`,
  `guidePage`, `helpPage`, `privacyPage`, `termsPage`, `legalNoticePage`,
  `salesTermsPage`), corps des builders déplacés tels quels, constantes de
  copie (ancre et action du formulaire de contact, chemin de la démo, e-mails
  support et presse) avec eux.
- `app/services/marketing_pricing_table_service.ts` : `copyParams(locale)`
  (ex-`pricingCopyParams`), `quotaCell(t, …)`, `flagRow(t, …)`,
  `auditCell(t, …)` — les closures de la page tarifs deviennent des méthodes
  pures qui reçoivent la fonction de traduction. Taille de flotte de l'exemple
  de la FAQ (`FAQ_EXAMPLE_FLEET_SIZE`) avec elles.
- `app/controllers/marketing_controller.ts` : 80 lignes, injecte
  `MarketingContentService` ; `simulator()` inchangé.
- `shared/types/marketing.ts` : `MarketingTranslate` et `MarketingI18n`
  (contexte i18n restreint reçu par les services). Le
  `marketing_features_controller` garde son interface locale identique pour
  ne pas croiser la PR d'hygiène des imports (#661) ; à unifier ensuite.
- Aucune route, aucune prop, aucune chaîne ne change. Les types explicites des
  props home/tarifs (29 interfaces inline côté Vue) restent pour la vague 3.7.

## Tests

- **Caractérisation avant** : `tests/functional/marketing/props_snapshot.spec.ts`
  photographie les props de chaque page statique en `en` et `fr` dans
  `tests/functional/marketing/__fixtures__/*.json` (20 fixtures, déterminisme
  vérifié sur deux exécutions). Le refactor produit un diff nul.
  Régénération volontaire : `UPDATE_MARKETING_FIXTURES=1`.
- `tests/unit/services/marketing_pricing_table_service.spec.ts` (5 tests,
  écrits avant le service) : `copyParams` dérive tout du barème et suit la
  locale, `quotaCell`, `flagRow`, `auditCell`.
- Suites `marketing/*` existantes (98 tests avec les fixtures) inchangées ;
  `pnpm lint`, `tsc -b`, `node ace build`, suite backend complète.
