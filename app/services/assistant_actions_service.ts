import { AiInvalidResponseError } from '#exceptions/ai_errors'
import {
  AssistantActionEntityGoneError,
  AssistantActionNotAllowedError,
} from '#exceptions/assistant_errors'
import type Boat from '#models/boat'
import BoatEngine from '#models/boat_engine'
import BoatEnginePart from '#models/boat_engine_part'
import Client from '#models/client'
import NavigationLog from '#models/navigation_log'
import type User from '#models/user'
import BoatPolicy from '#policies/boat_policy'
import ClientPolicy from '#policies/client_policy'
import FuelLogPolicy from '#policies/fuel_log_policy'
import IncidentPolicy from '#policies/incident_policy'
import MaintenancePolicy from '#policies/maintenance_policy'
import NavigationLogPolicy from '#policies/navigation_log_policy'
import BoatEnginePartService, {
  type BoatEnginePartPayload,
} from '#services/boat_engine_part_service'
import BoatEngineService from '#services/boat_engine_service'
import BoatFuelLogService from '#services/boat_fuel_log_service'
import BoatHullService from '#services/boat_hull_service'
import BoatIncidentService from '#services/boat_incident_service'
import BoatMaintenanceTaskService from '#services/boat_maintenance_task_service'
import BoatReservationService from '#services/boat_reservation_service'
import ClientService from '#services/client_service'
import NavigationLogService from '#services/navigation_log_service'
import OrganizationModuleService from '#services/organization_module_service'
import {
  ASSISTANT_ACTION_KINDS,
  ASSISTANT_ACTION_META,
  type AssistantActionKind,
  type AssistantActionOutcome,
  type AssistantFleetRoster,
  type AssistantPendingAction,
  type AssistantProposedAction,
} from '#shared/types/assistant'
import type { PlanQuotas } from '#shared/types/plan'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Registre des actions confirmables du copilote FleetAi (agent actionnable).
 *
 * Le modèle ne fait que des PROPOSITIONS (`propose_action`) : ce service les
 * valide (ids prouvés org via le roster ou des requêtes bornées), les stocke
 * dénormalisées dans `pending_action`, puis les exécute uniquement à la
 * confirmation explicite de l'utilisateur — via les services métier existants,
 * qui revalident leurs propres règles. Le Bouncer est appliqué sur l'entité
 * RECHARGÉE côté serveur, et les flags de plan sont re-vérifiés à l'exécution
 * (le plan peut changer entre la proposition et le clic).
 */
@inject()
export default class AssistantActionsService {
  constructor(
    private boatHullService: BoatHullService,
    private clientService: ClientService,
    private engineService: BoatEngineService,
    private fuelLogService: BoatFuelLogService,
    private incidentService: BoatIncidentService,
    private maintenanceTaskService: BoatMaintenanceTaskService,
    private moduleService: OrganizationModuleService,
    private navigationLogService: NavigationLogService,
    private partService: BoatEnginePartService,
    private reservationService: BoatReservationService
  ) {}

  /**
   * Kinds proposables à cet utilisateur — capability du rôle + plan effectif.
   * `quotas` peut être fourni par l'appelant pour éviter de recalculer les
   * quotas effectifs plusieurs fois dans le même tour.
   */
  async allowedKindsFor(user: User, effectiveQuotas?: PlanQuotas): Promise<AssistantActionKind[]> {
    if (user.organizationId === null) return []
    if (user.organization === undefined) await user.load('organization')
    const quotas =
      effectiveQuotas ?? (await this.moduleService.getEffectiveQuotas(user.organization))

    const kinds: AssistantActionKind[] = []
    for (const kind of ASSISTANT_ACTION_KINDS) {
      const meta = ASSISTANT_ACTION_META[kind]
      if (!(await user.hasPermission(user.organizationId, meta.capability))) continue
      if (meta.planFlag !== undefined && !quotas[meta.planFlag]) continue
      kinds.push(kind)
    }
    return kinds
  }

  /**
   * Valide une proposition du modèle et la dénormalise pour la carte de
   * confirmation. Lève `AiInvalidResponseError` (rien n'est persisté,
   * invariant #602/#634) quand un id sort de l'organisation ou que l'action
   * n'est pas autorisée à cet utilisateur — un modèle peut halluciner un kind
   * qui ne lui a pas été proposé.
   */
  async validateProposal(
    user: User,
    action: AssistantProposedAction,
    roster: AssistantFleetRoster
  ): Promise<AssistantPendingAction> {
    const allowed = await this.allowedKindsFor(user)
    if (!allowed.includes(action.kind)) {
      throw new AiInvalidResponseError('Assistant proposed an action not offered to this user')
    }

    if (action.kind === 'create_client') {
      return { ...action }
    }

    const boat = roster.boats.find((b) => b.id === action.boatId)
    if (boat === undefined) {
      throw new AiInvalidResponseError('Assistant action names a boat outside the roster')
    }

    switch (action.kind) {
      case 'create_task': {
        let engineLabel: string | null = null
        if (action.boatEngineId !== null) {
          const engine = boat.engines.find((e) => e.id === action.boatEngineId)
          if (engine === undefined) {
            throw new AiInvalidResponseError('Assistant action names an engine outside the boat')
          }
          engineLabel = engine.label
        }
        const hasEngineHours =
          action.dueEngineHours !== null || action.recurrenceIntervalEngineHours !== null
        if (hasEngineHours && action.subject !== 'engine') {
          throw new AiInvalidResponseError(
            'Assistant engine-hour proposal must have subject=engine'
          )
        }
        if (hasEngineHours && action.boatEngineId === null) {
          throw new AiInvalidResponseError('Assistant engine-hour proposal has no boatEngineId')
        }
        const { kind, boatId, ...rest } = action
        return { kind, boatId, boatName: boat.name, engineLabel, ...rest }
      }

      case 'add_engine_hours': {
        const engine = boat.engines.find((e) => e.id === action.engineId)
        if (engine === undefined) {
          throw new AiInvalidResponseError('Assistant action names an engine outside the boat')
        }
        const row = await BoatEngine.query().select('id', 'hours').where('id', engine.id).first()
        return {
          kind: 'add_engine_hours',
          boatId: boat.id,
          boatName: boat.name,
          engineId: engine.id,
          engineLabel: engine.label,
          incrementBy: action.incrementBy,
          currentHours: row?.hours ?? null,
        }
      }

      case 'start_trip': {
        const { kind, boatId, ...rest } = action
        return { kind, boatId, boatName: boat.name, ...rest }
      }

      case 'close_trip': {
        let engineLabel: string | null = null
        if (action.boatEngineId !== null) {
          const engine = boat.engines.find((e) => e.id === action.boatEngineId)
          if (engine === undefined) {
            throw new AiInvalidResponseError('Assistant action names an engine outside the boat')
          }
          engineLabel = engine.label
        }
        const log = await NavigationLog.query()
          .select('id', 'departedAt')
          .where('boatId', boat.id)
          .where('status', 'in_progress')
          .first()
        if (log === null) {
          throw new AiInvalidResponseError('Assistant close_trip: the boat has no trip in progress')
        }
        const { kind, boatId, ...rest } = action
        return {
          kind,
          boatId,
          boatName: boat.name,
          logId: log.id,
          departedAt: log.departedAt?.toISO() ?? '',
          engineLabel,
          ...rest,
        }
      }

      case 'log_fuel': {
        let engineLabel: string | null = null
        if (action.boatEngineId !== null) {
          const engine = boat.engines.find((e) => e.id === action.boatEngineId)
          if (engine === undefined) {
            throw new AiInvalidResponseError('Assistant action names an engine outside the boat')
          }
          engineLabel = engine.label
        }
        const { kind, boatId, ...rest } = action
        return { kind, boatId, boatName: boat.name, engineLabel, ...rest }
      }

      case 'report_incident': {
        const { kind, boatId, ...rest } = action
        return { kind, boatId, boatName: boat.name, ...rest }
      }

      case 'create_reservation': {
        if (action.clientId !== null) {
          const client = await Client.query()
            .select('id')
            .where('id', action.clientId)
            .where('organizationId', user.organizationId!)
            .first()
          if (client === null) {
            throw new AiInvalidResponseError(
              'Assistant action names a client outside the organization'
            )
          }
        }
        const { kind, boatId, ...rest } = action
        return { kind, boatId, boatName: boat.name, ...rest }
      }

      case 'set_part_stock': {
        const engine = boat.engines.find((e) => e.id === action.engineId)
        if (engine === undefined) {
          throw new AiInvalidResponseError('Assistant action names an engine outside the boat')
        }
        // Le roster prouve moteur ∈ bateau ∈ org — la pièce est bornée au moteur.
        const part = await BoatEnginePart.query()
          .select('id', 'designation', 'reference', 'stock')
          .where('id', action.partId)
          .where('boatEngineId', engine.id)
          .first()
        if (part === null) {
          throw new AiInvalidResponseError('Assistant action names a part outside the engine')
        }
        return {
          kind: 'set_part_stock',
          boatId: boat.id,
          boatName: boat.name,
          engineId: engine.id,
          engineLabel: engine.label,
          partId: part.id,
          designation: part.designation,
          reference: part.reference,
          oldStock: part.stock,
          newStock: action.newStock,
        }
      }
    }
  }

  /**
   * Bateau de l'action, rechargé et prouvé org côté serveur — `null` pour les
   * actions sans bateau (`create_client`). Lève `BoatNotFoundError` si le
   * bateau a disparu entre la proposition et la confirmation.
   */
  async resolveBoat(user: User, pending: AssistantPendingAction): Promise<Boat | null> {
    if (pending.kind === 'create_client') return null
    return this.boatHullService.getForUserOrFail(user, pending.boatId)
  }

  /** Bouncer par kind, sur l'entité rechargée — jamais depuis un payload client. */
  async authorizeConfirm(
    bouncer: HttpContext['bouncer'],
    pending: AssistantPendingAction,
    boat: Boat | null
  ): Promise<void> {
    switch (pending.kind) {
      case 'create_task':
        await bouncer.with(MaintenancePolicy).authorize('create', boat!)
        return
      case 'add_engine_hours':
      case 'set_part_stock':
        await bouncer.with(BoatPolicy).authorize('edit', boat!)
        return
      case 'start_trip':
        await bouncer.with(NavigationLogPolicy).authorize('create', boat!)
        return
      case 'close_trip':
        await bouncer.with(NavigationLogPolicy).authorize('update', boat!)
        return
      case 'log_fuel':
        await bouncer.with(FuelLogPolicy).authorize('create', boat!)
        return
      case 'report_incident':
        await bouncer.with(IncidentPolicy).authorize('create', boat!)
        return
      case 'create_reservation':
        await bouncer.with(BoatPolicy).authorize('manage', boat!)
        return
      case 'create_client':
        await bouncer.with(ClientPolicy).authorize('create')
        return
    }
  }

  /**
   * Exécute l'action confirmée via le service métier existant (qui revalide
   * ses règles) et rend de quoi journaliser + flasher. Le flag de plan est
   * re-vérifié ici : la proposition peut précéder un changement de plan.
   */
  async execute(
    user: User,
    boat: Boat | null,
    pending: AssistantPendingAction
  ): Promise<AssistantActionOutcome> {
    const meta = ASSISTANT_ACTION_META[pending.kind]
    if (meta.planFlag !== undefined) {
      if (user.organization === undefined) await user.load('organization')
      const quotas = await this.moduleService.getEffectiveQuotas(user.organization)
      if (!quotas[meta.planFlag]) throw new AssistantActionNotAllowedError()
    }

    switch (pending.kind) {
      case 'create_task': {
        const task = await this.maintenanceTaskService.createForBoat(user, boat!, {
          subject: pending.subject,
          title: pending.title,
          notes: pending.notes,
          boatEngineId: pending.boatEngineId,
          dueAt: pending.dueAt,
          dueEngineHours: pending.dueEngineHours,
          recurrenceIntervalMonths: pending.recurrenceIntervalMonths,
          recurrenceIntervalEngineHours: pending.recurrenceIntervalEngineHours,
        })
        return {
          // Carte historique `task_created` conservée : plus riche (échéance)
          // et déjà rendue par le fil.
          card: {
            kind: 'task_created',
            taskId: task.id,
            boatName: pending.boatName,
            title: pending.title,
            dueAt: pending.dueAt,
            dueEngineHours: pending.dueEngineHours,
          },
          auditAction: 'maintenance_task.create',
          entityType: 'maintenance_task',
          entityId: task.id,
          metadata: { name: task.title, boatName: pending.boatName },
          flashKey: 'flash.assistant.taskCreated',
        }
      }

      case 'add_engine_hours': {
        const engine = await this.engineService.incrementHours(
          user,
          boat!,
          pending.engineId,
          pending.incrementBy
        )
        return {
          card: {
            kind: 'action_done',
            actionKind: pending.kind,
            boatName: pending.boatName,
            label: `${pending.engineLabel} (+${pending.incrementBy} h)`,
            entityId: engine.id,
          },
          auditAction: 'engine.add_hours',
          entityType: 'boat_engine',
          entityId: engine.id,
          metadata: {
            boatName: pending.boatName,
            engineLabel: pending.engineLabel,
            incrementBy: pending.incrementBy,
            hours: engine.hours,
          },
          flashKey: 'flash.assistant.actions.add_engine_hours',
        }
      }

      case 'start_trip': {
        const log = await this.navigationLogService.createForBoat(boat!, {
          departedAt: pending.departedAt,
          departurePortName: pending.departurePortName,
          engineHoursStart: pending.engineHoursStart,
          crewCount: pending.crewCount,
          notes: pending.notes,
        })
        return {
          card: {
            kind: 'action_done',
            actionKind: pending.kind,
            boatName: pending.boatName,
            label: pending.departurePortName,
            entityId: log.id,
          },
          auditAction: 'navigation_log.create',
          entityType: 'navigation_log',
          entityId: log.id,
          metadata: { boatName: pending.boatName, departedAt: pending.departedAt },
          flashKey: 'flash.assistant.actions.start_trip',
        }
      }

      case 'close_trip': {
        // Re-résolution défensive : la sortie de la proposition peut avoir été
        // clôturée entre-temps — l'unique `in_progress` du bateau fait foi.
        const log = await NavigationLog.query()
          .select('id')
          .where('boatId', boat!.id)
          .where('status', 'in_progress')
          .first()
        if (log === null) throw new AssistantActionEntityGoneError()
        const closed = await this.navigationLogService.closeTrip(boat!, log.id, {
          arrivedAt: pending.arrivedAt,
          arrivalPortName: pending.arrivalPortName,
          distanceNm: pending.distanceNm,
          engineHoursEnd: pending.engineHoursEnd,
          boatEngineId: pending.boatEngineId,
          fuelConsumedLiters: pending.fuelConsumedLiters,
          notes: pending.notes,
        })
        return {
          card: {
            kind: 'action_done',
            actionKind: pending.kind,
            boatName: pending.boatName,
            label: pending.arrivalPortName,
            entityId: closed.id,
          },
          auditAction: 'navigation_log.close',
          entityType: 'navigation_log',
          entityId: closed.id,
          metadata: { boatName: pending.boatName, arrivedAt: pending.arrivedAt },
          flashKey: 'flash.assistant.actions.close_trip',
        }
      }

      case 'log_fuel': {
        const fuelLog = await this.fuelLogService.createForBoat(user, boat!, {
          fueledAt: pending.fueledAt,
          quantityLiters: pending.quantityLiters,
          pricePerLiter: pending.pricePerLiter,
          totalCost: pending.totalCost,
          boatEngineId: pending.boatEngineId,
          fuelType: pending.fuelType,
          supplier: pending.supplier,
          notes: pending.notes,
        })
        return {
          card: {
            kind: 'action_done',
            actionKind: pending.kind,
            boatName: pending.boatName,
            label: `${pending.quantityLiters} L`,
            entityId: fuelLog.id,
          },
          auditAction: 'fuel_log.create',
          entityType: 'fuel_log',
          entityId: fuelLog.id,
          metadata: { boatName: pending.boatName, quantityLiters: pending.quantityLiters },
          flashKey: 'flash.assistant.actions.log_fuel',
        }
      }

      case 'report_incident': {
        const incident = await this.incidentService.createForBoat(user, boat!, {
          occurredAt: pending.occurredAt,
          type: pending.incidentType,
          location: pending.location,
          description: pending.description,
        })
        return {
          card: {
            kind: 'action_done',
            actionKind: pending.kind,
            boatName: pending.boatName,
            label: pending.location,
            entityId: incident.id,
          },
          auditAction: 'incident.create',
          entityType: 'incident',
          entityId: incident.id,
          metadata: { boatName: pending.boatName, type: pending.incidentType },
          flashKey: 'flash.assistant.actions.report_incident',
        }
      }

      case 'create_reservation': {
        const { reservation } = await this.reservationService.create(user, boat!, {
          startsAt: pending.startsAt,
          endsAt: pending.endsAt,
          clientId: pending.clientId,
          clientName: pending.clientName,
          clientEmail: pending.clientEmail,
          clientPhone: pending.clientPhone,
          type: pending.reservationType,
          notes: pending.notes,
          totalPrice: null,
        })
        return {
          card: {
            kind: 'action_done',
            actionKind: pending.kind,
            boatName: pending.boatName,
            label: pending.clientName,
            entityId: reservation.id,
          },
          auditAction: 'reservation.create',
          entityType: 'reservation',
          entityId: reservation.id,
          metadata: {
            boatName: pending.boatName,
            clientName: pending.clientName,
            startsAt: pending.startsAt,
            endsAt: pending.endsAt,
          },
          flashKey: 'flash.assistant.actions.create_reservation',
        }
      }

      case 'create_client': {
        if (user.organization === undefined) await user.load('organization')
        const client = await this.clientService.create(user.organization, {
          firstName: pending.firstName,
          lastName: pending.lastName,
          email: pending.email,
          phone: pending.phone,
          notes: pending.notes,
        })
        return {
          card: {
            kind: 'action_done',
            actionKind: pending.kind,
            boatName: null,
            label: `${pending.firstName} ${pending.lastName}`,
            entityId: client.id,
          },
          auditAction: 'client.create',
          entityType: 'client',
          entityId: client.id,
          metadata: { clientName: `${pending.firstName} ${pending.lastName}` },
          flashKey: 'flash.assistant.actions.create_client',
        }
      }

      case 'set_part_stock': {
        // Relecture défensive : la pièce peut avoir disparu depuis la
        // proposition — et `update` écrase TOUT le payload, donc il est
        // reconstruit depuis la ligne actuelle avec le seul stock modifié.
        const part = await BoatEnginePart.query()
          .where('id', pending.partId)
          .where('boatEngineId', pending.engineId)
          .first()
        if (part === null) throw new AssistantActionEntityGoneError()
        const updated = await this.partService.update(user, boat!, pending.engineId, part.id, {
          designation: part.designation,
          reference: part.reference,
          stock: pending.newStock,
          minStockAlert: part.minStockAlert,
          supplier: part.supplier,
          notes: part.notes,
          // Colonne texte libre en base — le vocabulaire est garanti à l'écriture.
          wearState: part.wearState as BoatEnginePartPayload['wearState'],
          purchasePrice: part.purchasePrice !== null ? Number(part.purchasePrice) : null,
          purchasedAt: part.purchasedAt,
        })
        return {
          card: {
            kind: 'action_done',
            actionKind: pending.kind,
            boatName: pending.boatName,
            label: `${pending.designation} : ${pending.oldStock ?? 0} → ${pending.newStock}`,
            entityId: updated.id,
          },
          auditAction: 'engine_part.set_stock',
          entityType: 'boat_engine_part',
          entityId: updated.id,
          metadata: {
            boatName: pending.boatName,
            designation: pending.designation,
            oldStock: pending.oldStock,
            newStock: pending.newStock,
          },
          flashKey: 'flash.assistant.actions.set_part_stock',
        }
      }
    }
  }
}
