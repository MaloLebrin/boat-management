import type { CurrencyCode } from './currency.js'
import type { OrgRole } from './organization.js'
import type { BrandingEmailParams } from './branding.js'
import type { ReportCostBreakdown, ReportCostCategory, ReportPeriod } from './reporting.js'

/**
 * Rapports de flotte par e-mail (#871) : la synthèse hebdomadaire (lundi) et
 * le rapport mensuel (1er du mois, PDF joint). Objets assemblés une fois par
 * organisation par `FleetDigestService`, puis rendus dans la langue de chaque
 * destinataire — ils ne portent donc que des données, jamais de libellés.
 */
export type FleetDigestKind = 'weekly' | 'monthly'

/** Une section de liste : les premières lignes, et le total exact. */
export interface FleetDigestList<T> {
  total: number
  items: T[]
}

export interface FleetDigestTask {
  id: number
  title: string
  boatId: number
  boatName: string
  /** `YYYY-MM-DD`. */
  dueAt: string
}

export interface FleetDigestIncident {
  id: number
  boatId: number
  boatName: string
  type: string
  status: 'open' | 'in_progress'
  /** `YYYY-MM-DD`. */
  occurredAt: string
}

export interface FleetDigestExpiry {
  kind: 'document' | 'safety_equipment'
  id: number
  boatId: number
  boatName: string
  /** Type de document ou d'équipement : clé de traduction, sauf `customLabel`. */
  type: string
  customLabel: string | null
  /** `YYYY-MM-DD`. */
  expiresAt: string
  expired: boolean
}

export interface FleetDigestReservation {
  id: number
  boatId: number
  boatName: string
  clientName: string
  /** `YYYY-MM-DD`. */
  startsAt: string
  /** `YYYY-MM-DD`. */
  endsAt: string
  status: string
}

export interface FleetDigestInvoice {
  id: number
  number: string
  clientName: string | null
  total: number
  /** `YYYY-MM-DD`, `null` sans échéance. */
  dueAt: string | null
}

export interface FleetDigestOrganization {
  id: number
  name: string
  currency: CurrencyCode
}

/** Synthèse hebdomadaire : la semaine qui commence et celle qui s'achève. */
export interface WeeklyFleetDigest {
  organization: FleetDigestOrganization
  /** Semaine ISO de l'envoi, `YYYY-Www` : clé de déduplication. */
  week: string
  /** Semaine qui commence (lundi → dimanche), dates incluses. */
  upcoming: { from: string; to: string }
  /** Semaine écoulée (lundi → dimanche), dates incluses. */
  past: { from: string; to: string }
  overdueTasks: FleetDigestList<FleetDigestTask>
  upcomingTasks: FleetDigestList<FleetDigestTask>
  openIncidents: FleetDigestList<FleetDigestIncident>
  expiring: FleetDigestList<FleetDigestExpiry>
  /** `null` sans le module Location. */
  reservations: FleetDigestList<FleetDigestReservation> | null
  /** Dépenses de la semaine écoulée, par poste. */
  expenses: ReportCostBreakdown
  /** `null` sans le module Facturation. */
  overdueInvoices: FleetDigestList<FleetDigestInvoice> | null
}

export interface MonthlyFleetReportBoat {
  boatId: number
  boatName: string
  costs: number
  engineHours: number
  rentalRevenue: number
  occupancyRate: number
}

/** Rapport mensuel : le mois civil écoulé, lu par le reporting de flotte (#887). */
export interface MonthlyFleetReport {
  organization: FleetDigestOrganization
  /** Mois couvert, `YYYY-MM` : clé de déduplication. */
  month: string
  period: ReportPeriod
  costs: ReportCostBreakdown
  previousCosts: number
  /** Les trois postes les plus lourds du mois, montant non nul. */
  topCategories: { category: ReportCostCategory; amount: number }[]
  engineHours: number
  distanceNm: number
  maintenance: {
    /** Tâches dont l'échéance tombait dans le mois. */
    planned: number
    /** Parmi elles, celles qui sont faites. */
    completed: number
    /** Interventions saisies au carnet dans le mois. */
    performed: number
  }
  /** `null` sans le module Location. */
  rental: { revenue: number; rentalDays: number; occupancyRate: number } | null
  /** Triés par coût décroissant. */
  boats: MonthlyFleetReportBoat[]
}

/** Payload du job d'envoi du rapport mensuel (rendu + PDF à l'exécution). */
export interface SendMonthlyFleetReportPayload {
  report: MonthlyFleetReport
  userId: number
  to: string
  name: string | null
  locale: string | null
  dedupKey: string
}

/** Destinataire d'un rapport : la vue de la synthèse dépend de son rôle. */
export interface FleetDigestRecipient {
  userId: number
  role: OrgRole
  email: string
  fullName: string | null
  locale: string | null
}

/** Préférences des rapports dans `/settings/notifications`. */
export interface FleetDigestPreferences {
  weekly: boolean
  monthly: boolean
  /** Le rôle peut recevoir la synthèse (tout le monde sauf le propriétaire). */
  weeklyAvailable: boolean
  /** Admin d'une organisation dont le plan ouvre `/reports`. */
  monthlyAvailable: boolean
}

// Rendu des e-mails (`FleetDigestMailService`) : modèle de vue déjà traduit.

/** Une ligne de section : intitulé, détail, lien vers l'écran concerné. */
export interface FleetDigestRowView {
  primary: string
  secondary: string
  url: string | null
}

export interface FleetDigestSectionView {
  key: string
  title: string
  rows: FleetDigestRowView[]
  /** « + 3 autres » quand la liste est tronquée. */
  more: string | null
  url: string
}

export interface FleetDigestAmountView {
  label: string
  value: string
}

export interface RenderedFleetDigest {
  subject: string
  text: string
  html: string
}

export interface FleetDigestRecipientContext {
  name: string | null
  to: string
  locale: string | null
  branding: BrandingEmailParams | null
  unsubscribeUrl: string | null
}
