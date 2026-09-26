import type { PartWearState } from '#shared/types/boat'
import type { BoatDocumentType } from '#shared/types/boat_document'
import type { BudgetYearSummary } from '#shared/types/budget'
import type { IncidentType } from '#shared/types/incident'
import type { ReservationStatus, ReservationType } from '#shared/types/reservation'
import type { ArmamentZone } from '#shared/types/safety'

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
  /** Bateaux ayant au moins une tâche urgente. */
  boatsInAlert: number
  /** Tâches datées dont l'échéance est dépassée (comptage exact, #832). */
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
  /** Incidents `open` + `in_progress`. */
  incidentsOpen: number
  /** Sous-ensemble de `incidentsOpen` au statut `in_progress`. */
  incidentsInProgress: number
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

// --- État de flotte, KPI « pulse », départs (#832) -------------------------

export interface DashboardPulseStats {
  /** Fenêtre glissante des compteurs sorties / tâches (`PULSE_WINDOW_DAYS`). */
  windowDays: number
  tripsCompleted: number
  /** Milles parcourus sur la fenêtre (somme des `distance_nm` renseignées). */
  distanceNm: number
  tasksDone: number
}

export interface DashboardActiveTrip {
  id: number
  boatId: number
  boatName: string
  departedAt: string
  departurePortName: string | null
  crewCount: number | null
}

export interface DashboardActiveTrips {
  /** Plafonnées à `ACTIVE_TRIPS_DISPLAY_CAP`, la plus ancienne d'abord. */
  items: DashboardActiveTrip[]
  /** Toutes les sorties en cours de l'organisation (= bateaux en mer, une sortie par bateau). */
  total: number
}

export interface DashboardFleetStatus {
  total: number
  atSea: number
  inPort: number
  enginesInMaintenance: number
}

export interface DashboardUpcomingReservation {
  id: number
  boatId: number
  boatName: string
  clientName: string
  status: ReservationStatus
  type: ReservationType | null
  /** Départ (début dans la fenêtre) ou retour (réservation en cours qui finit dans la fenêtre). */
  event: 'departure' | 'return'
  /** Instant de l'événement (`startsAt` ou `endsAt`), ISO. */
  at: string
  startsAt: string
  endsAt: string
}

// --- Dépenses et activité récente (props différées, #832) --------------------

export interface DashboardSpendSummary {
  year: number
  /** Mois courant : les totaux couvrent `1..throughMonth` pour N comme pour N-1. */
  throughMonth: number
  totals: BudgetYearSummary
  /** `null` quand l'année précédente n'a aucune dépense sur la période. */
  previousYearToDate: BudgetYearSummary | null
  /** Lien « voir le budget » possible seulement pour une flotte d'un seul bateau. */
  singleBoatId: number | null
}

interface DashboardActivityBase {
  /** Clé stable `<kind>:<id>`. */
  key: string
  /** Instant de l'événement, ISO (date seule pour les tâches : `done_at` est une date civile). */
  occurredAt: string
  boatId: number
  boatName: string
  href: string
}

export interface DashboardActivityTripCompleted extends DashboardActivityBase {
  kind: 'trip_completed'
  departurePortName: string | null
  arrivalPortName: string | null
  distanceNm: number | null
}

export interface DashboardActivityTaskDone extends DashboardActivityBase {
  kind: 'task_done'
  title: string
  subject: string
}

export interface DashboardActivityIncidentReported extends DashboardActivityBase {
  kind: 'incident_reported'
  incidentType: IncidentType
}

export interface DashboardActivityFuelLogged extends DashboardActivityBase {
  kind: 'fuel_logged'
  quantityLiters: number
  totalCost: number | null
}

export interface DashboardActivityDocumentAdded extends DashboardActivityBase {
  kind: 'document_added'
  documentType: BoatDocumentType
  customTypeLabel: string | null
}

export type DashboardActivityItem =
  | DashboardActivityTripCompleted
  | DashboardActivityTaskDone
  | DashboardActivityIncidentReported
  | DashboardActivityFuelLogged
  | DashboardActivityDocumentAdded

// --- Tâches planifiées (widget personnalisable) --------------------------------

export interface DashboardPlannedTask {
  id: number
  boatId: number
  boatName: string
  title: string
  subject: string
  /** Date civile `YYYY-MM-DD`, dans la fenêtre `PLANNED_TASKS_DAYS` à partir d'aujourd'hui. */
  dueAt: string
}

export interface DashboardPlannedTasks {
  /** Plafonnées à `PLANNED_TASKS_CAP`, la plus proche d'abord. */
  items: DashboardPlannedTask[]
  /** Toutes les tâches ouvertes datées de la fenêtre (comptage exact). */
  total: number
}

// --- Widgets de la galerie (masqués par défaut) --------------------------------

export interface DashboardSafetyComplianceBoat {
  boatId: number
  boatName: string
  zone: ArmamentZone
  /** `satisfiedCount / requirementCount` en pourcentage entier. */
  score: number
  /** Écarts qui invalident une exigence : manquant, quantité insuffisante, périmé, révision en retard. */
  blockingCount: number
  /** Échéances proches : bientôt périmé, révision à prévoir. */
  warningCount: number
  /** Plus proche échéance (`YYYY-MM-DD`) parmi les écarts datés, `null` sinon. */
  nextDueDate: string | null
}

export interface DashboardSafetyCompliance {
  /** Bateaux dont la zone d'armement est renseignée (les seuls contrôlés). */
  checked: number
  /** Contrôlés sans aucun écart. */
  compliant: number
  /** Contrôlés avec au moins un écart (bloquant ou alerte). */
  withIssues: number
  /** Bateaux sans zone d'armement : aucun contrôle possible. */
  withoutZone: number
  /** Bateaux avec écart, les pires d'abord, plafonnés à `SAFETY_COMPLIANCE_CAP`. */
  items: DashboardSafetyComplianceBoat[]
}

export interface DashboardFuelPeriod {
  liters: number
  cost: number
}

export interface DashboardFuelSummary {
  /** Fenêtre glissante (`FUEL_WINDOW_DAYS`), comparée à la fenêtre précédente. */
  windowDays: number
  liters: number
  cost: number
  /** Coût / litres des seuls pleins dont le coût est renseigné ; `null` sans aucun. */
  avgPricePerLiter: number | null
  fillUps: number
  /** Fenêtre précédente de même durée, `null` si elle n'a aucun plein. */
  previous: DashboardFuelPeriod | null
  /** Bateau ayant le plus avitaillé sur la fenêtre. */
  topBoat: { boatId: number; boatName: string; liters: number } | null
}

export interface DashboardLowStockPart {
  id: number
  boatId: number
  boatName: string
  engineId: number
  engineBrand: string | null
  engineModel: string | null
  engineKind: string
  designation: string
  reference: string | null
  stock: number | null
  minStockAlert: number | null
  wearState: PartWearState | null
  /** `low_stock` : stock sous le seuil d'alerte ; `to_replace` : état d'usure `to_replace` / `damaged`. */
  reason: 'low_stock' | 'to_replace'
}

export interface DashboardLowStockParts {
  /** Ruptures d'abord puis désignation, plafonnées à `LOW_STOCK_CAP`. */
  items: DashboardLowStockPart[]
  /** Toutes les pièces en alerte (comptage exact). */
  total: number
  lowStockCount: number
  toReplaceCount: number
}

export interface DashboardInvoicingSummary {
  /** Factures envoyées non réglées (statuts `sent` et `overdue`). */
  outstandingTotal: number
  outstandingCount: number
  /** Impayées : statut `overdue` ou envoyée avec échéance dépassée — même règle que « À traiter ». */
  overdueTotal: number
  overdueCount: number
  /** Encaissé depuis le 1er du mois courant. */
  paidThisMonthTotal: number
  paidThisMonthCount: number
  /** Devis en brouillon ou envoyés, non convertis. */
  pendingQuotes: number
}

export interface DashboardCharterOccupancy {
  /** Fenêtre (`CHARTER_OCCUPANCY_DAYS`) à partir de maintenant. */
  windowDays: number
  boats: number
  /** Jours-bateau confirmés dans la fenêtre / (bateaux × jours), pourcentage entier borné à 100. */
  occupancyRate: number
  /** Jours-bateau confirmés dans la fenêtre (une décimale). */
  reservedBoatDays: number
  /** Réservations confirmées qui chevauchent la fenêtre. */
  confirmed: number
  /** Options (non confirmées) qui chevauchent la fenêtre. */
  options: number
  /** Somme des `totalPrice` des réservations confirmées qui **commencent** dans la fenêtre. */
  confirmedRevenue: number
}
