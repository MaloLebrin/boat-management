import { describe, expect, test } from 'vitest'
import {
  engineFuelLabel,
  engineKindLabel,
  maintenanceSubjectLabel,
  rigTypeLabel,
  sailTypeLabel,
} from '../../inertia/utils/boat_enum_labels'

const t = (key: string) => `translated:${key}`

describe('engineKindLabel', () => {
  test('translates a known engine kind', () => {
    expect(engineKindLabel(t, 'outboard')).toBe('translated:boats.options.engineKind.outboard')
  })

  test('returns null for a null or undefined value', () => {
    expect(engineKindLabel(t, null)).toBeNull()
    expect(engineKindLabel(t, undefined)).toBeNull()
  })

  test('falls back to the raw value for an unknown engine kind', () => {
    expect(engineKindLabel(t, 'legacy-value')).toBe('legacy-value')
  })
})

describe('engineFuelLabel', () => {
  test('translates a known fuel type', () => {
    expect(engineFuelLabel(t, 'essence')).toBe('translated:boats.options.engineFuel.essence')
  })

  test('falls back to the raw value for an unknown fuel type', () => {
    expect(engineFuelLabel(t, 'legacy-value')).toBe('legacy-value')
  })
})

describe('sailTypeLabel', () => {
  test('translates a known sail type', () => {
    expect(sailTypeLabel(t, 'genoa')).toBe('translated:boats.options.sailType.genoa')
  })

  test('falls back to the raw value for an unknown sail type', () => {
    expect(sailTypeLabel(t, 'legacy-value')).toBe('legacy-value')
  })
})

describe('rigTypeLabel', () => {
  test('translates a known rig type', () => {
    expect(rigTypeLabel(t, 'sloop')).toBe('translated:boats.options.rigType.sloop')
  })

  test('falls back to the raw value for an unknown rig type', () => {
    expect(rigTypeLabel(t, 'legacy-value')).toBe('legacy-value')
  })
})

describe('maintenanceSubjectLabel', () => {
  test('translates a known maintenance subject', () => {
    expect(maintenanceSubjectLabel(t, 'engine')).toBe(
      'translated:maintenance.history.subjects.engine'
    )
  })

  test('falls back to the raw value for an unknown subject', () => {
    expect(maintenanceSubjectLabel(t, 'legacy-value')).toBe('legacy-value')
  })
})
