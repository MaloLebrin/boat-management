import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { defineComponent, h, reactive } from 'vue'
import type { InstrumentSourceRow } from '../../shared/types/instruments'

const { reload } = vi.hoisted(() => ({ reload: vi.fn() }))
vi.mock('@inertiajs/vue3', () => ({ router: { reload } }))

import {
  readSetupStorage,
  useInstrumentSetup,
} from '../../inertia/composables/use_instrument_setup'

const NOW = Date.parse('2026-10-25T12:00:00Z')

const sourceRow = (over: Partial<InstrumentSourceRow> = {}): InstrumentSourceRow => ({
  id: 1,
  boatId: 7,
  kind: 'signalk',
  baseUrl: 'http://openplotter.local:3000',
  vesselContext: 'vessels.self',
  enabled: true,
  hasToken: false,
  hasIngestToken: false,
  ingestTokenIssuedAt: null,
  lastSeenAt: null,
  lastError: null,
  ...over,
})

const engine = (id: number, instrumentKey: string | null) => ({ id, instrumentKey }) as never

interface Scenario {
  source: InstrumentSourceRow | null
  engines: never[]
  latestPaths: string[]
  probed: string[]
  streamOpen: boolean
}

function harness(initial: Partial<Scenario> = {}) {
  const state = reactive<Scenario>({
    source: null,
    engines: [],
    latestPaths: [],
    probed: [],
    streamOpen: false,
    ...initial,
  })
  let api!: ReturnType<typeof useInstrumentSetup>
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useInstrumentSetup({
          boatId: () => 7,
          source: () => state.source,
          engines: () => state.engines,
          latestPaths: () => state.latestPaths,
          probedEngineIds: () => state.probed,
          streamOpen: () => state.streamOpen,
        })
        return () => h('div')
      },
    })
  )
  return { state, api, wrapper }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  reload.mockClear()
  window.localStorage.clear()
})
afterEach(() => vi.useRealTimers())

describe('use_instrument_setup — dérivation (#1023)', () => {
  const recent = new Date(NOW - 60_000).toISOString()
  const stale = new Date(NOW - 3_600_000).toISOString()

  const cases: Array<[string, Partial<Scenario>, string, boolean]> = [
    ['aucune source', {}, 'hardware', false],
    ['source sans jeton, jamais vue', { source: sourceRow() }, 'connect', false],
    [
      'plugin : jeton posé, aucun lot',
      { source: sourceRow({ hasIngestToken: true }) },
      'connect',
      false,
    ],
    [
      'lot ancien : toujours en attente',
      { source: sourceRow({ lastSeenAt: stale }) },
      'connect',
      false,
    ],
    [
      'lot récent, moteur non relié',
      { source: sourceRow({ lastSeenAt: recent }), engines: [engine(1, null)] },
      'engines',
      false,
    ],
    ['flux ouvert, sans moteur', { source: sourceRow(), streamOpen: true }, 'done', true],
    [
      'lot récent, moteurs reliés',
      { source: sourceRow({ lastSeenAt: recent }), engines: [engine(1, 'port')] },
      'done',
      true,
    ],
    ['lot récent, bateau sans moteur', { source: sourceRow({ lastSeenAt: recent }) }, 'done', true],
  ]

  test.each(cases)('%s → %s', (_label, scenario, step, completed) => {
    const { api } = harness(scenario)
    expect(api.currentStep.value).toBe(step)
    expect(api.completed.value).toBe(completed)
  })

  test('sans source le flux ouvert ne compte pas comme connecté', () => {
    const { api } = harness({ streamOpen: true })
    expect(api.connected.value).toBe(false)
  })

  test('matériel puis chemin avancent les étapes ; le chemin se déduit d’un jeton existant', async () => {
    const { api } = harness()
    api.update({ hardware: 'cerbo' })
    expect(api.currentStep.value).toBe('path')
    api.update({ path: 'app' })
    expect(api.currentStep.value).toBe('connect')
    expect(api.path.value).toBe('app')

    window.localStorage.clear()
    const withToken = harness({ source: sourceRow({ hasIngestToken: true }) })
    expect(withToken.api.path.value).toBe('plugin')
  })

  test('une étape ouverte à la main prime jusqu’à ce que l’étape courante change', async () => {
    const { api, state } = harness()
    api.openStepManually('engines')
    expect(api.openStep.value).toBe('engines')
    state.source = sourceRow()
    await Promise.resolve()
    expect(api.openStep.value).toBe('connect')
  })

  test('moteurs détectés : derniers relevés et sonde, dédoublonnés et triés', () => {
    const { api } = harness({
      latestPaths: [
        'propulsion.starboard.revolutions',
        'propulsion.port.temperature',
        'navigation.position',
      ],
      probed: ['port', 'aux'],
    })
    expect(api.detectedEngineIds.value).toEqual(['aux', 'port', 'starboard'])
  })
})

describe('use_instrument_setup — localStorage', () => {
  test('persiste les choix par bateau et les relit au montage', () => {
    const first = harness()
    first.api.update({ hardware: 'signalk', path: 'plugin', dismissed: true })
    expect(JSON.parse(window.localStorage.getItem('fleetai:instrument-setup:7')!)).toEqual({
      hardware: 'signalk',
      path: 'plugin',
      dismissed: true,
      pendingTest: false,
    })
    first.wrapper.unmount()

    const second = harness()
    expect(second.api.stored.value).toMatchObject({
      hardware: 'signalk',
      path: 'plugin',
      dismissed: true,
    })
  })

  test('stockage absent, corrompu ou en écriture refusée : rendu correct sans', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readSetupStorage(7)).toEqual({
      hardware: null,
      path: null,
      dismissed: false,
      pendingTest: false,
    })
    get.mockReturnValue('{pas du json')
    get.mockImplementation(() => '{pas du json')
    expect(readSetupStorage(7).hardware).toBeNull()
    get.mockRestore()

    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    const { api } = harness()
    expect(() => api.update({ path: 'app' })).not.toThrow()
    expect(api.stored.value.path).toBe('app')
    set.mockRestore()
  })

  test('valeurs inconnues ignorées', () => {
    window.localStorage.setItem(
      'fleetai:instrument-setup:7',
      JSON.stringify({ hardware: 'boat', path: 'x', dismissed: 'yes', pendingTest: true })
    )
    expect(readSetupStorage(7)).toEqual({
      hardware: null,
      path: null,
      dismissed: false,
      pendingTest: true,
    })
  })
})

describe('use_instrument_setup — attente du premier lot', () => {
  test('recharge `instruments` toutes les 10 s et s’arrête au premier lot', async () => {
    const { api, state } = harness({ source: sourceRow({ hasIngestToken: true }) })
    api.startWaiting()
    expect(api.waiting.value).toBe(true)

    vi.advanceTimersByTime(10_000)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(reload).toHaveBeenCalledWith({ only: ['instruments'] })
    vi.advanceTimersByTime(10_000)
    expect(reload).toHaveBeenCalledTimes(2)

    state.source = sourceRow({
      hasIngestToken: true,
      lastSeenAt: new Date(Date.now() + 1000).toISOString(),
    })
    await Promise.resolve()
    expect(api.waiting.value).toBe(false)
    expect(api.firstBatchAt.value).not.toBeNull()
    vi.advanceTimersByTime(60_000)
    expect(reload).toHaveBeenCalledTimes(2)
  })

  test('un lot antérieur à l’ouverture ne compte pas', async () => {
    const { api, state } = harness({ source: sourceRow({ hasIngestToken: true }) })
    api.startWaiting()
    state.source = sourceRow({
      hasIngestToken: true,
      lastSeenAt: new Date(NOW - 5000).toISOString(),
    })
    await Promise.resolve()
    expect(api.waiting.value).toBe(true)
  })

  test('expire après 10 minutes : « Toujours rien ? », plus de rechargement', () => {
    const { api } = harness({ source: sourceRow({ hasIngestToken: true }) })
    api.startWaiting()
    vi.advanceTimersByTime(10 * 60_000)
    expect(api.waiting.value).toBe(false)
    expect(api.timedOut.value).toBe(true)
    const calls = reload.mock.calls.length
    vi.advanceTimersByTime(60_000)
    expect(reload).toHaveBeenCalledTimes(calls)

    api.startWaiting()
    expect(api.timedOut.value).toBe(false)
    expect(api.waiting.value).toBe(true)
  })

  test('démonté, le minuteur est arrêté', () => {
    const { api, wrapper } = harness({ source: sourceRow({ hasIngestToken: true }) })
    api.startWaiting()
    wrapper.unmount()
    vi.advanceTimersByTime(30_000)
    expect(reload).not.toHaveBeenCalled()
  })
})
