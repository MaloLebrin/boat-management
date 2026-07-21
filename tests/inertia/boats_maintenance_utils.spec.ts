import { describe, expect, test } from 'vitest'
import {
  performedDisplay,
  subjectLabel,
  targetDescription,
} from '../../inertia/components/boats/maintenance/utils'
import type { MaintenanceEventRow } from '../../inertia/types/boat_show'

const t = (key: string) => `translated:${key}`

function makeEvent(overrides: Partial<MaintenanceEventRow>): MaintenanceEventRow {
  return {
    id: 1,
    subject: 'boat',
    title: 'Event',
    notes: null,
    performedAt: '2026-01-01',
    engineCaption: null,
    sailCaption: null,
    boatEngineId: null,
    boatSailId: null,
    boatRigId: null,
    parts: [],
    ...overrides,
  }
}

describe('subjectLabel', () => {
  test('translates a known subject', () => {
    expect(subjectLabel(t, 'engine')).toBe('translated:maintenance.history.subjects.engine')
  })

  test('falls back to the raw value for an unknown subject', () => {
    expect(subjectLabel(t, 'legacy-value')).toBe('legacy-value')
  })
})

describe('targetDescription', () => {
  test('returns the engine caption for an engine event', () => {
    const ev = makeEvent({ subject: 'engine', engineCaption: 'Yamaha 8HP' })
    expect(targetDescription(ev)).toBe('Yamaha 8HP')
  })

  test('returns the sail caption for a sail event', () => {
    const ev = makeEvent({ subject: 'sail', sailCaption: 'Genoa · 25 m²' })
    expect(targetDescription(ev)).toBe('Genoa · 25 m²')
  })

  test('returns null for subjects without a specific caption (no redundant "· label")', () => {
    expect(targetDescription(makeEvent({ subject: 'boat' }))).toBeNull()
    expect(targetDescription(makeEvent({ subject: 'rig' }))).toBeNull()
    expect(targetDescription(makeEvent({ subject: 'other' }))).toBeNull()
  })
})

describe('performedDisplay', () => {
  test('returns an em dash for an empty value', () => {
    expect(performedDisplay('')).toBe('—')
  })

  test('truncates an ISO datetime to its date part', () => {
    expect(performedDisplay('2026-03-05T10:00:00.000Z')).toBe('2026-03-05')
  })
})
