import i18nManager from '@adonisjs/i18n/services/main'
import { BoatNotFoundError } from '#exceptions/boat_errors'
import Boat from '#models/boat'
import type BoatEngine from '#models/boat_engine'
import type BoatEnginePart from '#models/boat_engine_part'
import BoatMaintenanceEvent from '#models/boat_maintenance_event'
import BoatMaintenanceTask from '#models/boat_maintenance_task'
import {
  listMaintenanceOperations,
  resolveEngineFamily,
} from '#shared/helpers/maintenance_operations'
import { resolveEffectiveExpiry } from '#shared/helpers/safety_compliance'
import type {
  AiSuggestionLocale,
  BoatSuggestionsInput,
  EngineSuggestionsInput,
} from '#shared/types/ai'

/** États d'usure d'une pièce qui appellent un remplacement. */
const WORN_STATES = new Set(['worn', 'to_replace', 'damaged'])

/** Nombre d'événements de maintenance récents injectés dans le contexte. */
const RECENT_EVENTS_LIMIT = 5

/**
 * Construit les contextes des suggestions IA bateau et moteur.
 *
 * Source unique pour le contrôleur (refresh manuel) ET le job planifié : les
 * deux chemins produisent exactement le même input, donc la même empreinte
 * (`computeContextHash`) — condition de la détection « rien n'a changé ».
 * Requêtes directes façon `NotificationScanService` : le job n'a pas de `user`.
 */
export default class AiSuggestionContextService {
  /**
   * Contexte des suggestions d'un bateau (`kind: 'boat_suggestions'`),
   * enrichi des signaux pièces/équipements : usure, stock sous seuil,
   * expiration effective Division 240 des équipements de sécurité.
   */
  async buildBoatInput(boatId: number): Promise<BoatSuggestionsInput> {
    const boat = await Boat.query()
      .where('id', boatId)
      .preload('engines', (q) =>
        q.preload('parts', (pq) => pq.orderBy('id', 'asc')).orderBy('id', 'asc')
      )
      .preload('sails', (q) => q.orderBy('id', 'asc'))
      .preload('rig')
      .preload('safetyEquipment', (q) => q.orderBy('id', 'asc'))
      .preload('genericEquipment', (q) => q.orderBy('id', 'asc'))
      .first()
    if (!boat) throw new BoatNotFoundError()

    const [maintenanceTasks, maintenanceEvents] = await Promise.all([
      BoatMaintenanceTask.query()
        .where('boatId', boat.id)
        .orderBy('status', 'asc')
        .orderBy('dueAt', 'asc')
        .orderBy('id', 'desc'),
      BoatMaintenanceEvent.query()
        .where('boatId', boat.id)
        .orderBy('performedAt', 'desc')
        .limit(RECENT_EVENTS_LIMIT),
    ])

    return {
      boat: {
        id: boat.id,
        name: boat.name,
        type: boat.type,
        propulsionType: boat.propulsionType,
        yearBuilt: boat.yearBuilt,
        manufacturer: boat.manufacturer,
        model: boat.model,
        homePort: boat.homePort,
        navigationCategory: boat.navigationCategory,
        engines: boat.engines.map((engine) => ({
          kind: engine.kind,
          fuel: engine.fuel,
          family: engineFamilyOf(engine),
          hours: engine.hours,
          installHours: engine.installHours,
          brand: engine.brand,
          model: engine.model,
          partsToReplace: engine.parts
            .filter((part) => part.wearState !== null && WORN_STATES.has(part.wearState))
            .map((part) => part.designation),
          lowStockParts: engine.parts.filter(isLowStock).map((part) => part.designation),
        })),
        sails: boat.sails.map((sail) => ({
          sailType: sail.sailType,
          manufacturedAt: sail.manufacturedAt ? sail.manufacturedAt.toISODate() : null,
          status: sail.status,
        })),
        rig: boat.rig ? { rigType: boat.rig.rigType, status: boat.rig.status } : null,
        safetyEquipment: boat.safetyEquipment.map((equipment) => {
          const effectiveExpiry = resolveEffectiveExpiry(equipment)
          return {
            equipmentType: equipment.equipmentType,
            expiryDate: equipment.expiryDate ? equipment.expiryDate.toISODate() : null,
            effectiveExpiryDate: effectiveExpiry ? effectiveExpiry.date.toISODate() : null,
            status: equipment.status,
          }
        }),
        genericEquipment: boat.genericEquipment.map((equipment) => ({
          category: equipment.category,
          brand: equipment.brand,
          status: equipment.status,
          purchasedAt: equipment.purchasedAt ? equipment.purchasedAt.toISODate() : null,
        })),
      },
      maintenanceTasks: maintenanceTasks.map((task) => ({
        title: task.title,
        subject: task.subject,
        dueAt: task.dueAt ? task.dueAt.toISODate() : null,
        status: task.status,
      })),
      maintenanceEvents: maintenanceEvents.map((event) => ({
        title: event.title,
        subject: event.subject,
        performedAt: event.performedAt.toISODate()!,
      })),
    }
  }

  /**
   * Contexte des suggestions d'un moteur (`kind: 'engine_suggestions'`) :
   * identité et heures, pièces (usure, stock, achat), tâches/événements du
   * moteur et intervalles du catalogue d'opérations de sa famille (#581).
   * Les labels du catalogue sont localisés ici pour garder les prompt
   * builders purs.
   */
  async buildEngineInput(
    boat: Boat,
    engine: BoatEngine,
    locale: AiSuggestionLocale
  ): Promise<EngineSuggestionsInput> {
    const [parts, maintenanceTasks, maintenanceEvents] = await Promise.all([
      engine.related('parts').query().orderBy('id', 'asc'),
      BoatMaintenanceTask.query()
        .where('boatId', boat.id)
        .where('boatEngineId', engine.id)
        .orderBy('status', 'asc')
        .orderBy('dueAt', 'asc')
        .orderBy('id', 'desc'),
      BoatMaintenanceEvent.query()
        .where('boatId', boat.id)
        .where('boatEngineId', engine.id)
        .orderBy('performedAt', 'desc')
        .limit(RECENT_EVENTS_LIMIT),
    ])

    // Le filtrage du catalogue utilise la famille *de maintenance* dérivée du
    // couple kind/fuel — pas la colonne `family` (vocabulaire catalogue #574).
    const maintenanceFamily = resolveEngineFamily(engine.kind, engine.fuel)
    const i18n = i18nManager.locale(locale)
    const catalogOperations = listMaintenanceOperations({
      engineFamilies: maintenanceFamily ? [maintenanceFamily] : [],
    })
      .filter(
        (operation) =>
          operation.subject === 'engine' &&
          (operation.defaultIntervalMonths !== undefined ||
            operation.defaultIntervalEngineHours !== undefined)
      )
      .map((operation) => ({
        label: i18n.formatMessage(operation.labelKey),
        intervalMonths: operation.defaultIntervalMonths ?? null,
        intervalEngineHours: operation.defaultIntervalEngineHours ?? null,
      }))

    return {
      engine: {
        kind: engine.kind,
        fuel: engine.fuel,
        family: engineFamilyOf(engine),
        brand: engine.brand,
        model: engine.model,
        powerHp: engine.powerHp,
        hours: engine.hours,
        installHours: engine.installHours,
        manufacturedAt: engine.manufacturedAt ? engine.manufacturedAt.toISODate() : null,
        status: engine.status,
      },
      parts: parts.map((part) => ({
        designation: part.designation,
        reference: part.reference,
        wearState: part.wearState,
        stock: part.stock,
        minStockAlert: part.minStockAlert,
        purchasedAt: part.purchasedAt ? part.purchasedAt.toISODate() : null,
      })),
      maintenanceTasks: maintenanceTasks.map((task) => ({
        title: task.title,
        subject: task.subject,
        status: task.status,
        dueAt: task.dueAt ? task.dueAt.toISODate() : null,
        dueEngineHours: task.dueEngineHours,
      })),
      maintenanceEvents: maintenanceEvents.map((event) => ({
        title: event.title,
        subject: event.subject,
        performedAt: event.performedAt.toISODate()!,
      })),
      catalogOperations,
    }
  }
}

/** Famille du moteur : colonne `family` si renseignée, sinon dérivée kind/fuel (#574). */
function engineFamilyOf(engine: BoatEngine): string | null {
  return engine.family ?? resolveEngineFamily(engine.kind, engine.fuel)
}

/** Même prédicat que `BoatEnginePartService.listLowStock`, appliqué en mémoire. */
function isLowStock(part: BoatEnginePart): boolean {
  return part.minStockAlert !== null && part.stock !== null && part.stock <= part.minStockAlert
}
