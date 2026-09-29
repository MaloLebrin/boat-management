# Reporting financier de flotte (#887)

La question que se pose tout gestionnaire — « ce bateau me rapporte-t-il plus
qu'il ne me coûte ? » — avait toutes ses données dans l'app, mais jamais
croisées : budget par bateau, factures d'un côté, occupation de l'autre. Le
reporting les rapproche sur une période et un périmètre (flotte ou bateau).

## Où ça vit

| Couche     | Fichier                                                                             |
| ---------- | ----------------------------------------------------------------------------------- |
| Service    | `app/services/fleet_reporting_service.ts` (`getReport`, `getMonthMarginForUser`)    |
| Helpers    | `shared/helpers/reporting.ts` (périodes, prorata, ratios), `reporting_delta.ts`     |
| Types      | `shared/types/reporting.ts`                                                         |
| Contrôleur | `app/controllers/reports_controller.ts` — `GET /reports`, `GET /reports/export.csv` |
| Validator  | `app/validators/report.ts` (`period`, `from`, `to`, `boat` en query string)         |
| Page       | `inertia/pages/reports/index.vue` + `inertia/components/reports/`                   |
| Widget     | `fleet_margin` (« Marge du mois »), `DashboardFleetMarginCard.vue`                  |
| Copilote   | outil `fleet_financial_report`, entrée `fleet-financial-reporting`                  |

## Accès

- **Rôle** : `reports.view`, admin seul (`OrganizationPolicy.viewReports`) —
  même périmètre que la carte « Dépenses » du tableau de bord (#832).
- **Plan** : `canViewReports`, dès **Pro** (capacité de tier pure). Un admin
  Starter voit la page figée (`locked: true`, `report: null`) : aucune donnée ne
  quitte le serveur, seule l'invitation à passer Pro s'affiche.
- **Modules** : les revenus de location, l'occupation, la marge et le coût par
  jour loué ne s'affichent qu'avec le module **Location** (`charterEnabled`) ;
  la colonne « Encaissé » qu'avec le module **Facturation** (`invoicingEnabled`).
  Les coûts se lisent sans aucun module.
- **Export CSV** : `canExport` (Pro et Entreprise) en plus des deux gardes
  ci-dessus.
- Un `boat_owner` est renvoyé vers son portail, comme sur les autres écrans staff.

## Périodes

`resolveReportPeriod(preset, today, custom)` — bornes en jours civils inclus :

| Préréglage  | Période                                    | Période de comparaison  |
| ----------- | ------------------------------------------ | ----------------------- |
| `month`     | mois civil en cours (défaut)               | mois précédent          |
| `quarter`   | trimestre civil en cours                   | trimestre précédent     |
| `year`      | année civile en cours                      | année précédente        |
| `rolling12` | les 12 derniers mois, mois courant compris | les 12 mois d'avant     |
| `custom`    | `from` → `to`                              | même durée, juste avant |

Une plage personnalisée incomplète, inversée, invalide ou plus longue que
`REPORT_MAX_RANGE_DAYS` (3 ans) retombe sur le mois courant : c'est un filtre
d'affichage, pas une saisie à rejeter. La « saison » n'est pas un préréglage :
une plage personnalisée la couvre.

## Ce qui est compté

**Coûts** — les six postes du budget par bateau (`BudgetService`), pour qu'un
même euro se lise au même endroit sur les deux écrans : pièces des événements
d'entretien (`performed_at`), pleins (`fueled_at`), documents
(`coalesce(issued_at, created_at)`), escales (`started_at`), achats
d'équipements (`purchased_at` : génériques, sécurité, voiles, pièces moteur) et
dépenses libres (`date`). Une dépense libre reste dans « Dépenses libres »
quelle que soit sa catégorie, comme sur la page budget.

**Revenus de location** — prix (`total_price`) des réservations **confirmées**
qui chevauchent la période, **au prorata** des jours de location compris dans
la période (et dans chaque mois pour la série mensuelle). Une croisière du 27
mai au 6 juin compte pour moitié en mai et pour moitié en juin. Options et
annulations sont ignorées ; une réservation sans prix compte ses jours, pas
d'euros.

**Encaissé** — factures payées dans la période (`paid_at`), moins les avoirs
remboursés dans la période (#877) : même lecture que la carte « Facturation ».
Rattaché à un bateau par la réservation de la facture ; une facture sans
réservation ne compte que dans le total de la flotte, jamais dans un bateau
filtré. L'encaissé **n'entre pas dans la marge** : il porte souvent le même
argent que la réservation qu'il facture.

**Marge** — revenus de location − coûts.

**Occupation** — jours-bateau loués (réservations confirmées, bornées à la
période) / (bateaux × jours de la période), en %.

**Journal de bord** — heures moteur (`engine_hours_end − engine_hours_start`,
écarts négatifs ignorés) et milles (`distance_nm`) des sorties parties dans la
période.

**Coûts unitaires** — coût par heure moteur, par jour loué, par mille :
`null` (affiché « — ») quand le dénominateur est nul, jamais un ratio inventé.

**Entretien prévu** — `BudgetService.getPlannedMaintenance` (#868) : coûts
estimés des tâches ouvertes dues d'ici la fin du trimestre, et le nombre de
tâches sans estimation.

## Requêtes

Tout est agrégé en SQL, `SUM … GROUP BY boat_id, to_char(date, 'YYYY-MM')`
(neuf requêtes de coûts, une de factures, une de journal de bord), exécuté deux
fois (période et comparaison). Seules les réservations confirmées remontent
ligne à ligne, pour le prorata.

Index utiles : déjà en place, `boat_reservations_overlap_idx`
(`boat_id, starts_at, ends_at, status`), `invoices (organization_id, kind,
status)`, `navigation_logs.departed_at`, `boat_sails.boat_id`. À poser avec
#857 (clés étrangères sans index) : `boat_id` sur `boat_fuel_logs`,
`boat_port_stays`, `boat_budget_entries`, `boat_documents`,
`boat_maintenance_events`, `boat_generic_equipment`, `boat_safety_equipment`,
`navigation_logs` ; `boat_engine_id` sur `boat_engine_parts` ;
`reservation_id` sur `invoices`. Les requêtes restent correctes sans eux ;
seules les grosses flottes les sentiront.

**Cloisonnement** : le contrôleur passe la liste des bateaux de l'organisation
(`BoatListService.listNamesForOrg`) ; le service ne lit que ces `boat_id`-là, et
les factures et réservations sont en plus bornées à `organization_id`. Un
`boat` en query string qui n'est pas dans la liste ne filtre rien : on retombe
sur la flotte.

## Export CSV

`GET /reports/export.csv` (mêmes paramètres) : une ligne par bateau, puis
« TOTAL FLOTTE ». Colonnes `reports.csv.*` traduites dans la locale de
l'utilisateur, montants numériques (sommables dans un tableur), séparateur `;`
et BOM UTF-8 (`buildCsv`). Nom : `rapport_flotte_<from>_<to>.csv`.

## Hors périmètre

- Multi-devises (#627) : une seule devise d'organisation.
- Rapport e-mail mensuel (#871) : il consommera ce service.
- Statistiques par `operation_key` (v2 maintenance).
- Export PDF du rapport et onglet « Rentabilité » sur la fiche bateau : le
  filtre bateau de `/reports` et le lien de chaque ligne vers le budget du
  bateau en tiennent lieu pour l'instant.
