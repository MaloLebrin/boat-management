import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import {
  toEditForm,
  toManageProps,
  toNavigationProps,
  type BoatManageContext,
  type BoatNavigationContext,
} from '#transformers/boat_transformer'
import type Boat from '#models/boat'
import type BoatPositionHistory from '#models/boat_position_history'
import type BoatEngine from '#models/boat_engine'
import type BoatSail from '#models/boat_sail'
import type BoatRig from '#models/boat_rig'
import type BoatSafetyEquipment from '#models/boat_safety_equipment'
import type BoatGenericEquipment from '#models/boat_generic_equipment'
import type BoatMaintenanceEvent from '#models/boat_maintenance_event'
import type BoatMaintenanceTask from '#models/boat_maintenance_task'
import type BoatMaintenanceSheet from '#models/boat_maintenance_sheet'
import type BoatFuelLog from '#models/boat_fuel_log'
import type BoatIncident from '#models/boat_incident'
import type NavigationLog from '#models/navigation_log'
import type Media from '#models/media'

// ---- helpers ----

function makeEngine(overrides: Partial<BoatEngine> = {}): BoatEngine {
  return {
    id: 1,
    kind: 'inboard',
    fuel: 'diesel',
    brand: 'Volvo',
    model: 'D2',
    serialNumber: 'SN1',
    manufacturedAt: DateTime.fromISO('2020-01-01'),
    powerHp: 40,
    hours: 100,
    status: 'active',
    ...overrides,
  } as unknown as BoatEngine
}

function makeSail(overrides: Partial<BoatSail> = {}): BoatSail {
  return {
    id: 1,
    sailType: 'mainsail',
    manufacturedAt: DateTime.fromISO('2021-06-01'),
    areaM2: 35,
    material: 'dacron',
    reefPoints: 2,
    status: 'good',
    ...overrides,
  } as unknown as BoatSail
}

function makeRig(overrides: Partial<BoatRig> = {}): BoatRig {
  return {
    id: 1,
    rigType: 'sloop',
    manufacturedAt: DateTime.fromISO('2019-03-01'),
    mastCount: 1,
    spreaders: 2,
    status: 'good',
    ...overrides,
  } as unknown as BoatRig
}

function makeSafetyItem(overrides: Partial<BoatSafetyEquipment> = {}): BoatSafetyEquipment {
  return {
    id: 1,
    equipmentType: 'life_jacket',
    quantity: 4,
    expiryDate: DateTime.fromISO('2027-01-01'),
    status: 'valid',
    notes: null,
    ...overrides,
  } as unknown as BoatSafetyEquipment
}

function makeGenericItem(overrides: Partial<BoatGenericEquipment> = {}): BoatGenericEquipment {
  return {
    id: 1,
    category: 'navigation',
    name: 'VHF Radio',
    brand: 'Standard Horizon',
    model: 'GX2200',
    quantity: 1,
    status: 'good',
    notes: null,
    ...overrides,
  } as unknown as BoatGenericEquipment
}

function makeBoat(overrides: Partial<Boat> = {}): Boat {
  return {
    id: 1,
    organizationId: 2,
    name: 'Liberté',
    registrationNumber: 'FR1234',
    type: 'voilier',
    propulsionType: 'sail',
    lengthM: 12,
    beamM: 4,
    draftM: 1.8,
    mastHeightM: 18,
    hullMaterial: 'fiberglass',
    yearBuilt: 2015,
    manufacturer: 'Beneteau',
    model: 'Oceanis 38',
    manufacturedAt: DateTime.fromISO('2015-06-01'),
    homePort: 'Nice',
    navigationCategory: 'C',
    hullIdentificationNumber: 'HIN123',
    francisationNumber: 'FRAN456',
    flagCountry: 'FR',
    maxPersons: 8,
    mmsi: '227001234',
    imoNumber: null,
    spotId: 10,
    createdAt: DateTime.fromISO('2026-07-04T10:00:00.000Z'),
    updatedAt: DateTime.fromISO('2026-07-04T12:00:00.000Z'),
    engines: [],
    sails: [],
    rig: null,
    safetyEquipment: [],
    genericEquipment: [],
    spot: null,
    ...overrides,
  } as unknown as Boat
}

function makePositionHistory(overrides: Partial<BoatPositionHistory> = {}): BoatPositionHistory {
  return {
    id: 1,
    boatId: 1,
    spotId: null,
    spot: null,
    latitude: 43.7,
    longitude: 7.25,
    source: 'manual' as const,
    startedAt: DateTime.fromISO('2026-07-01T10:00:00.000Z'),
    endedAt: null,
    ...overrides,
  } as unknown as BoatPositionHistory
}

function makeMedia(overrides: Partial<Media> = {}): Media {
  return {
    id: 1,
    kind: 'photo',
    secureUrl: 'https://cdn.example.com/photo.jpg',
    originalFilename: 'photo.jpg',
    format: 'jpg',
    bytes: 102400,
    width: 1920,
    height: 1080,
    position: 0,
    caption: null,
    ...overrides,
  } as unknown as Media
}

function makeMaintenanceEvent(overrides: Partial<BoatMaintenanceEvent> = {}): BoatMaintenanceEvent {
  return {
    id: 1,
    subject: 'engine',
    title: 'Oil change',
    notes: null,
    performedAt: DateTime.fromISO('2026-06-01'),
    engineCaption: null,
    sailCaption: null,
    boatEngineId: 1,
    boatSailId: null,
    boatRigId: null,
    parts: [],
    ...overrides,
  } as unknown as BoatMaintenanceEvent
}

function makeMaintenanceTask(overrides: Partial<BoatMaintenanceTask> = {}): BoatMaintenanceTask {
  return {
    id: 1,
    subject: 'engine',
    title: 'Next oil change',
    notes: null,
    status: 'open',
    dueAt: DateTime.fromISO('2026-12-01'),
    dueEngineHours: null,
    boatEngineId: null,
    boatSailId: null,
    boatRigId: null,
    recurrenceIntervalMonths: 12,
    recurrenceIntervalEngineHours: null,
    ...overrides,
  } as unknown as BoatMaintenanceTask
}

function makeMaintenanceSheet(overrides: Partial<BoatMaintenanceSheet> = {}): BoatMaintenanceSheet {
  return {
    id: 1,
    type: 'entretien',
    title: 'Yearly check',
    status: 'completed',
    performedAt: DateTime.fromISO('2026-06-01'),
    notes: null,
    items: [],
    ...overrides,
  } as unknown as BoatMaintenanceSheet
}

function makeFuelLog(overrides: Partial<BoatFuelLog> = {}): BoatFuelLog {
  return {
    id: 1,
    boatId: 1,
    boatEngineId: null,
    fueledAt: DateTime.fromISO('2026-07-01'),
    quantityLiters: '50.0',
    pricePerLiter: '1.85',
    totalCost: '92.50',
    engineHoursAtFueling: '120.0',
    supplier: 'Shell',
    notes: null,
    createdAt: DateTime.fromISO('2026-07-01T10:00:00.000Z'),
    ...overrides,
  } as unknown as BoatFuelLog
}

function makeIncident(overrides: Partial<BoatIncident> = {}): BoatIncident {
  return {
    id: 1,
    boatId: 1,
    occurredAt: DateTime.fromISO('2026-06-15T09:00:00.000Z'),
    type: 'collision',
    location: 'Port Nice',
    description: 'Minor scratch',
    insuranceClaimed: false,
    insuranceClaimRef: null,
    status: 'open',
    closedAt: null,
    createdAt: DateTime.fromISO('2026-06-15T10:00:00.000Z'),
    ...overrides,
  } as unknown as BoatIncident
}

function makeNavigationLog(
  overrides: Partial<Omit<NavigationLog, '$preloaded' | 'crew'>> & {
    $preloaded?: unknown
    crew?: unknown
  } = {}
): NavigationLog {
  return {
    id: 1,
    boatId: 1,
    status: 'completed',
    departedAt: DateTime.fromISO('2026-07-01T08:00:00.000Z'),
    arrivedAt: DateTime.fromISO('2026-07-01T16:00:00.000Z'),
    departurePortId: 1,
    departurePortName: 'Nice',
    arrivalPortId: 2,
    arrivalPortName: 'Cannes',
    distanceNm: '20.5',
    engineHoursStart: '100.0',
    engineHoursEnd: '102.5',
    fuelConsumedLiters: '5.0',
    windForceBeaufort: 3,
    seaState: 'slight',
    crewCount: 2,
    notes: null,
    createdAt: DateTime.fromISO('2026-07-01T08:00:00.000Z'),
    updatedAt: null,
    $preloaded: { crew: false },
    crew: [],
    ...overrides,
  } as unknown as NavigationLog
}

function makeManageContext(overrides: Partial<BoatManageContext> = {}): BoatManageContext {
  return {
    positionHistory: [],
    boatMedia: [],
    maintenanceEvents: [],
    maintenanceTasks: [],
    maintenanceSheets: [],
    boatDocuments: [],
    aiSuggestions: null,
    canManageMaintenance: true,
    canManageEquipment: false,
    canManageDocuments: true,
    canExport: false,
    ...overrides,
  }
}

function makeNavigationContext(
  overrides: Partial<BoatNavigationContext> = {}
): BoatNavigationContext {
  return {
    positionHistory: [],
    boatMedia: [],
    incidents: [],
    fuelLogs: [],
    navigationLogs: [],
    portOptions: [],
    crewMemberOptions: [],
    canManageMaintenance: true,
    canDeleteIncidents: false,
    canCreateFuelLogs: true,
    canDeleteFuelLogs: false,
    canCreateNavigationLogs: true,
    canUpdateNavigationLogs: true,
    canDeleteNavigationLogs: false,
    ...overrides,
  }
}

// ---- toEditForm ----

test.group('toEditForm', () => {
  test('maps all fields on the happy path', ({ assert }) => {
    const boat = makeBoat()
    const result = toEditForm(boat)

    assert.equal(result.id, 1)
    assert.equal(result.name, 'Liberté')
    assert.equal(result.registrationNumber, 'FR1234')
    assert.equal(result.type, 'voilier')
    assert.equal(result.propulsionType, 'sail')
    assert.equal(result.lengthM, 12)
    assert.equal(result.beamM, 4)
    assert.equal(result.draftM, 1.8)
    assert.equal(result.mastHeightM, 18)
    assert.equal(result.hullMaterial, 'fiberglass')
    assert.equal(result.yearBuilt, 2015)
    assert.equal(result.manufacturer, 'Beneteau')
    assert.equal(result.model, 'Oceanis 38')
    assert.equal(result.manufacturedAt, '2015-06-01')
    assert.equal(result.homePort, 'Nice')
    assert.equal(result.navigationCategory, 'C')
    assert.equal(result.hullIdentificationNumber, 'HIN123')
    assert.equal(result.francisationNumber, 'FRAN456')
    assert.equal(result.flagCountry, 'FR')
    assert.equal(result.maxPersons, 8)
    assert.equal(result.mmsi, '227001234')
    assert.isNull(result.imoNumber)
    assert.equal(result.spotId, 10)
  })

  test('manufacturedAt null returns null', ({ assert }) => {
    const boat = makeBoat({ manufacturedAt: null })
    const result = toEditForm(boat)
    assert.isNull(result.manufacturedAt)
  })

  test('spotId undefined returns null', ({ assert }) => {
    const boat = makeBoat({ spotId: undefined as unknown as null })
    const result = toEditForm(boat)
    assert.isNull(result.spotId)
  })

  test('spotId null returns null', ({ assert }) => {
    const boat = makeBoat({ spotId: null })
    const result = toEditForm(boat)
    assert.isNull(result.spotId)
  })
})

// ---- toManageProps ----

test.group('toManageProps', () => {
  test('returns the expected top-level keys', ({ assert }) => {
    const boat = makeBoat()
    const ctx = makeManageContext()
    const result = toManageProps(boat, ctx)

    assert.property(result, 'boat')
    assert.property(result, 'maintenanceEvents')
    assert.property(result, 'maintenanceTasks')
    assert.property(result, 'maintenanceSheets')
    assert.property(result, 'boatDocuments')
    assert.property(result, 'canManageMaintenance')
    assert.property(result, 'canManageEquipment')
    assert.property(result, 'canManageDocuments')
    assert.property(result, 'canExport')
    assert.property(result, 'aiSuggestions')
  })

  test('empty arrays map to empty arrays', ({ assert }) => {
    const boat = makeBoat()
    const ctx = makeManageContext()
    const result = toManageProps(boat, ctx)

    assert.lengthOf(result.maintenanceEvents, 0)
    assert.lengthOf(result.maintenanceTasks, 0)
    assert.lengthOf(result.maintenanceSheets, 0)
  })

  test('canManageMaintenance is passed through', ({ assert }) => {
    const boat = makeBoat()
    const ctx = makeManageContext({ canManageMaintenance: false })
    const result = toManageProps(boat, ctx)
    assert.isFalse(result.canManageMaintenance)
  })

  test('aiSuggestions null stays null', ({ assert }) => {
    const boat = makeBoat()
    const ctx = makeManageContext({ aiSuggestions: null })
    const result = toManageProps(boat, ctx)
    assert.isNull(result.aiSuggestions)
  })

  test('boat.spot null maps to null in boat detail', ({ assert }) => {
    const boat = makeBoat({ spot: null as unknown as Boat['spot'] })
    const ctx = makeManageContext()
    const result = toManageProps(boat, ctx)
    assert.isNull(result.boat.spot)
  })

  test('boat.rig null maps to null in boat detail', ({ assert }) => {
    const boat = makeBoat({ rig: null as unknown as Boat['rig'] })
    const ctx = makeManageContext()
    const result = toManageProps(boat, ctx)
    assert.isNull(result.boat.rig)
  })

  test('engines are mapped with correct keys', ({ assert }) => {
    const engine = makeEngine()
    const boat = makeBoat({ engines: [engine] as unknown as Boat['engines'] })
    const ctx = makeManageContext()
    const result = toManageProps(boat, ctx)

    assert.lengthOf(result.boat.engines, 1)
    assert.equal(result.boat.engines[0]!.id, 1)
    assert.equal(result.boat.engines[0]!.kind, 'inboard')
    assert.equal(result.boat.engines[0]!.manufacturedAt, '2020-01-01')
  })

  test('engine with null manufacturedAt maps to null', ({ assert }) => {
    const engine = makeEngine({ manufacturedAt: null })
    const boat = makeBoat({ engines: [engine] as unknown as Boat['engines'] })
    const ctx = makeManageContext()
    const result = toManageProps(boat, ctx)
    assert.isNull(result.boat.engines[0]!.manufacturedAt)
  })

  test('sails are mapped with correct keys', ({ assert }) => {
    const sail = makeSail()
    const boat = makeBoat({ sails: [sail] as unknown as Boat['sails'] })
    const ctx = makeManageContext()
    const result = toManageProps(boat, ctx)

    assert.lengthOf(result.boat.sails, 1)
    assert.equal(result.boat.sails[0]!.id, 1)
    assert.equal(result.boat.sails[0]!.sailType, 'mainsail')
  })

  test('rig present maps rigType', ({ assert }) => {
    const rig = makeRig()
    const boat = makeBoat({ rig: rig as unknown as Boat['rig'] })
    const ctx = makeManageContext()
    const result = toManageProps(boat, ctx)

    assert.isNotNull(result.boat.rig)
    assert.equal(result.boat.rig!.rigType, 'sloop')
    assert.equal(result.boat.rig!.manufacturedAt, '2019-03-01')
  })

  test('rig with null manufacturedAt maps to null', ({ assert }) => {
    const rig = makeRig({ manufacturedAt: null })
    const boat = makeBoat({ rig: rig as unknown as Boat['rig'] })
    const ctx = makeManageContext()
    const result = toManageProps(boat, ctx)
    assert.isNull(result.boat.rig!.manufacturedAt)
  })

  test('safetyEquipment is mapped correctly', ({ assert }) => {
    const item = makeSafetyItem()
    const boat = makeBoat({ safetyEquipment: [item] as unknown as Boat['safetyEquipment'] })
    const ctx = makeManageContext()
    const result = toManageProps(boat, ctx)

    assert.lengthOf(result.boat.safetyEquipment, 1)
    assert.equal(result.boat.safetyEquipment[0]!.id, 1)
    assert.equal(result.boat.safetyEquipment[0]!.equipmentType, 'life_jacket')
    assert.equal(result.boat.safetyEquipment[0]!.expiryDate, '2027-01-01')
  })

  test('safetyEquipment expiryDate null maps to null', ({ assert }) => {
    const item = makeSafetyItem({ expiryDate: null })
    const boat = makeBoat({ safetyEquipment: [item] as unknown as Boat['safetyEquipment'] })
    const ctx = makeManageContext()
    const result = toManageProps(boat, ctx)
    assert.isNull(result.boat.safetyEquipment[0]!.expiryDate)
  })

  test('genericEquipment is mapped correctly', ({ assert }) => {
    const item = makeGenericItem()
    const boat = makeBoat({ genericEquipment: [item] as unknown as Boat['genericEquipment'] })
    const ctx = makeManageContext()
    const result = toManageProps(boat, ctx)

    assert.lengthOf(result.boat.genericEquipment, 1)
    assert.equal(result.boat.genericEquipment[0]!.name, 'VHF Radio')
  })

  test('maintenance events are mapped', ({ assert }) => {
    const event = makeMaintenanceEvent()
    const ctx = makeManageContext({
      maintenanceEvents: [event] as unknown as BoatManageContext['maintenanceEvents'],
    })
    const result = toManageProps(makeBoat(), ctx)

    assert.lengthOf(result.maintenanceEvents, 1)
    assert.equal(result.maintenanceEvents[0]!.id, 1)
    assert.equal(result.maintenanceEvents[0]!.title, 'Oil change')
    assert.equal(result.maintenanceEvents[0]!.performedAt, '2026-06-01')
  })

  test('maintenance tasks are mapped', ({ assert }) => {
    const task = makeMaintenanceTask()
    const ctx = makeManageContext({
      maintenanceTasks: [task] as unknown as BoatManageContext['maintenanceTasks'],
    })
    const result = toManageProps(makeBoat(), ctx)

    assert.lengthOf(result.maintenanceTasks, 1)
    assert.equal(result.maintenanceTasks[0]!.dueAt, '2026-12-01')
  })

  test('maintenance sheets are mapped', ({ assert }) => {
    const sheet = makeMaintenanceSheet()
    const ctx = makeManageContext({
      maintenanceSheets: [sheet] as unknown as BoatManageContext['maintenanceSheets'],
    })
    const result = toManageProps(makeBoat(), ctx)

    assert.lengthOf(result.maintenanceSheets, 1)
    assert.equal(result.maintenanceSheets[0]!.type, 'entretien')
  })

  test('media from context is included in boat.media', ({ assert }) => {
    const media = makeMedia()
    const ctx = makeManageContext({ boatMedia: [media] as unknown as Media[] })
    const result = toManageProps(makeBoat(), ctx)

    assert.lengthOf(result.boat.media, 1)
    assert.equal(result.boat.media[0]!.id, 1)
  })
})

// ---- toNavigationProps ----

test.group('toNavigationProps', () => {
  test('returns the expected top-level keys', ({ assert }) => {
    const boat = makeBoat()
    const ctx = makeNavigationContext()
    const result = toNavigationProps(boat, ctx)

    assert.property(result, 'boat')
    assert.property(result, 'incidents')
    assert.property(result, 'fuelLogs')
    assert.property(result, 'navigationLogs')
    assert.property(result, 'portOptions')
    assert.property(result, 'crewMemberOptions')
    assert.property(result, 'positionHistory')
    assert.property(result, 'latestGpsPosition')
  })

  test('latestGpsPosition is null when positionHistory is empty', ({ assert }) => {
    const boat = makeBoat()
    const ctx = makeNavigationContext({ positionHistory: [] })
    const result = toNavigationProps(boat, ctx)
    assert.isNull(result.latestGpsPosition)
  })

  test('latestGpsPosition prefers entry with latitude and endedAt null', ({ assert }) => {
    const active = makePositionHistory({
      id: 2,
      latitude: 43.7,
      endedAt: null,
    })
    const closed = makePositionHistory({
      id: 1,
      latitude: 43.5,
      endedAt: DateTime.fromISO('2026-06-30'),
    })
    const ctx = makeNavigationContext({
      positionHistory: [closed, active] as unknown as BoatPositionHistory[],
    })
    const result = toNavigationProps(makeBoat(), ctx)
    assert.isNotNull(result.latestGpsPosition)
    assert.equal(result.latestGpsPosition!.id, 2)
  })

  test('latestGpsPosition falls back to first with latitude when none has endedAt null', ({
    assert,
  }) => {
    const old1 = makePositionHistory({
      id: 1,
      latitude: 43.5,
      endedAt: DateTime.fromISO('2026-06-01'),
    })
    const old2 = makePositionHistory({
      id: 2,
      latitude: 43.6,
      endedAt: DateTime.fromISO('2026-06-15'),
    })
    const ctx = makeNavigationContext({
      positionHistory: [old1, old2] as unknown as BoatPositionHistory[],
    })
    const result = toNavigationProps(makeBoat(), ctx)
    assert.isNotNull(result.latestGpsPosition)
    assert.equal(result.latestGpsPosition!.id, 1)
  })

  test('latestGpsPosition is null when all entries have null latitude', ({ assert }) => {
    const noLat = makePositionHistory({ latitude: null })
    const ctx = makeNavigationContext({
      positionHistory: [noLat] as unknown as BoatPositionHistory[],
    })
    const result = toNavigationProps(makeBoat(), ctx)
    assert.isNull(result.latestGpsPosition)
  })

  test('fuelLogs numeric-string fields are parsed as floats', ({ assert }) => {
    const fuelLog = makeFuelLog()
    const ctx = makeNavigationContext({
      fuelLogs: [fuelLog] as unknown as BoatFuelLog[],
    })
    const result = toNavigationProps(makeBoat(), ctx)

    assert.lengthOf(result.fuelLogs, 1)
    assert.equal(result.fuelLogs[0]!.quantityLiters, 50)
    assert.equal(result.fuelLogs[0]!.pricePerLiter, 1.85)
    assert.equal(result.fuelLogs[0]!.totalCost, 92.5)
    assert.equal(result.fuelLogs[0]!.engineHoursAtFueling, 120)
  })

  test('fuelLogs nullable fields map to null when null', ({ assert }) => {
    const fuelLog = makeFuelLog({
      pricePerLiter: null,
      totalCost: null,
      engineHoursAtFueling: null,
    })
    const ctx = makeNavigationContext({
      fuelLogs: [fuelLog] as unknown as BoatFuelLog[],
    })
    const result = toNavigationProps(makeBoat(), ctx)
    assert.isNull(result.fuelLogs[0]!.pricePerLiter)
    assert.isNull(result.fuelLogs[0]!.totalCost)
    assert.isNull(result.fuelLogs[0]!.engineHoursAtFueling)
  })

  test('navigationLog with preloaded crew false maps crew to empty array', ({ assert }) => {
    const log = makeNavigationLog({ $preloaded: { crew: false }, crew: [] })
    const ctx = makeNavigationContext({
      navigationLogs: [log] as unknown as NavigationLog[],
    })
    const result = toNavigationProps(makeBoat(), ctx)

    assert.lengthOf(result.navigationLogs, 1)
    assert.lengthOf(result.navigationLogs[0]!.crew, 0)
  })

  test('navigationLog crew empty when $preloaded.crew is false', ({ assert }) => {
    const log = makeNavigationLog({
      $preloaded: { crew: false },
      crew: [{ id: 1, fullName: 'Bob' } as unknown as NavigationLog['crew'][number]],
    })
    const ctx = makeNavigationContext({
      navigationLogs: [log] as unknown as NavigationLog[],
    })
    const result = toNavigationProps(makeBoat(), ctx)
    assert.lengthOf(result.navigationLogs[0]!.crew, 0)
  })

  test('navigationLog crew populated when $preloaded.crew is true', ({ assert }) => {
    const crewMember = {
      id: 5,
      fullName: 'Bob Skipper',
      $extras: { pivot_role: 'skipper' },
    } as unknown as NavigationLog['crew'][number]

    const log = makeNavigationLog({
      $preloaded: { crew: true },
      crew: [crewMember],
    })
    const ctx = makeNavigationContext({
      navigationLogs: [log] as unknown as NavigationLog[],
    })
    const result = toNavigationProps(makeBoat(), ctx)

    assert.lengthOf(result.navigationLogs[0]!.crew, 1)
    assert.equal(result.navigationLogs[0]!.crew[0]!.crewMemberId, 5)
    assert.equal(result.navigationLogs[0]!.crew[0]!.fullName, 'Bob Skipper')
    assert.equal(result.navigationLogs[0]!.crew[0]!.role, 'skipper')
  })

  test('navigationLog nullable numeric-string fields map to null', ({ assert }) => {
    const log = makeNavigationLog({
      distanceNm: null,
      engineHoursStart: null,
      engineHoursEnd: null,
      fuelConsumedLiters: null,
      arrivedAt: null,
    })
    const ctx = makeNavigationContext({
      navigationLogs: [log] as unknown as NavigationLog[],
    })
    const result = toNavigationProps(makeBoat(), ctx)

    assert.isNull(result.navigationLogs[0]!.distanceNm)
    assert.isNull(result.navigationLogs[0]!.engineHoursStart)
    assert.isNull(result.navigationLogs[0]!.engineHoursEnd)
    assert.isNull(result.navigationLogs[0]!.fuelConsumedLiters)
    assert.isNull(result.navigationLogs[0]!.arrivedAt)
  })

  test('navigationLog numeric strings are parsed as floats', ({ assert }) => {
    const log = makeNavigationLog({
      distanceNm: '20.5',
      engineHoursStart: '100.0',
      engineHoursEnd: '102.5',
      fuelConsumedLiters: '5.0',
    })
    const ctx = makeNavigationContext({
      navigationLogs: [log] as unknown as NavigationLog[],
    })
    const result = toNavigationProps(makeBoat(), ctx)

    assert.equal(result.navigationLogs[0]!.distanceNm, 20.5)
    assert.equal(result.navigationLogs[0]!.engineHoursStart, 100)
    assert.equal(result.navigationLogs[0]!.engineHoursEnd, 102.5)
    assert.equal(result.navigationLogs[0]!.fuelConsumedLiters, 5)
  })

  test('incidents are mapped correctly', ({ assert }) => {
    const incident = makeIncident()
    const ctx = makeNavigationContext({
      incidents: [incident] as unknown as BoatIncident[],
    })
    const result = toNavigationProps(makeBoat(), ctx)

    assert.lengthOf(result.incidents, 1)
    assert.equal(result.incidents[0]!.id, 1)
    assert.equal(result.incidents[0]!.type, 'collision')
    assert.isNull(result.incidents[0]!.closedAt)
  })

  test('incident closedAt present returns ISO string', ({ assert }) => {
    const incident = makeIncident({ closedAt: DateTime.fromISO('2026-07-01T00:00:00.000Z') })
    const ctx = makeNavigationContext({
      incidents: [incident] as unknown as BoatIncident[],
    })
    const result = toNavigationProps(makeBoat(), ctx)
    assert.isString(result.incidents[0]!.closedAt)
  })

  test('positionHistory entries have latitude/longitude as numbers', ({ assert }) => {
    const pos = makePositionHistory({ latitude: 43.7, longitude: 7.25 })
    const ctx = makeNavigationContext({
      positionHistory: [pos] as unknown as BoatPositionHistory[],
    })
    const result = toNavigationProps(makeBoat(), ctx)

    assert.equal(result.positionHistory[0]!.latitude, 43.7)
    assert.equal(result.positionHistory[0]!.longitude, 7.25)
  })

  test('positionHistory latitude null maps to null', ({ assert }) => {
    const pos = makePositionHistory({ latitude: null, longitude: null })
    const ctx = makeNavigationContext({
      positionHistory: [pos] as unknown as BoatPositionHistory[],
    })
    const result = toNavigationProps(makeBoat(), ctx)
    assert.isNull(result.positionHistory[0]!.latitude)
    assert.isNull(result.positionHistory[0]!.longitude)
  })

  test('positionHistory endedAt null maps to null', ({ assert }) => {
    const pos = makePositionHistory({ endedAt: null })
    const ctx = makeNavigationContext({
      positionHistory: [pos] as unknown as BoatPositionHistory[],
    })
    const result = toNavigationProps(makeBoat(), ctx)
    assert.isNull(result.positionHistory[0]!.endedAt)
  })
})
