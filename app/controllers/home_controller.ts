import AiAnalysisService from '#services/ai_analysis_service'
import BoatEnginePartService from '#services/boat_engine_part_service'
import BoatMaintenanceTaskService from '#services/boat_maintenance_task_service'
import BoatReservationService from '#services/boat_reservation_service'
import BudgetService from '#services/budget_service'
import DashboardAttentionService from '#services/dashboard_attention_service'
import DashboardFleetActivityService from '#services/dashboard_fleet_activity_service'
import DashboardLayoutService from '#services/dashboard_layout_service'
import DashboardService from '#services/dashboard_service'
import InvoiceService from '#services/invoice_service'
import PlanningService from '#services/planning_service'
import PortService from '#services/port_service'
import QuotaService from '#services/quota_service'
import { toBoatTaskEquipment } from '#transformers/maintenance_transformer'
import { visibleWidgetSet } from '#shared/helpers/dashboard_layout'
import { toAppLocale } from '#shared/helpers/locale_path'
import type { AiSuggestion } from '#shared/types/ai'
import { deferJson } from '#utils/inertia_defer'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

@inject()
export default class HomeController {
  constructor(
    private dashboardService: DashboardService,
    private aiService: AiAnalysisService,
    private portService: PortService,
    private planningService: PlanningService,
    private quotaService: QuotaService,
    private taskService: BoatMaintenanceTaskService,
    private attentionService: DashboardAttentionService,
    private fleetService: DashboardFleetActivityService,
    private reservationService: BoatReservationService,
    private budgetService: BudgetService,
    private layoutService: DashboardLayoutService,
    private invoiceService: InvoiceService,
    private enginePartService: BoatEnginePartService
  ) {}

  async index({ inertia, auth, request, response, i18n }: HttpContext) {
    await auth.check()

    if (!auth.isAuthenticated) {
      return inertia.render('home', {})
    }

    const user = auth.getUserOrFail()

    const role = user.organizationId ? await user.getEffectiveRoleInOrg(user.organizationId) : null

    if (user.organizationId) {
      if (role === 'boat_owner') {
        return response.redirect('/owner/boats')
      }
      // Le mécanicien (capabilities limitées à maintenance.*) n'a pas accès aux
      // KPIs flotte ni aux CTA hors périmètre : dashboard dédié « mes interventions ».
      if (role === 'mechanic') {
        const { overdueTasks, soonTasks } = await this.planningService.getPlanningForOrg(user)
        return inertia.render('dashboard/mechanic', { overdueTasks, soonTasks })
      }
    }

    // La relation `organization` n'est pas chargée à ce stade (le middleware
    // Inertia ne la charge qu'au rendu partagé) : on la charge explicitement,
    // pour les quotas comme pour les gardes de widgets (#418, #832).
    if (user.organizationId) await user.load('organization')

    // Disposition personnalisée : les widgets masqués (ou indisponibles pour
    // ce rôle/plan) ne sont ni calculés ni envoyés — un defer masqué est omis,
    // jamais `null` (#478).
    const availability = await this.layoutService.availabilityFor(user, role)
    const layout = this.layoutService.resolveForUser(user, availability)
    const visible = visibleWidgetSet(layout)

    const data = await this.dashboardService.getForUser(user)

    const latestAnalysis =
      user.organizationId && visible.has('ai_panel')
        ? await this.aiService.getLatestFleetAnalysis(
            user.id,
            user.organizationId,
            toAppLocale(i18n.locale)
          )
        : null
    const aiFleetAnalysis: AiSuggestion[] | null = latestAnalysis
      ? (JSON.parse(latestAnalysis.responseText) as AiSuggestion[])
      : null

    const portOptions = await this.portService.listNamesForOrg(user)
    const canCreateNavigationLogs = user.organizationId
      ? await user.hasPermission(user.organizationId, 'navigation_logs.create')
      : false
    const canCreateIncidents = user.organizationId
      ? await user.hasPermission(user.organizationId, 'incidents.create')
      : false
    const canCreateMaintenanceTasks = user.organizationId
      ? await user.hasPermission(user.organizationId, 'maintenance.create')
      : false

    // Factures impayées dans « À traiter » : module CRM actif **et** capability
    // de lecture — sinon la donnée n'est pas envoyée du tout (#832). Même garde
    // que le widget « Facturation », calculée une seule fois par le service.
    const canViewInvoices = availability.invoicing
    const attention = await this.attentionService.getForUser(
      user,
      data.urgentMaintenance,
      data.stats,
      { canViewInvoices }
    )

    // Ce qui se passe dans la flotte : sorties en cours, état de flotte, KPI
    // glissants ; départs et retours si le module Location est actif (#832).
    const activeTrips = await this.fleetService.getActiveTrips(user)
    const [fleetStatus, pulse] = await Promise.all([
      this.fleetService.getFleetStatus(data.boatIds, activeTrips.total),
      this.fleetService.getPulse(user, data.boatIds),
    ])
    // Module Location actif et `boats.view` (cf. `DashboardLayoutService.availabilityFor`).
    const upcomingReservations = visible.has('upcoming_reservations')
      ? await this.reservationService.listUpcomingForOrg(user)
      : undefined

    // Dépenses de l'organisation : admins seulement (les membres gardent le
    // budget par bateau) ; ~18 SUM, donc en prop différée avec l'activité.
    const canViewSpend = role === 'admin'
    const boatIds = data.boatIds

    // Quota bateaux pour l'upsell du bouton « Nouveau bateau » (issue #418).
    const boatQuota = user.organization
      ? await this.quotaService.getBoatUsage(user.organization)
      : { used: 0, limit: 0 }
    const canAddBoat = boatQuota.limit === null || boatQuota.used < boatQuota.limit

    return inertia.render('dashboard', {
      boats: data.boats,
      stats: data.stats,
      ports: data.ports,
      portStats: data.portStats,
      attention,
      pulse,
      activeTrips,
      fleetStatus,
      // Omis (et non `null`) hors module Location : le front distingue « pas
      // de module » d'une liste vide.
      ...(upcomingReservations ? { upcomingReservations } : {}),
      canViewSpend,
      ...(canViewSpend && visible.has('spend')
        ? {
            spend: inertia.defer(
              deferJson(() => this.budgetService.getOrgSpendSummary(boatIds, DateTime.now())),
              'spend'
            ),
          }
        : {}),
      ...(visible.has('activity')
        ? {
            activity: inertia.defer(
              deferJson(() => this.fleetService.getRecentActivity(user, boatIds)),
              'activity'
            ),
          }
        : {}),
      ...(visible.has('planned_tasks')
        ? {
            plannedTasks: inertia.defer(
              deferJson(() => this.dashboardService.getPlannedTasks(boatIds)),
              'plannedTasks'
            ),
          }
        : {}),
      // Widgets de la galerie (masqués par défaut) : différés, et omis tant que
      // l'utilisateur ne les a pas ajoutés.
      ...(visible.has('safety_compliance')
        ? {
            safetyCompliance: inertia.defer(
              deferJson(() => this.dashboardService.getSafetyCompliance(boatIds)),
              'safetyCompliance'
            ),
          }
        : {}),
      ...(visible.has('fuel')
        ? {
            fuel: inertia.defer(
              deferJson(() => this.fleetService.getFuelSummary(user, boatIds)),
              'fuel'
            ),
          }
        : {}),
      ...(visible.has('low_stock')
        ? {
            lowStock: inertia.defer(
              deferJson(() => this.enginePartService.listAlertsForBoats(boatIds)),
              'lowStock'
            ),
          }
        : {}),
      ...(visible.has('invoicing') && user.organization
        ? {
            invoicing: inertia.defer(
              deferJson(() => this.invoiceService.getDashboardSummary(user.organization)),
              'invoicing'
            ),
          }
        : {}),
      ...(visible.has('charter_occupancy')
        ? {
            charterOccupancy: inertia.defer(
              deferJson(() => this.reservationService.getOccupancyForOrg(user, boatIds.length)),
              'charterOccupancy'
            ),
          }
        : {}),
      layout,
      aiFleetAnalysis,
      aiFleetAnalysisAt: latestAnalysis?.createdAt.toISO() ?? null,
      portOptions,
      canCreateNavigationLogs,
      canCreateIncidents,
      canCreateMaintenanceTasks,
      // Chargé à la demande par l'ajout rapide de tâche, une fois le bateau choisi.
      taskEquipment: inertia.optional(
        deferJson(async () => {
          const boatId = Number(request.qs().taskBoatId)
          const boat = Number.isInteger(boatId)
            ? await this.taskService.findBoatWithEquipment(user, boatId)
            : null
          return toBoatTaskEquipment(boat)
        })
      ),
      canAddBoat,
      boatQuota,
    })
  }
}
