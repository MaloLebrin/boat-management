import type {
  DashboardActiveTrips,
  DashboardActivityItem,
  DashboardAttention,
  DashboardBoatSummary,
  DashboardFleetStatus,
  DashboardPlannedTasks,
  DashboardPortItem,
  DashboardPortStats,
  DashboardPulseStats,
  DashboardSpendSummary,
  DashboardStats,
  DashboardUpcomingReservation,
} from '#shared/types/dashboard'
import type { ResolvedDashboardLayout } from '#shared/types/dashboard_layout'
import type { BoatTaskEquipment } from '#shared/types/maintenance'
import type { QuotaUsage } from '#shared/types/plan'
import type { AiSuggestion, NavigationLogPortOption } from '~/types/boat_show'

/**
 * Données consommées par les cartes du tableau de bord : le sac que la page
 * passe aux colonnes de widgets, quel que soit l'ordre choisi par l'utilisateur.
 * Les props différées (`activity`, `spend`, `plannedTasks`) sont `undefined`
 * tant qu'elles ne sont pas arrivées ; les props gardées (`upcomingReservations`,
 * `spend`) sont absentes quand le widget n'est pas disponible ou masqué.
 */
export interface DashboardWidgetData {
  boats: DashboardBoatSummary[]
  stats: DashboardStats
  attention: DashboardAttention
  pulse: DashboardPulseStats
  activeTrips: DashboardActiveTrips
  fleetStatus: DashboardFleetStatus
  upcomingReservations?: DashboardUpcomingReservation[]
  activity?: DashboardActivityItem[]
  spend?: DashboardSpendSummary
  plannedTasks?: DashboardPlannedTasks
  aiFleetAnalysisAt: string | null
  aiFleetAnalysis: AiSuggestion[] | null
  ports: DashboardPortItem[]
  portStats: DashboardPortStats
  portOptions: NavigationLogPortOption[]
  canCreateNavigationLogs: boolean
}

/** Props de la page `dashboard` : les données des widgets + l'en-tête et la disposition. */
export interface DashboardPageProps extends DashboardWidgetData {
  /** Disposition résolue côté serveur : ordre par zone (masqués inclus), masqués, personnalisée ou non. */
  layout: ResolvedDashboardLayout
  /** Admins seulement ; `spend` est alors une prop différée (groupe `spend`). */
  canViewSpend: boolean
  canCreateIncidents: boolean
  canCreateMaintenanceTasks: boolean
  /** Prop optionnelle, chargée par l'ajout rapide de tâche une fois le bateau choisi. */
  taskEquipment?: BoatTaskEquipment
  canAddBoat: boolean
  boatQuota: QuotaUsage['boats']
}
