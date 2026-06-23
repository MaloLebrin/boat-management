import type Boat from '#models/boat'
import type BoatFuelLog from '#models/boat_fuel_log'
import type BoatIncident from '#models/boat_incident'
import type BoatMaintenanceEvent from '#models/boat_maintenance_event'
import type BoatMaintenanceSheet from '#models/boat_maintenance_sheet'
import type BoatMaintenanceTask from '#models/boat_maintenance_task'
import type BoatPositionHistory from '#models/boat_position_history'
import type NavigationLog from '#models/navigation_log'
import type Media from '#models/media'
import type { AiSuggestion } from '#services/ai_analysis_service'
import type { IncidentType, IncidentStatus } from '#shared/types/incident'
import type { BoatDocumentRow } from '#shared/types/boat_document'
import type { FuelLogRow } from '#shared/types/fuel_log'
import type { NavigationLogRow, NavigationLogPortOption } from '#shared/types/navigation_log'
import type { CrewMemberOption } from '#shared/types/crew'

export interface BoatManageContext {
  positionHistory: BoatPositionHistory[]
  boatMedia: Media[]
  maintenanceEvents: BoatMaintenanceEvent[]
  maintenanceTasks: BoatMaintenanceTask[]
  maintenanceSheets: BoatMaintenanceSheet[]
  boatDocuments: BoatDocumentRow[]
  aiSuggestions: AiSuggestion[] | null
  canManageMaintenance: boolean
  canManageEquipment: boolean
  canManageDocuments: boolean
  canExport: boolean
}

export interface BoatNavigationContext {
  positionHistory: BoatPositionHistory[]
  boatMedia: Media[]
  incidents: BoatIncident[]
  fuelLogs: BoatFuelLog[]
  navigationLogs: NavigationLog[]
  portOptions: NavigationLogPortOption[]
  crewMemberOptions: CrewMemberOption[]
  canManageMaintenance: boolean
  canDeleteIncidents: boolean
  canCreateFuelLogs: boolean
  canDeleteFuelLogs: boolean
  canCreateNavigationLogs: boolean
  canUpdateNavigationLogs: boolean
  canDeleteNavigationLogs: boolean
}

export function toEditForm(boat: Boat) {
  return {
    id: boat.id,
    name: boat.name,
    registrationNumber: boat.registrationNumber,
    type: boat.type,
    propulsionType: boat.propulsionType,
    lengthM: boat.lengthM,
    beamM: boat.beamM,
    draftM: boat.draftM,
    mastHeightM: boat.mastHeightM,
    hullMaterial: boat.hullMaterial,
    yearBuilt: boat.yearBuilt,
    manufacturer: boat.manufacturer,
    model: boat.model,
    manufacturedAt: boat.manufacturedAt ? boat.manufacturedAt.toISODate() : null,
    homePort: boat.homePort,
    navigationCategory: boat.navigationCategory,
    hullIdentificationNumber: boat.hullIdentificationNumber,
    francisationNumber: boat.francisationNumber,
    flagCountry: boat.flagCountry,
    maxPersons: boat.maxPersons,
    mmsi: boat.mmsi,
    imoNumber: boat.imoNumber,
    spotId: boat.spotId ?? null,
  }
}

export function toManageProps(boat: Boat, ctx: BoatManageContext) {
  return {
    boat: toBoatDetail(boat, ctx),
    maintenanceEvents: ctx.maintenanceEvents.map(toMaintenanceEvent),
    maintenanceTasks: ctx.maintenanceTasks.map(toMaintenanceTask),
    maintenanceSheets: ctx.maintenanceSheets.map(toMaintenanceSheet),
    boatDocuments: ctx.boatDocuments,
    canManageMaintenance: ctx.canManageMaintenance,
    canManageEquipment: ctx.canManageEquipment,
    canManageDocuments: ctx.canManageDocuments,
    canExport: ctx.canExport,
    aiSuggestions: ctx.aiSuggestions,
  }
}

export function toNavigationProps(boat: Boat, ctx: BoatNavigationContext) {
  return {
    boat: toBoatDetail(boat, ctx),
    incidents: ctx.incidents.map(toIncident),
    fuelLogs: ctx.fuelLogs.map(toFuelLog),
    navigationLogs: ctx.navigationLogs.map(toNavigationLog),
    portOptions: ctx.portOptions,
    crewMemberOptions: ctx.crewMemberOptions,
    canManageMaintenance: ctx.canManageMaintenance,
    canDeleteIncidents: ctx.canDeleteIncidents,
    canCreateFuelLogs: ctx.canCreateFuelLogs,
    canDeleteFuelLogs: ctx.canDeleteFuelLogs,
    canCreateNavigationLogs: ctx.canCreateNavigationLogs,
    canUpdateNavigationLogs: ctx.canUpdateNavigationLogs,
    canDeleteNavigationLogs: ctx.canDeleteNavigationLogs,
  }
}

function toNavigationLog(log: NavigationLog): NavigationLogRow {
  return {
    id: log.id,
    boatId: log.boatId,
    status: log.status,
    departedAt: log.departedAt.toISO()!,
    arrivedAt: log.arrivedAt ? log.arrivedAt.toISO()! : null,
    departurePortId: log.departurePortId,
    departurePortName: log.departurePortName,
    arrivalPortId: log.arrivalPortId,
    arrivalPortName: log.arrivalPortName,
    distanceNm: log.distanceNm !== null ? Number.parseFloat(log.distanceNm) : null,
    engineHoursStart:
      log.engineHoursStart !== null ? Number.parseFloat(log.engineHoursStart) : null,
    engineHoursEnd: log.engineHoursEnd !== null ? Number.parseFloat(log.engineHoursEnd) : null,
    fuelConsumedLiters:
      log.fuelConsumedLiters !== null ? Number.parseFloat(log.fuelConsumedLiters) : null,
    windForceBeaufort: log.windForceBeaufort,
    seaState: log.seaState,
    crewCount: log.crewCount,
    notes: log.notes,
    createdAt: log.createdAt.toISO()!,
    crew: (log.$preloaded.crew ? log.crew : []).map((m) => ({
      crewMemberId: m.id,
      fullName: m.fullName,
      role: m.$extras.pivot_role,
    })),
  }
}

function toFuelLog(log: BoatFuelLog): FuelLogRow {
  return {
    id: log.id,
    boatId: log.boatId,
    boatEngineId: log.boatEngineId,
    fueledAt: log.fueledAt.toISODate()!,
    quantityLiters: Number.parseFloat(log.quantityLiters),
    pricePerLiter: log.pricePerLiter !== null ? Number.parseFloat(log.pricePerLiter) : null,
    totalCost: log.totalCost !== null ? Number.parseFloat(log.totalCost) : null,
    engineHoursAtFueling:
      log.engineHoursAtFueling !== null ? Number.parseFloat(log.engineHoursAtFueling) : null,
    supplier: log.supplier,
    notes: log.notes,
    createdAt: log.createdAt.toISO()!,
  }
}

function toBoatDetail(
  boat: Boat,
  ctx: Pick<BoatManageContext | BoatNavigationContext, 'positionHistory' | 'boatMedia'>
) {
  return {
    id: boat.id,
    name: boat.name,
    registrationNumber: boat.registrationNumber,
    type: boat.type,
    propulsionType: boat.propulsionType,
    lengthM: boat.lengthM,
    beamM: boat.beamM,
    draftM: boat.draftM,
    mastHeightM: boat.mastHeightM,
    hullMaterial: boat.hullMaterial,
    yearBuilt: boat.yearBuilt,
    manufacturer: boat.manufacturer,
    model: boat.model,
    homePort: boat.homePort,
    navigationCategory: boat.navigationCategory,
    hullIdentificationNumber: boat.hullIdentificationNumber,
    francisationNumber: boat.francisationNumber,
    flagCountry: boat.flagCountry,
    maxPersons: boat.maxPersons,
    mmsi: boat.mmsi,
    imoNumber: boat.imoNumber,
    spotId: boat.spotId ?? null,
    spot: boat.spot ? toSpot(boat.spot) : null,
    positionHistory: ctx.positionHistory.map(toPositionHistoryEntry),
    engines: boat.engines.map(toEngine),
    sails: boat.sails.map(toSail),
    rig: boat.rig ? toRig(boat.rig) : null,
    media: ctx.boatMedia.map(toMedia),
    safetyEquipment: boat.safetyEquipment.map(toSafetyEquipmentItem),
  }
}

function toSpot(spot: NonNullable<Boat['spot']>) {
  return {
    id: spot.id,
    name: spot.name,
    pontoonId: spot.pontoonId,
    pontoonName: spot.pontoon?.name ?? null,
    mouillageId: spot.mouillageId,
    mouillageNom: spot.mouillage?.name ?? null,
    portName: spot.pontoon?.port?.name ?? spot.mouillage?.port?.name ?? null,
  }
}

function toPositionHistoryEntry(h: BoatPositionHistory) {
  return {
    id: h.id,
    spotId: h.spotId,
    spotName: h.spot?.name ?? null,
    pontoonName: h.spot?.pontoon?.name ?? null,
    mouillageNom: h.spot?.mouillage?.name ?? null,
    portName: h.spot?.pontoon?.port?.name ?? h.spot?.mouillage?.port?.name ?? null,
    latitude: h.latitude !== null && h.latitude !== undefined ? Number(h.latitude) : null,
    longitude: h.longitude !== null && h.longitude !== undefined ? Number(h.longitude) : null,
    source: h.source,
    startedAt: h.startedAt.toISODate()!,
    endedAt: h.endedAt ? h.endedAt.toISODate() : null,
  }
}

function toEngine(e: Boat['engines'][number]) {
  return {
    id: e.id,
    kind: e.kind,
    fuel: e.fuel,
    brand: e.brand,
    model: e.model,
    serialNumber: e.serialNumber,
    manufacturedAt: e.manufacturedAt ? e.manufacturedAt.toISODate() : null,
    powerHp: e.powerHp,
    hours: e.hours,
    status: e.status,
  }
}

function toSail(s: Boat['sails'][number]) {
  return {
    id: s.id,
    sailType: s.sailType,
    manufacturedAt: s.manufacturedAt ? s.manufacturedAt.toISODate() : null,
    areaM2: s.areaM2,
    material: s.material,
    reefPoints: s.reefPoints,
    status: s.status,
  }
}

function toRig(rig: NonNullable<Boat['rig']>) {
  return {
    id: rig.id,
    rigType: rig.rigType,
    manufacturedAt: rig.manufacturedAt ? rig.manufacturedAt.toISODate() : null,
    mastCount: rig.mastCount,
    spreaders: rig.spreaders,
    status: rig.status,
  }
}

function toMedia(m: Media) {
  return {
    id: m.id,
    kind: m.kind as 'photo' | 'document',
    secureUrl: m.secureUrl,
    originalFilename: m.originalFilename,
    format: m.format,
    bytes: m.bytes,
    width: m.width,
    height: m.height,
    position: m.position,
    caption: m.caption,
  }
}

function toSafetyEquipmentItem(item: Boat['safetyEquipment'][number]) {
  return {
    id: item.id,
    equipmentType: item.equipmentType,
    quantity: item.quantity,
    expiryDate: item.expiryDate ? item.expiryDate.toISODate() : null,
    status: item.status,
    notes: item.notes,
  }
}

function toMaintenanceEvent(ev: BoatMaintenanceEvent) {
  return {
    id: ev.id,
    subject: ev.subject,
    title: ev.title,
    notes: ev.notes,
    performedAt: ev.performedAt.toISODate()!,
    engineCaption: ev.engineCaption,
    sailCaption: ev.sailCaption,
    boatEngineId: ev.boatEngineId,
    boatSailId: ev.boatSailId,
    boatRigId: ev.boatRigId,
    parts: ev.parts.map((p) => ({
      id: p.id,
      name: p.name,
      quantity: p.quantity,
      notes: p.notes,
    })),
  }
}

function toMaintenanceTask(t: BoatMaintenanceTask) {
  return {
    id: t.id,
    subject: t.subject,
    title: t.title,
    notes: t.notes,
    status: t.status as 'open' | 'done',
    dueAt: t.dueAt ? t.dueAt.toISODate() : null,
    dueEngineHours: t.dueEngineHours,
    boatEngineId: t.boatEngineId,
    boatSailId: t.boatSailId,
    boatRigId: t.boatRigId,
    recurrenceIntervalMonths: t.recurrenceIntervalMonths,
    recurrenceIntervalEngineHours: t.recurrenceIntervalEngineHours,
  }
}

function toIncident(i: BoatIncident) {
  return {
    id: i.id,
    boatId: i.boatId,
    occurredAt: i.occurredAt.toISO()!,
    type: i.type as IncidentType,
    location: i.location,
    description: i.description,
    insuranceClaimed: i.insuranceClaimed,
    insuranceClaimRef: i.insuranceClaimRef,
    status: i.status as IncidentStatus,
    closedAt: i.closedAt ? i.closedAt.toISO() : null,
    createdAt: i.createdAt.toISO()!,
  }
}

function toMaintenanceSheet(s: BoatMaintenanceSheet) {
  return {
    id: s.id,
    type: s.type as 'entretien' | 'montage' | 'hivernage' | 'dehivernage' | 'atelier',
    title: s.title,
    status: s.status as 'in_progress' | 'completed',
    performedAt: s.performedAt.toISODate()!,
    notes: s.notes,
    items: s.items.map((item) => ({
      id: item.id,
      label: item.label,
      isDone: item.isDone,
      notes: item.notes,
      position: item.position,
    })),
  }
}
