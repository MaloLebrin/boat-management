import BoatEngine from '#models/boat_engine'
import type User from '#models/user'
import AiTokenQuotaService from '#services/ai_token_quota_service'
import AssistantProductHelpService from '#services/assistant_product_help_service'
import BoatEnginePartService from '#services/boat_engine_part_service'
import BoatHullService from '#services/boat_hull_service'
import BoatListService from '#services/boat_list_service'
import BoatMaintenanceService from '#services/boat_maintenance_service'
import BoatReservationService from '#services/boat_reservation_service'
import BoatSafetyComplianceService from '#services/boat_safety_compliance_service'
import BudgetService from '#services/budget_service'
import ClientService from '#services/client_service'
import DashboardService from '#services/dashboard_service'
import InvoiceService from '#services/invoice_service'
import NavigationService from '#services/navigation_service'
import OrganizationModuleService from '#services/organization_module_service'
import PlanningService from '#services/planning_service'
import PortService from '#services/port_service'
import QuotaService from '#services/quota_service'
import SubscriptionService from '#services/subscription_service'
import { DEFAULT_APP_LOCALE } from '#shared/helpers/locale_path'
import type { AiSuggestionLocale, AiToolCall, AiToolDefinition } from '#shared/types/ai'
import {
  ASSISTANT_TOOL_RESULT_MAX_CHARS,
  type AssistantToolSpec,
} from '#shared/types/assistant_tools'
import { PLAN_LIMITS } from '#shared/types/plan'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'

/**
 * Outil exécutable — le contrat (`AssistantToolSpec`) vit dans
 * `shared/types/assistant_tools.ts` ; le binding `execute` reste ici car il
 * référence le modèle `User`, jamais importé depuis `shared/`.
 */
interface AssistantTool extends AssistantToolSpec {
  execute(user: User, args: Record<string, unknown>, locale: AiSuggestionLocale): Promise<unknown>
}

/* --- Coercion des arguments : un petit modèle envoie "22" pour 22. --------- */

function toInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return Math.trunc(parsed)
  }
  return null
}

function toBool(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1'
}

function toStr(value: unknown): string | null {
  if (typeof value === 'string' && value.trim() !== '') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

function toEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  const str = toStr(value)
  return str !== null && (allowed as readonly string[]).includes(str) ? (str as T) : null
}

/**
 * Sérialisation d'un résultat d'outil, tronquée à
 * `ASSISTANT_TOOL_RESULT_MAX_CHARS` avec `truncated: true` — sans elle,
 * `list_boats` sur une grosse flotte fait exploser le tour.
 */
export function serializeToolResult(result: unknown): string {
  const json = JSON.stringify(result) ?? 'null'
  if (json.length <= ASSISTANT_TOOL_RESULT_MAX_CHARS) return json
  return JSON.stringify({
    truncated: true,
    preview: json.slice(0, ASSISTANT_TOOL_RESULT_MAX_CHARS),
  })
}

/**
 * Registre des outils de lecture du copilote (#642).
 *
 * Cloisonnement : l'utilisateur et l'organisation viennent toujours du
 * contexte authentifié. Un identifiant passé en argument est résolu par un
 * service qui filtre déjà sur `organizationId` (ou par une requête bornée aux
 * bateaux de l'org), jamais par une requête écrite pour l'occasion. Aucun
 * outil d'écriture.
 *
 * `definitionsFor` ne renvoie que les outils autorisés pour le rôle
 * (capability) et le plan (quotas effectifs — tier + modules + add-ons).
 * `run` ne lève jamais : toute erreur devient `{ error }` renvoyé au modèle
 * comme résultat d'outil, ce qui lui laisse une chance de se corriger.
 */
@inject()
export default class AssistantToolsService {
  constructor(
    private aiTokenQuotaService: AiTokenQuotaService,
    private boatHullService: BoatHullService,
    private boatListService: BoatListService,
    private budgetService: BudgetService,
    private clientService: ClientService,
    private dashboardService: DashboardService,
    private enginePartService: BoatEnginePartService,
    private invoiceService: InvoiceService,
    private maintenanceService: BoatMaintenanceService,
    private moduleService: OrganizationModuleService,
    private navigationService: NavigationService,
    private planningService: PlanningService,
    private portService: PortService,
    private productHelpService: AssistantProductHelpService,
    private quotaService: QuotaService,
    private reservationService: BoatReservationService,
    private safetyComplianceService: BoatSafetyComplianceService,
    private subscriptionService: SubscriptionService
  ) {}

  /** Outils proposés au modèle pour cet utilisateur (rôle + plan). */
  async definitionsFor(user: User): Promise<AiToolDefinition[]> {
    if (user.organization === undefined) await user.load('organization')
    const quotas = await this.moduleService.getEffectiveQuotas(user.organization)

    const definitions: AiToolDefinition[] = []
    for (const tool of this.#tools()) {
      if (tool.capability !== undefined) {
        if (user.organizationId === null) continue
        const allowed = await user.hasPermission(user.organizationId, tool.capability)
        if (!allowed) continue
      }
      if (tool.planFlags !== undefined && !tool.planFlags.some((flag) => quotas[flag])) continue
      definitions.push({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      })
    }
    return definitions
  }

  /**
   * Exécute un appel d'outil et renvoie le résultat sérialisé (tronqué à
   * `ASSISTANT_TOOL_RESULT_MAX_CHARS`). Ne lève jamais. Les gardes de
   * `definitionsFor` sont re-vérifiées : un modèle peut halluciner un appel
   * vers un outil qui ne lui a pas été proposé.
   */
  async run(
    user: User,
    call: AiToolCall,
    locale: AiSuggestionLocale = DEFAULT_APP_LOCALE
  ): Promise<string> {
    const tool = this.#tools().find((t) => t.name === call.name)
    if (tool === undefined) {
      return this.#serialize({
        error: `Unknown tool "${call.name}"`,
        validTools: this.#tools().map((t) => t.name),
      })
    }

    try {
      if (user.organization === undefined) await user.load('organization')
      if (tool.capability !== undefined) {
        const allowed =
          user.organizationId !== null &&
          (await user.hasPermission(user.organizationId, tool.capability))
        if (!allowed) return this.#serialize({ error: 'Not allowed for your role' })
      }
      if (tool.planFlags !== undefined) {
        const quotas = await this.moduleService.getEffectiveQuotas(user.organization)
        if (!tool.planFlags.some((flag) => quotas[flag])) {
          return this.#serialize({ error: 'Not available on your plan' })
        }
      }
      const result = await tool.execute(user, call.arguments, locale)
      return this.#serialize(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tool execution failed'
      return this.#serialize({ error: message })
    }
  }

  #serialize(result: unknown): string {
    return serializeToolResult(result)
  }

  #tools(): AssistantTool[] {
    return [
      {
        name: 'list_boats',
        description:
          'List the boats of the fleet with their maintenance badge (urgent/upcoming counts). Supports text search and pagination.',
        parameters: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Free-text search on name or registration' },
            page: { type: 'number', description: 'Page number, default 1' },
          },
        },
        capability: 'boats.view',
        execute: async (user, args) => {
          const { boats } = await this.boatListService.listForUser(user, {
            q: toStr(args.search) ?? undefined,
            page: toInt(args.page) ?? 1,
            perPage: 20,
          })
          return { total: boats.meta.total, page: boats.meta.currentPage, boats: boats.data }
        },
      },
      {
        name: 'get_boat',
        description:
          'Full detail of one boat: hull, engines, sails, equipment, Division 240 safety compliance, and optionally the yearly budget.',
        parameters: {
          type: 'object',
          properties: {
            boatId: { type: 'number', description: 'Boat id from the fleet roster' },
            includeBudget: { type: 'boolean', description: 'Include the yearly budget summary' },
            budgetYear: { type: 'number', description: 'Budget year, default current year' },
          },
          required: ['boatId'],
        },
        capability: 'boats.view',
        execute: async (user, args) => {
          const boatId = toInt(args.boatId)
          if (boatId === null) return { error: 'boatId is required' }
          const boat = await this.boatHullService.getFullDetailForUser(user, boatId)
          const safety = this.safetyComplianceService.forBoat(boat)
          const budget = toBool(args.includeBudget)
            ? await this.budgetService.getForBoat(
                boat,
                toInt(args.budgetYear) ?? DateTime.now().year
              )
            : null
          return {
            id: boat.id,
            name: boat.name,
            registrationNumber: boat.registrationNumber,
            type: boat.type,
            category: boat.category,
            propulsionType: boat.propulsionType,
            manufacturer: boat.manufacturer,
            model: boat.model,
            yearBuilt: boat.yearBuilt,
            lengthM: boat.lengthM,
            homePort: boat.homePort,
            navigationCategory: boat.navigationCategory,
            armamentZone: boat.armamentZone,
            maxPersons: boat.maxPersons,
            engines: boat.engines.map((engine) => ({
              id: engine.id,
              brand: engine.brand,
              model: engine.model,
              kind: engine.kind,
              fuel: engine.fuel,
              status: engine.status,
              powerHp: engine.powerHp,
              hours: engine.hours,
            })),
            sailsCount: boat.sails.length,
            hasRig: boat.rig !== null,
            genericEquipmentCount: boat.genericEquipment.length,
            safety: {
              zone: safety.zone,
              requirementCount: safety.requirementCount,
              satisfiedCount: safety.satisfiedCount,
              score: safety.score,
              issues: safety.issues.slice(0, 10),
            },
            budget:
              budget === null
                ? null
                : {
                    year: budget.year,
                    totals: budget.totals,
                    previousYearTotals: budget.previousYearTotals,
                  },
          }
        },
      },
      {
        name: 'get_engine',
        description:
          'Detail of one engine of the fleet: identity, running hours, spare parts inventory and low-stock parts.',
        parameters: {
          type: 'object',
          properties: {
            engineId: { type: 'number', description: 'Engine id from the fleet roster' },
          },
          required: ['engineId'],
        },
        capability: 'boats.view',
        execute: async (user, args) => {
          const engineId = toInt(args.engineId)
          if (engineId === null) return { error: 'engineId is required' }
          // Résolution bornée à l'org : un id d'une autre organisation ne
          // matche jamais (whereIn sur les bateaux de l'org).
          const orgBoats = await this.boatListService.listNamesForOrg(user)
          const engine = await BoatEngine.query()
            .where('id', engineId)
            .whereIn(
              'boatId',
              orgBoats.map((b) => b.id)
            )
            .first()
          if (engine === null) return { error: 'Engine not found in your fleet' }
          const [parts, lowStock] = await Promise.all([
            this.enginePartService.listForEngine(engine.id),
            this.enginePartService.listLowStock(engine.id),
          ])
          const toPartRow = (part: (typeof parts)[number]) => ({
            id: part.id,
            designation: part.designation,
            reference: part.reference,
            stock: part.stock,
            minStockAlert: part.minStockAlert,
            wearState: part.wearState,
          })
          return {
            id: engine.id,
            boatId: engine.boatId,
            boatName: orgBoats.find((b) => b.id === engine.boatId)?.name ?? null,
            brand: engine.brand,
            model: engine.model,
            kind: engine.kind,
            fuel: engine.fuel,
            status: engine.status,
            powerHp: engine.powerHp,
            hours: engine.hours,
            serialNumber: engine.serialNumber,
            parts: parts.slice(0, 30).map(toPartRow),
            lowStockParts: lowStock.slice(0, 30).map(toPartRow),
          }
        },
      },
      {
        name: 'list_maintenance',
        description:
          'Maintenance of the fleet. scope=planning: open tasks (overdue, due soon, planned). scope=history: past maintenance events with stats.',
        parameters: {
          type: 'object',
          properties: {
            scope: { type: 'string', enum: ['planning', 'history'] },
            boatId: { type: 'number', description: 'history only — filter on one boat' },
            search: { type: 'string', description: 'history only — free-text search' },
            page: { type: 'number', description: 'history only — page number' },
          },
          required: ['scope'],
        },
        capability: 'maintenance.view',
        execute: async (user, args) => {
          const scope = toEnum(args.scope, ['planning', 'history'] as const) ?? 'planning'
          if (scope === 'planning') {
            const planning = await this.planningService.getPlanningForOrg(user)
            return {
              counts: {
                open: planning.tasks.length,
                overdue: planning.overdueTasks.length,
                dueSoon: planning.soonTasks.length,
                planned: planning.plannedTasks.length,
                undated: planning.undatedTasks.length,
                done: planning.doneTasksTotal,
              },
              overdueTasks: planning.overdueTasks.slice(0, 10),
              dueSoonTasks: planning.soonTasks.slice(0, 10),
            }
          }
          const history = await this.maintenanceService.getHistoryForOrg(user, {
            boatId: toInt(args.boatId) ?? undefined,
            q: toStr(args.search) ?? undefined,
            page: toInt(args.page) ?? 1,
            perPage: 15,
          })
          return {
            total: history.events.meta.total,
            page: history.events.meta.currentPage,
            stats: history.stats,
            events: history.events.data.map((event) => ({
              id: event.id,
              boatName: event.boatName,
              subject: event.subject,
              title: event.title,
              performedAt: event.performedAt,
              engineCaption: event.engineCaption,
              partsCount: event.parts.length,
            })),
          }
        },
      },
      {
        name: 'fleet_overview',
        description:
          'Dashboard overview of the whole fleet: boat counts, urgent maintenance, ports occupancy stats.',
        parameters: { type: 'object', properties: {} },
        capability: 'boats.view',
        execute: async (user) => {
          const dashboard = await this.dashboardService.getForUser(user)
          return {
            stats: dashboard.stats,
            boats: dashboard.boats.slice(0, 20),
            urgentMaintenance: dashboard.urgentMaintenance.slice(0, 10),
            portStats: dashboard.portStats,
          }
        },
      },
      {
        name: 'list_ports',
        description:
          'List the ports of the organization with their pontoons, mooring areas and berth counts.',
        parameters: { type: 'object', properties: {} },
        capability: 'ports.view',
        planFlags: ['canManagePorts'],
        execute: async (user) => {
          const ports = await this.portService.listWithSpotsForOrg(user)
          return {
            total: ports.length,
            ports: ports.slice(0, 20).map((port) => ({
              id: port.id,
              name: port.name,
              city: port.city,
              country: port.country,
              pontoons: port.pontoons.map((pontoon) => ({
                name: pontoon.name,
                spots: pontoon.spots.length,
              })),
              mouillages: port.mouillages.map((mouillage) => ({
                name: mouillage.name,
                spots: mouillage.spots.length,
              })),
            })),
          }
        },
      },
      {
        name: 'list_operations',
        description:
          'Fleet operations logs. kind=logbook: navigation outings. kind=fuel: fuel logs. kind=incidents: incident reports. Optional boatId filter.',
        parameters: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: ['logbook', 'fuel', 'incidents'] },
            boatId: { type: 'number' },
          },
          required: ['kind'],
        },
        capability: 'boats.view',
        execute: async (user, args) => {
          const kind = toEnum(args.kind, ['logbook', 'fuel', 'incidents'] as const) ?? 'logbook'
          const boatId = toInt(args.boatId) ?? undefined
          if (kind === 'fuel') {
            const rows = await this.navigationService.getFleetFuelLogs(user, boatId)
            return { total: rows.length, fuelLogs: rows.slice(0, 15) }
          }
          if (kind === 'incidents') {
            const rows = await this.navigationService.getFleetIncidents(user, boatId)
            return { total: rows.length, incidents: rows.slice(0, 15) }
          }
          const rows = await this.navigationService.getFleetLogbook(user, boatId)
          return { total: rows.length, outings: rows.slice(0, 15) }
        },
      },
      {
        name: 'list_commercial',
        description:
          'Commercial data. kind=reservations: boat reservations. kind=clients: CRM clients. kind=invoices: quotes and invoices. Availability depends on the plan modules.',
        parameters: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: ['reservations', 'clients', 'invoices'] },
            search: { type: 'string', description: 'clients/invoices — free-text search' },
            boatId: { type: 'number', description: 'reservations — filter on one boat' },
          },
          required: ['kind'],
        },
        capability: 'invoices.view',
        planFlags: ['canManageReservations', 'canManageClients', 'canManageInvoices'],
        execute: async (user, args) => {
          const kind = toEnum(args.kind, ['reservations', 'clients', 'invoices'] as const)
          if (kind === null) return { error: 'kind must be reservations, clients or invoices' }
          const quotas = await this.moduleService.getEffectiveQuotas(user.organization)

          if (kind === 'reservations') {
            if (!quotas.canManageReservations) {
              return { error: 'Reservations are not available on your plan' }
            }
            const rows = await this.reservationService.listForOrg(user, toInt(args.boatId))
            return {
              total: rows.length,
              reservations: rows.slice(0, 20).map((reservation) => ({
                id: reservation.id,
                boatId: reservation.boatId,
                boatName: reservation.boat?.name ?? null,
                status: reservation.status,
                type: reservation.type,
                startsAt: reservation.startsAt.toISODate(),
                endsAt: reservation.endsAt.toISODate(),
                clientName: reservation.clientName,
                totalPrice: reservation.totalPrice,
              })),
            }
          }

          if (kind === 'clients') {
            if (!quotas.canManageClients) return { error: 'CRM is not available on your plan' }
            const { data, meta } = await this.clientService.search(
              user.organization,
              this.clientService.normalizeFilters({ q: toStr(args.search) ?? '', perPage: 20 })
            )
            return {
              total: meta.total,
              clients: data.map((client) => ({
                id: client.id,
                fullName: client.fullName,
                email: client.email,
                phone: client.phone,
                status: client.status,
              })),
            }
          }

          if (!quotas.canManageInvoices) return { error: 'Invoicing is not available on your plan' }
          const { data, meta } = await this.invoiceService.search(
            user.organization,
            this.invoiceService.normalizeFilters({ q: toStr(args.search) ?? '', perPage: 20 })
          )
          return {
            total: meta.total,
            invoices: data.map((invoice) => ({
              id: invoice.id,
              kind: invoice.kind,
              number: invoice.number,
              status: invoice.status,
              clientName: invoice.clientName,
              issuedAt: invoice.issuedAt,
              dueAt: invoice.dueAt,
              total: invoice.total,
              currency: invoice.currency,
            })),
          }
        },
      },
      {
        name: 'search_product_help',
        description:
          'Search the FleetAi product knowledge base. Use for questions about what FleetAi can do, how a feature works, plans, modules and quotas.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The question or feature to look up' },
          },
          required: ['query'],
        },
        execute: async (_user, args, locale) => {
          const query = toStr(args.query)
          if (query === null) return { error: 'query is required' }
          return { results: this.productHelpService.search(query, locale) }
        },
      },
      {
        name: 'get_organization_status',
        description:
          'Subscription, plan, effective quotas and current usage (boats, members, AI tokens) of the organization.',
        parameters: { type: 'object', properties: {} },
        capability: 'subscription.view',
        execute: async (user) => {
          const org = user.organization
          const [quotas, boatUsage, membersUsed, aiTokensUsed, subscription] = await Promise.all([
            this.moduleService.getEffectiveQuotas(org),
            this.quotaService.getBoatUsage(org),
            this.quotaService.countMembers(org),
            this.aiTokenQuotaService.getUsage(org.id),
            this.subscriptionService.getActive(org.id),
          ])
          return {
            plan: org.plan,
            subscription:
              subscription === null ? null : this.subscriptionService.toInfo(subscription),
            quotas,
            usage: {
              boats: boatUsage,
              members: { used: membersUsed, limit: quotas.maxMembers },
              aiTokens: { used: aiTokensUsed, limit: PLAN_LIMITS[org.plan].aiTokensPerMonth },
            },
          }
        },
      },
    ]
  }
}
