import { describe, expect, test } from 'vitest'
import { toNavigationEngineOptions } from '../../inertia/utils/navigation_engine_options'

const t = (key: string) => `translated:${key}`

function engine(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    brand: 'Yanmar',
    model: '4JH',
    serialNumber: null,
    status: 'operational',
    ...overrides,
  } as any
}

describe('toNavigationEngineOptions', () => {
  test('keeps active engines and builds a brand/model label', () => {
    const options = toNavigationEngineOptions(t, [
      engine({ id: 1, brand: 'Yanmar', model: '4JH' }),
      engine({ id: 2, brand: 'Volvo', model: 'D2', status: 'in_maintenance' }),
    ])

    expect(options).toEqual([
      { id: 1, label: 'Yanmar 4JH' },
      { id: 2, label: 'Volvo D2' },
    ])
  })

  test('excludes out-of-service and retired engines', () => {
    const options = toNavigationEngineOptions(t, [
      engine({ id: 1, status: 'operational' }),
      engine({ id: 2, status: 'out_of_service' }),
      engine({ id: 3, status: 'retired' }),
    ])

    expect(options.map((o) => o.id)).toEqual([1])
  })

  test('falls back to #id when brand and model are empty', () => {
    const options = toNavigationEngineOptions(t, [engine({ id: 9, brand: null, model: null })])

    expect(options).toEqual([{ id: 9, label: '#9' }])
  })

  test('appends the serial number to the label when the engine has one (#601)', () => {
    const options = toNavigationEngineOptions(t, [
      engine({ id: 1, brand: 'Yanmar', model: '4JH', serialNumber: 'SN-42' }),
    ])

    expect(options).toEqual([{ id: 1, label: 'Yanmar 4JH · translated:boats.engines.sn SN-42' }])
  })

  test('appends the engine cycle between the name and the serial number', () => {
    const options = toNavigationEngineOptions(t, [
      engine({ id: 1, strokeType: '2_stroke', serialNumber: 'SN-42' }),
      engine({ id: 2, brand: null, model: null, kind: 'inboard', fuel: 'diesel' }),
    ])

    expect(options).toEqual([
      {
        id: 1,
        label:
          'Yanmar 4JH · translated:boats.options.strokeTypeShort.2_stroke · translated:boats.engines.sn SN-42',
      },
      { id: 2, label: '#2 · translated:boats.options.strokeTypeShort.4_stroke' },
    ])
  })

  test('omits the cycle when it cannot be inferred', () => {
    const options = toNavigationEngineOptions(t, [
      engine({ id: 1, kind: 'outboard', fuel: 'essence' }),
    ])

    expect(options).toEqual([{ id: 1, label: 'Yanmar 4JH' }])
  })
})
