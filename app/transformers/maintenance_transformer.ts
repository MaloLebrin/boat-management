import type BoatMaintenanceSheet from '#models/boat_maintenance_sheet'
import type BoatMaintenanceTask from '#models/boat_maintenance_task'
import type BoatEngine from '#models/boat_engine'
import type BoatGenericEquipment from '#models/boat_generic_equipment'
import type BoatRig from '#models/boat_rig'
import type BoatSafetyEquipment from '#models/boat_safety_equipment'
import type BoatSail from '#models/boat_sail'
import type { GenericEquipmentCategory } from '#shared/types/boat'
import type Boat from '#models/boat'
import type { BoatTaskEquipment, SheetType, TaskEquipmentSource } from '#shared/types/maintenance'

interface TaskEquipmentModels {
  engines?: BoatEngine[]
  sails?: BoatSail[]
  rig?: BoatRig | null
  safetyEquipment?: BoatSafetyEquipment[]
  genericEquipment?: BoatGenericEquipment[]
}

/**
 * Équipements proposés dans le formulaire de tâche. Une page équipement ne
 * passe que son propre équipement ; le dashboard passe tout le bateau.
 */
export function toTaskEquipmentSource(models: TaskEquipmentModels): TaskEquipmentSource {
  return {
    engines: (models.engines ?? []).map((e) => ({
      id: e.id,
      kind: e.kind,
      fuel: e.fuel,
      brand: e.brand,
      model: e.model,
      serialNumber: e.serialNumber,
    })),
    sails: (models.sails ?? []).map((s) => ({ id: s.id, sailType: s.sailType, areaM2: s.areaM2 })),
    rig: models.rig ? { id: models.rig.id } : null,
    safetyEquipment: (models.safetyEquipment ?? []).map((item) => ({
      id: item.id,
      equipmentType: item.equipmentType,
    })),
    genericEquipment: (models.genericEquipment ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category as GenericEquipmentCategory,
    })),
  }
}

/** Équipements d'un bateau chargé avec toutes ses relations d'équipement. */
export function toBoatTaskEquipment(boat: Boat | null): BoatTaskEquipment {
  return {
    boatId: boat?.id ?? null,
    equipment: toTaskEquipmentSource(
      boat
        ? {
            engines: boat.engines,
            sails: boat.sails,
            rig: boat.rig,
            safetyEquipment: boat.safetyEquipment,
            genericEquipment: boat.genericEquipment,
          }
        : {}
    ),
  }
}

export function toMaintenanceTask(t: BoatMaintenanceTask) {
  return {
    id: t.id,
    boatId: t.boatId,
    subject: t.subject,
    title: t.title,
    notes: t.notes,
    status: t.status as 'open' | 'done',
    dueAt: t.dueAt ? t.dueAt.toISODate() : null,
    dueEngineHours: t.dueEngineHours,
    doneAt: t.doneAt ? t.doneAt.toISODate() : null,
    doneEngineHours: t.doneEngineHours,
    lastDoneEngineHours: t.lastDoneEngineHours,
    boatEngineId: t.boatEngineId,
    boatSailId: t.boatSailId,
    boatRigId: t.boatRigId,
    boatSafetyEquipmentId: t.boatSafetyEquipmentId,
    boatGenericEquipmentId: t.boatGenericEquipmentId,
    recurrenceIntervalMonths: t.recurrenceIntervalMonths,
    recurrenceIntervalEngineHours: t.recurrenceIntervalEngineHours,
    createdAt: t.createdAt.toISO(),
    updatedAt: t.updatedAt?.toISO() ?? null,
  }
}

export function toMaintenanceSheet(s: BoatMaintenanceSheet) {
  return {
    id: s.id,
    boatId: s.boatId,
    type: s.type as SheetType,
    title: s.title,
    status: s.status as 'in_progress' | 'completed',
    performedAt: s.performedAt.toISODate(),
    notes: s.notes,
    items: (s.items ?? []).map((item) => ({
      id: item.id,
      label: item.label,
      isDone: item.isDone,
      notes: item.notes,
      position: item.position,
      // le client renvoie cette valeur en `_expectedUpdatedAt` au rejeu hors-ligne (#490)
      updatedAt: item.updatedAt?.toISO() ?? null,
    })),
    createdAt: s.createdAt.toISO(),
    updatedAt: s.updatedAt?.toISO() ?? null,
  }
}
