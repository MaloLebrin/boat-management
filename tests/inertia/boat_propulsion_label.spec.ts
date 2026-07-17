import { describe, expect, test } from 'vitest'
import { propulsionLabel } from '../../inertia/utils/boat_propulsion_label'

describe('propulsionLabel', () => {
  const t = (key: string) => `translated:${key}`

  test('translates a known propulsion type', () => {
    expect(propulsionLabel(t, 'sailboat')).toBe('translated:boats.options.propulsion.sailboat')
  })

  test('returns null for a null or undefined value', () => {
    expect(propulsionLabel(t, null)).toBeNull()
    expect(propulsionLabel(t, undefined)).toBeNull()
  })

  test('falls back to the raw value for an unknown propulsion type', () => {
    expect(propulsionLabel(t, 'legacy-value')).toBe('legacy-value')
  })
})
