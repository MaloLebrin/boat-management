import { describe, expect, test } from 'vitest'
import {
  documentStatusVariant,
  engineStatusVariant,
  equipmentStatusVariant,
  incidentStatusVariant,
  maintenanceVariant,
  safetyStatusVariant,
  wearStateVariant,
} from '../../inertia/utils/status_variants'

/** Chaque valeur d'énumération → sa variante, plus le repli sur une valeur inconnue. */
describe('status variants', () => {
  test('equipmentStatusVariant covers every mechanical equipment status', () => {
    expect(equipmentStatusVariant('operational')).toBe('success')
    expect(equipmentStatusVariant('in_maintenance')).toBe('info')
    expect(equipmentStatusVariant('out_of_service')).toBe('warning')
    expect(equipmentStatusVariant('retired')).toBe('neutral')
    expect(equipmentStatusVariant('')).toBe('neutral')
  })

  test('engineStatusVariant is the historical alias of equipmentStatusVariant', () => {
    expect(engineStatusVariant).toBe(equipmentStatusVariant)
  })

  test('safetyStatusVariant covers ok, to_check and treats anything else as a fault', () => {
    expect(safetyStatusVariant('ok')).toBe('success')
    expect(safetyStatusVariant('to_check')).toBe('warning')
    expect(safetyStatusVariant('expired')).toBe('danger')
    expect(safetyStatusVariant('')).toBe('danger')
  })

  test('wearStateVariant covers every wear state', () => {
    expect(wearStateVariant('new')).toBe('success')
    expect(wearStateVariant('good')).toBe('info')
    expect(wearStateVariant('worn')).toBe('warning')
    expect(wearStateVariant('to_replace')).toBe('danger')
    expect(wearStateVariant('unknown')).toBe('neutral')
  })

  test('maintenanceVariant flags urgent tasks first, then upcoming ones', () => {
    expect(maintenanceVariant({ urgentCount: 1, upcomingCount: 0 })).toBe('warning')
    expect(maintenanceVariant({ urgentCount: 2, upcomingCount: 5 })).toBe('warning')
    expect(maintenanceVariant({ urgentCount: 0, upcomingCount: 3 })).toBe('info')
    expect(maintenanceVariant({ urgentCount: 0, upcomingCount: 0 })).toBe('neutral')
  })

  test('incidentStatusVariant covers open, in_progress and closed', () => {
    expect(incidentStatusVariant('open')).toBe('danger')
    expect(incidentStatusVariant('in_progress')).toBe('warning')
    expect(incidentStatusVariant('closed')).toBe('neutral')
    expect(incidentStatusVariant('')).toBe('neutral')
  })

  test('documentStatusVariant covers valid, expiring_soon and expired', () => {
    expect(documentStatusVariant('valid')).toBe('success')
    expect(documentStatusVariant('expiring_soon')).toBe('warning')
    expect(documentStatusVariant('expired')).toBe('danger')
    expect(documentStatusVariant('')).toBe('neutral')
  })
})
