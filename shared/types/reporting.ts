import type { PlannedMaintenanceSummary } from './budget.js'

/**
 * Vue financière de flotte (#887). Les postes de coût sont ceux du budget par
 * bateau (`BudgetService`) : un même euro se lit au même endroit sur la page
 * budget d'un bateau et dans le reporting de la flotte.
 */
export const REPORT_COST_CATEGORIES = [
  'maintenance',
  'fuel',
  'documents',
  'port',
  'equipment',
  'entries',
] as const
export type ReportCostCategory = (typeof REPORT_COST_CATEGORIES)[number]

/**
 * Périodes proposées. `rolling12` : les douze derniers mois, mois courant
 * compris. `custom` : bornes `from`/`to` libres (dates incluses).
 */
export const REPORT_PERIOD_PRESETS = ['month', 'quarter', 'year', 'rolling12', 'custom'] as const
export type ReportPeriodPreset = (typeof REPORT_PERIOD_PRESETS)[number]

/** Au-delà, la série mensuelle devient illisible et les requêtes coûteuses. */
export const REPORT_MAX_RANGE_DAYS = 3 * 366

export interface ReportPeriod {
  preset: ReportPeriodPreset
  /** Premier jour inclus, `YYYY-MM-DD`. */
  from: string
  /** Dernier jour inclus, `YYYY-MM-DD`. */
  to: string
  days: number
}

export type ReportCostBreakdown = Record<ReportCostCategory, number> & { total: number }

/** Indicateurs d'un périmètre (un bateau ou la flotte) sur une période. */
export interface ReportMetrics {
  costs: ReportCostBreakdown
  /**
   * Revenus de location : prix des réservations **confirmées**, au prorata
   * des jours de location compris dans la période.
   */
  rentalRevenue: number
  /**
   * Factures encaissées dans la période, nettes des avoirs remboursés. Pour
   * information : la marge ne l'additionne pas aux revenus de location, qui
   * portent souvent le même argent.
   */
  invoicedPaid: number
  /** `rentalRevenue − costs.total`. */
  margin: number
  /** Jours-bateau loués (réservations confirmées, bornées à la période). */
  rentalDays: number
  /** `rentalDays / (bateaux × jours)`, en %, arrondi à l'entier. */
  occupancyRate: number
  /** Heures moteur relevées au journal de bord (départ − arrivée). */
  engineHours: number
  /** Milles parcourus au journal de bord. */
  distanceNm: number
  /** `null` quand le dénominateur est nul : pas de ratio inventé. */
  costPerEngineHour: number | null
  costPerRentalDay: number | null
  costPerNauticalMile: number | null
}

export interface FleetReportBoatRow extends ReportMetrics {
  boatId: number
  boatName: string
}

export interface FleetReportMonth {
  /** `YYYY-MM`. */
  month: string
  costs: ReportCostBreakdown
  rentalRevenue: number
  occupancyRate: number
}

export interface FleetReport {
  period: ReportPeriod
  previousPeriod: ReportPeriod
  /** Bateau filtré, sinon `null` pour la flotte entière. */
  boatId: number | null
  totals: ReportMetrics
  previousTotals: ReportMetrics
  /** Triés par coût total décroissant. */
  boats: FleetReportBoatRow[]
  monthly: FleetReportMonth[]
  /** Entretien estimé des tâches ouvertes d'ici la fin du trimestre (#868). */
  plannedMaintenance: PlannedMaintenanceSummary
}

export interface FleetReportQuery {
  preset: ReportPeriodPreset
  from?: string | null
  to?: string | null
  boatId?: number | null
}

export interface ReportBoatOption {
  id: number
  name: string
}

export interface ReportsPageProps {
  /** Starter : aperçu figé, sans données, et invitation à passer au plan Pro. */
  locked: boolean
  report: FleetReport | null
  boats: ReportBoatOption[]
  query: FleetReportQuery
  /** Module Location : revenus, occupation et coût par jour de location. */
  charterEnabled: boolean
  /** Module Facturation : colonne « Encaissé ». */
  invoicingEnabled: boolean
  canExport: boolean
}

/**
 * Widget « Marge du mois » du tableau de bord (#887) : le mois civil en cours
 * lu par le même service que `/reports`, comparé au mois précédent.
 */
export interface DashboardFleetMargin {
  period: ReportPeriod
  rentalRevenue: number
  costs: number
  margin: number
  previousMargin: number
  /** Bateau le plus coûteux du mois, `null` quand aucun coût n'est saisi. */
  topCostBoat: { id: number; name: string; costs: number } | null
}
