import { describe, expect, test } from 'vitest'
import {
  extractBatteryKey,
  extractTankKey,
  findBatteryName,
  findTankName,
  resolveGaugeInstanceLabel,
} from '../../shared/helpers/instrument_gauge_label'
import type { BoatBatteryRow, BoatTankRow } from '../../shared/types/boat'

const batteries: BoatBatteryRow[] = [
  {
    id: 1,
    name: 'Servitude',
    chemistry: 'lithium',
    capacityAh: 200,
    nominalVoltage: 12,
    lowVoltageV: 11.5,
    position: 0,
    instrumentKey: 'house',
  },
  {
    id: 2,
    name: 'Demarrage',
    chemistry: 'agm',
    capacityAh: 100,
    nominalVoltage: 12,
    lowVoltageV: null,
    position: 1,
    instrumentKey: 'start',
  },
]

const tanks: BoatTankRow[] = [
  {
    id: 1,
    name: 'Gasoil principal',
    type: 'fuel',
    capacityL: 150,
    lowLevelPct: 20,
    instrumentKey: 'fuel.0',
  },
  {
    id: 2,
    name: 'Eau douce',
    type: 'freshWater',
    capacityL: 200,
    lowLevelPct: 15,
    instrumentKey: 'freshWater.0',
  },
]

describe('extractBatteryKey', () => {
  test('extracts key from battery voltage path', () => {
    expect(extractBatteryKey('electrical.batteries.house.voltage')).toBe('house')
    expect(extractBatteryKey('electrical.batteries.start.current')).toBe('start')
    expect(extractBatteryKey('electrical.batteries.0.capacity.stateOfCharge')).toBe('0')
  })

  test('returns null for non-battery paths', () => {
    expect(extractBatteryKey('tanks.fuel.0.currentLevel')).toBeNull()
    expect(extractBatteryKey('propulsion.port.runTime')).toBeNull()
    expect(extractBatteryKey('navigation.position')).toBeNull()
  })
})

describe('extractTankKey', () => {
  test('extracts key from tank path', () => {
    expect(extractTankKey('tanks.fuel.0.currentLevel')).toBe('fuel.0')
    expect(extractTankKey('tanks.freshWater.main.currentVolume')).toBe('freshWater.main')
    expect(extractTankKey('tanks.blackWater.1.capacity')).toBe('blackWater.1')
  })

  test('returns null for non-tank paths', () => {
    expect(extractTankKey('electrical.batteries.house.voltage')).toBeNull()
    expect(extractTankKey('propulsion.port.runTime')).toBeNull()
  })
})

describe('findBatteryName', () => {
  test('finds battery name by instrumentKey', () => {
    expect(findBatteryName(batteries, 'house')).toBe('Servitude')
    expect(findBatteryName(batteries, 'start')).toBe('Demarrage')
  })

  test('returns null for unknown key', () => {
    expect(findBatteryName(batteries, 'unknown')).toBeNull()
    expect(findBatteryName([], 'house')).toBeNull()
  })
})

describe('findTankName', () => {
  test('finds tank name by instrumentKey', () => {
    expect(findTankName(tanks, 'fuel.0')).toBe('Gasoil principal')
    expect(findTankName(tanks, 'freshWater.0')).toBe('Eau douce')
  })

  test('returns null for unknown key', () => {
    expect(findTankName(tanks, 'unknown.0')).toBeNull()
    expect(findTankName([], 'fuel.0')).toBeNull()
  })
})

describe('resolveGaugeInstanceLabel', () => {
  test('resolves battery path to FleetAi name', () => {
    expect(
      resolveGaugeInstanceLabel('electrical.batteries.house.voltage', 'house', batteries, tanks)
    ).toBe('Servitude')
    expect(
      resolveGaugeInstanceLabel('electrical.batteries.start.current', 'start', batteries, tanks)
    ).toBe('Demarrage')
  })

  test('resolves tank path to FleetAi name', () => {
    expect(
      resolveGaugeInstanceLabel('tanks.fuel.0.currentLevel', 'fuel · 0', batteries, tanks)
    ).toBe('Gasoil principal')
    expect(
      resolveGaugeInstanceLabel(
        'tanks.freshWater.0.currentLevel',
        'freshWater · 0',
        batteries,
        tanks
      )
    ).toBe('Eau douce')
  })

  test('returns raw instance for unmatched battery', () => {
    expect(
      resolveGaugeInstanceLabel('electrical.batteries.unknown.voltage', 'unknown', batteries, tanks)
    ).toBe('unknown')
  })

  test('returns raw instance for unmatched tank', () => {
    expect(resolveGaugeInstanceLabel('tanks.gas.0.currentLevel', 'gas · 0', batteries, tanks)).toBe(
      'gas · 0'
    )
  })

  test('returns raw instance for non-battery/tank paths', () => {
    expect(resolveGaugeInstanceLabel('propulsion.port.runTime', 'port', batteries, tanks)).toBe(
      'port'
    )
  })
})
