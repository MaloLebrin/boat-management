import type Boat from '#models/boat'
import type BoatEquipmentAction from '#models/boat_equipment_action'
import type BoatFuelLog from '#models/boat_fuel_log'
import type BoatIncident from '#models/boat_incident'
import type BoatMaintenanceEvent from '#models/boat_maintenance_event'
import type BoatMaintenanceSheet from '#models/boat_maintenance_sheet'
import type BoatMaintenanceTask from '#models/boat_maintenance_task'
import type BoatPositionHistory from '#models/boat_position_history'
import type NavigationLog from '#models/navigation_log'
import type NavigationLogEntry from '#models/navigation_log_entry'
import type Media from '#models/media'
import type { IncidentType, IncidentStatus } from '#shared/types/incident'
import type { BoatPricingRow } from '#shared/types/boat_pricing'
import type { EngineFuel } from '#shared/constants/boats/boat_form_options'
import type { FuelLogRow } from '#shared/types/fuel_log'
import type { NavigationLogEntryRow, NavigationLogRow } from '#shared/types/navigation_log'
import type { BoatOwnerBoatSummary } from '#shared/types/boat'
import type { BoatCategory } from '#shared/types/boat_catalog'
import type { SafetyComplianceReport } from '#shared/types/safety'
import { toBoatEquipmentActionRow } from '#transformers/boat_equipment_action_transformer'

/**
 * Le squelette de la fiche bateau : tout ce qui est rendu avant que les données
 * d'onglet (différées, cf. #463) n'arrivent — identité du bateau, photos,
 * position et droits. Ces props sont volontairement peu coûteuses à charger :
 * c'est ce qui permet à la page de peindre immédiatement au lieu de rester
 * blanche le temps des ~20 requêtes des onglets.
 */
export interface BoatShowShellContext {
  positionHistory: BoatPositionHistory[]
  boatMedia: Media[]
  /**
   * Port de l'organisation dont le nom correspond exactement au `home_port`
   * saisi en texte libre (#579), ou `null`. Sert uniquement à proposer le lien
   * vers la fiche port : aucune FK n'est posée, la colonne texte reste la
   * source de vérité.
   */
  homePortId: number | null
  canManageMaintenance: boolean
  canManageEquipment: boolean
  canManageDocuments: boolean
  canExport: boolean
  pricing: BoatPricingRow | null
  pricingEnabled: boolean
  canManagePricing: boolean
  canManageEquipmentActions: boolean
  canDeleteEquipmentActions: boolean
  canDeleteIncidents: boolean
  canCreateFuelLogs: boolean
  canDeleteFuelLogs: boolean
  canCreateNavigationLogs: boolean
  canUpdateNavigationLogs: boolean
  canDeleteNavigationLogs: boolean
  /**
   * Valeur brute du `?tab=` de l'URL. Résolue côté serveur pour que le SSR rende
   * directement le bon onglet : sans elle, le rendu serveur retombait sur Aperçu
   * et l'onglet demandé n'apparaissait qu'à l'hydratation (flash — #463).
   */
  initialTab: string | null
  /**
   * Rapport de conformité Division 240 (#582), calculé sur l'inventaire déjà
   * chargé. `zone: null` (bateau sans zone d'armement déclarée) = aucun
   * contrôle : le panneau se contente alors d'inviter à renseigner la zone.
   */
  safetyCompliance: SafetyComplianceReport
}

export function toBoatOwnerSummary(boat: Boat): BoatOwnerBoatSummary {
  return {
    id: boat.id,
    name: boat.name,
    registrationNumber: boat.registrationNumber,
    type: boat.type,
    manufacturer: boat.manufacturer,
    model: boat.model,
    lengthM: boat.lengthM,
    homePort: boat.homePort,
  }
}

export function toEditForm(boat: Boat) {
  return {
    id: boat.id,
    name: boat.name,
    registrationNumber: boat.registrationNumber,
    category: boat.category as BoatCategory | null,
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
    armamentZone: boat.armamentZone,
    hullIdentificationNumber: boat.hullIdentificationNumber,
    francisationNumber: boat.francisationNumber,
    flagCountry: boat.flagCountry,
    maxPersons: boat.maxPersons,
    mmsi: boat.mmsi,
    imoNumber: boat.imoNumber,
    spotId: boat.spotId ?? null,
  }
}

export function toShowShellProps(boat: Boat, ctx: BoatShowShellContext) {
  const positionHistory = ctx.positionHistory.map(toPositionHistoryEntry)
  const latestGpsPosition =
    positionHistory.find((p) => p.latitude !== null && p.endedAt === null) ??
    positionHistory.find((p) => p.latitude !== null) ??
    null

  return {
    boat: toBoatDetail(boat, ctx),
    canManageMaintenance: ctx.canManageMaintenance,
    canManageEquipment: ctx.canManageEquipment,
    canManageDocuments: ctx.canManageDocuments,
    canExport: ctx.canExport,
    pricing: ctx.pricing,
    pricingEnabled: ctx.pricingEnabled,
    canManagePricing: ctx.canManagePricing,
    canManageEquipmentActions: ctx.canManageEquipmentActions,
    canDeleteEquipmentActions: ctx.canDeleteEquipmentActions,
    positionHistory,
    latestGpsPosition,
    canDeleteIncidents: ctx.canDeleteIncidents,
    canCreateFuelLogs: ctx.canCreateFuelLogs,
    canDeleteFuelLogs: ctx.canDeleteFuelLogs,
    canCreateNavigationLogs: ctx.canCreateNavigationLogs,
    canUpdateNavigationLogs: ctx.canUpdateNavigationLogs,
    canDeleteNavigationLogs: ctx.canDeleteNavigationLogs,
    homePortId: ctx.homePortId,
    initialTab: ctx.initialTab,
    safetyCompliance: ctx.safetyCompliance,
  }
}

export function toMaintenanceEventRows(events: BoatMaintenanceEvent[]) {
  return events.map(toMaintenanceEvent)
}

export function toMaintenanceTaskRows(tasks: BoatMaintenanceTask[]) {
  return tasks.map(toMaintenanceTask)
}

export function toMaintenanceSheetRows(sheets: BoatMaintenanceSheet[]) {
  return sheets.map(toMaintenanceSheet)
}

export function toEquipmentActionRows(actions: BoatEquipmentAction[]) {
  return actions.map(toBoatEquipmentActionRow)
}

export function toIncidentRows(incidents: BoatIncident[]) {
  return incidents.map(toIncident)
}

export function toFuelLogRows(logs: BoatFuelLog[]): FuelLogRow[] {
  return logs.map(toFuelLog)
}

export function toNavigationLogRows(logs: NavigationLog[]): NavigationLogRow[] {
  return logs.map(toNavigationLog)
}

export function toNavigationLogEntryRows(entries: NavigationLogEntry[]): NavigationLogEntryRow[] {
  return entries.map((entry) => ({
    id: entry.id,
    navigationLogId: entry.navigationLogId,
    recordedAt: entry.recordedAt.toISO()!,
    latitude: entry.latitude !== null ? Number.parseFloat(entry.latitude) : null,
    longitude: entry.longitude !== null ? Number.parseFloat(entry.longitude) : null,
    gpsAccuracyM: entry.gpsAccuracyM !== null ? Number.parseFloat(entry.gpsAccuracyM) : null,
    cogDeg: entry.cogDeg,
    sogKn: entry.sogKn !== null ? Number.parseFloat(entry.sogKn) : null,
    sailConfig: entry.sailConfig,
    note: entry.note,
    twdDeg: entry.twdDeg,
    twaDeg: entry.twaDeg,
    createdAt: entry.createdAt.toISO()!,
    updatedAt: (entry.updatedAt ?? entry.createdAt).toISO()!,
  }))
}

export function toNavigationLog(log: NavigationLog): NavigationLogRow {
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
    updatedAt: (log.updatedAt ?? log.createdAt).toISO()!,
    crew: (log.$preloaded.crew ? log.crew : []).map((m) => ({
      crewMemberId: m.id,
      fullName: m.fullName,
      role: m.$extras.pivot_role,
    })),
    entriesCount: Number(log.$extras?.entries_count ?? 0),
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
    // La colonne est un texte contraint côté base : le schéma généré ne peut
    // pas la typer plus finement que `string`.
    fuelType: log.fuelType as EngineFuel | null,
    supplier: log.supplier,
    notes: log.notes,
    createdAt: log.createdAt.toISO()!,
  }
}

function toBoatDetail(
  boat: Boat,
  ctx: Pick<BoatShowShellContext, 'positionHistory' | 'boatMedia'>
) {
  return {
    id: boat.id,
    name: boat.name,
    registrationNumber: boat.registrationNumber,
    category: boat.category as BoatCategory | null,
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
    armamentZone: boat.armamentZone,
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
    genericEquipment: boat.genericEquipment.map(toGenericEquipmentItem),
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
    // Famille de motorisation (#574) — moteur et transmission.
    family: e.family,
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

function toGenericEquipmentItem(item: Boat['genericEquipment'][number]) {
  return {
    id: item.id,
    category: item.category,
    name: item.name,
    brand: item.brand,
    model: item.model,
    quantity: item.quantity,
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
      // le client renvoie cette valeur en `_expectedUpdatedAt` au rejeu hors-ligne (#490)
      updatedAt: item.updatedAt?.toISO() ?? null,
    })),
  }
}
