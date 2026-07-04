import { describe, expect, test } from 'vitest'
import { toNavigationEngineOptions } from '../../inertia/utils/navigation_engine_options'

function engine(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    brand: 'Yanmar',
    model: '4JH',
    status: 'operational',
    ...overrides,
  } as any
}

describe('toNavigationEngineOptions', () => {
  test('keeps active engines and builds a brand/model label', () => {
    const options = toNavigationEngineOptions([
      engine({ id: 1, brand: 'Yanmar', model: '4JH' }),
      engine({ id: 2, brand: 'Volvo', model: 'D2', status: 'in_maintenance' }),
    ])

    expect(options).toEqual([
      { id: 1, label: 'Yanmar 4JH' },
      { id: 2, label: 'Volvo D2' },
    ])
  })

  test('excludes out-of-service and retired engines', () => {
    const options = toNavigationEngineOptions([
      engine({ id: 1, status: 'operational' }),
      engine({ id: 2, status: 'out_of_service' }),
      engine({ id: 3, status: 'retired' }),
    ])

    expect(options.map((o) => o.id)).toEqual([1])
  })

  test('falls back to #id when brand and model are empty', () => {
    const options = toNavigationEngineOptions([engine({ id: 9, brand: null, model: null })])

    expect(options).toEqual([{ id: 9, label: '#9' }])
  })
})
