import type { BoatDocumentType } from '#shared/types/boat_document'
import type { IncidentType } from '#shared/types/incident'

export type DashboardPortItem = {
  id: number
  name: string
  city: string | null
  country: string | null
  boatCount: number
  totalSpots: number
  freeSpots: number
}

export type DashboardPortStats = {
  total: number
  totalBoats: number
  totalFreeSpots: number
}

export type DashboardBoatSummary = {
  id: number
  name: string
  propulsionType: string | null
  enginesCount: number
  sailsCount: number
  hasRig: boolean
}

export type DashboardUrgentMaintenanceRow = {
  id: number
  boatId: number
  boatName: string
  subject: string
  title: string
  kind: 'date' | 'hours'
  dueAt: string | null
  dueEngineHours: number | null
  currentEngineHours: number | null
}

export type DashboardStatDeltas = {
  boatsInAlert: number
  boatsWithEngine: number
  boatsWithSail: number
  boatsWithRig: number
  overdueCount: number
}

export type DashboardStats = {
  boats: number
  engines: number
  sails: number
  rigs: number
  urgentMaintenance: number
  deltas: DashboardStatDeltas
}

// --- « À traiter » (#832) -------------------------------------------------

export type DashboardAttentionSeverity = 'danger' | 'warning'

interface DashboardAttentionBase {
  /** Clé stable `<kind>:<id>` pour le rendu de liste. */
  key: string
  severity: DashboardAttentionSeverity
  boatId: number
  boatName: string
  /** Date civile `YYYY-MM-DD` servant au tri dans une sévérité (null = en dernier). */
  date: string | null
  href: string
}

export interface DashboardAttentionMaintenance extends DashboardAttentionBase {
  kind: 'maintenance'
  taskId: number
  title: string
  subject: string
  due: 'overdue' | 'soon' | 'hours'
  dueAt: string | null
  dueEngineHours: number | null
  currentEngineHours: number | null
}

export interface DashboardAttentionIncident extends DashboardAttentionBase {
  kind: 'incident'
  incidentId: number
  incidentType: IncidentType
  status: 'open' | 'in_progress'
  occurredAt: string
}

export interface DashboardAttentionDocument extends DashboardAttentionBase {
  kind: 'document'
  documentId: number
  documentType: BoatDocumentType
  customTypeLabel: string | null
  expiresAt: string
  status: 'expired' | 'expiring_soon'
}

export interface DashboardAttentionInvoice extends DashboardAttentionBase {
  kind: 'invoice'
  invoiceId: number
  number: string
  clientName: string | null
  total: number
  dueAt: string | null
}

export type DashboardAttentionItem =
  | DashboardAttentionMaintenance
  | DashboardAttentionIncident
  | DashboardAttentionDocument
  | DashboardAttentionInvoice

export interface DashboardAttentionCounts {
  maintenanceOverdue: number
  maintenanceSoon: number
  incidentsOpen: number
  documentsExpired: number
  documentsExpiring: number
  invoicesOverdue: number
  total: number
}

export interface DashboardAttention {
  /** Lignes affichées, triées par sévérité puis date, plafonnées à `ATTENTION_DISPLAY_CAP`. */
  items: DashboardAttentionItem[]
  counts: DashboardAttentionCounts
  /** Module CRM actif et capability `invoices.view` : sinon les factures n'apparaissent nulle part. */
  canViewInvoices: boolean
}
