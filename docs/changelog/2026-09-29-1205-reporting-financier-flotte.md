# 2026-09-29 — Reporting financier de flotte : revenus vs coûts, marge, occupation (#887)

FleetAi collectait les dépenses, les réservations, les factures et le journal
de bord, mais ne les croisait jamais : le budget se lisait bateau par bateau,
le tableau de bord ne donnait que des instantanés. Une page de reporting
répond désormais à « ce bateau me rapporte-t-il plus qu'il ne me coûte ? ».

- **Page `/reports`** (`reports.index`) : sélecteur de période (mois,
  trimestre, année, 12 derniers mois, personnalisée) et de bateau ; KPI avec
  variation vs période précédente (coûts, revenus de location, marge,
  occupation, encaissé, coût par jour loué, par heure moteur, par mille,
  entretien prévu) ; graphiques (dépenses empilées par poste et par mois,
  revenus vs coûts par bateau, occupation mensuelle, principaux postes) ;
  tableau par bateau avec total flotte.
- **Export CSV** : `GET /reports/export.csv` (`reports.export`), une ligne par
  bateau + total, en-têtes traduits.
- **Service** `FleetReportingService` (types `shared/types/reporting.ts`,
  helpers `shared/helpers/reporting.ts`) : agrégats SQL par bateau et par mois
  sur les postes du budget ; revenus = réservations confirmées au prorata des
  jours loués dans la période ; encaissé = factures payées − avoirs remboursés,
  hors marge ; coûts unitaires `null` sans dénominateur.
- **Accès** : nouvelle capability admin `reports.view`
  (`OrganizationPolicy.viewReports`) et nouveau flag de plan `canViewReports`
  (Pro et Entreprise). En Starter, aperçu figé sans données et
  `UpgradePlanModal` (`feature: 'reports'`). Revenus, marge et occupation
  suivent le module Location, l'encaissé le module Facturation.
- **Tableau de bord** : widget de galerie `fleet_margin` « Marge du mois »
  (masqué par défaut ; admin, Pro+, module Location), prop différée
  `fleetMargin`.
- **Copilote** : outil `fleet_financial_report` (« quel bateau me coûte le plus
  cher au mille ? »), cible de navigation `reports.index`, entrée de base de
  connaissance `fleet-financial-reporting`.
- **Navigation** : entrée « Reporting » (section Business, icône `chart`) pour
  les admins ; ligne `table_g5_r7` du comparatif de la page tarifs.
- **i18n** : nouveau domaine `reports.json` (en/fr) ; clés `nav.reports`,
  `assistant.navTargets.reports`, `settings.upgrade.reports`,
  `dashboard.widgets.fleet_margin`, `dashboard.widgetDescriptions.fleet_margin`,
  `dashboard.fleetMargin.*`, `marketing.table_g5_r7`.
- **Graphiques** : `use_chart_palette.ts` lit les tokens CSS et suit la bascule
  de thème — aucune couleur en dur dans les composants.
- **Hors périmètre** : multi-devises (#627), rapport e-mail (#871), export
  PDF, onglet « Rentabilité » de la fiche bateau (le filtre bateau et le lien
  vers le budget en tiennent lieu).
- **Tests** : unitaires `tests/unit/helpers/reporting.spec.ts` (périodes,
  prorata à cheval sur deux mois, ratios), intégration
  `tests/integration/services/fleet_reporting_service.spec.ts` (jeu de
  référence, comparaison, filtre bateau, cross-org), fonctionnels
  `tests/functional/reports/reports.spec.ts` (rôles, plan, modules, export,
  outil copilote), Vitest `reports_page.spec.ts`,
  `dashboard_fleet_margin_card.spec.ts`, `use_nav_sections.spec.ts`.
- Doc : `docs/domain/reporting.md`, guide `docs/user-guide/reporting-financier.md`.
