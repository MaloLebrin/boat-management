import { mount } from '@vue/test-utils'
import { IDBFactory } from 'fake-indexeddb'
import { defineComponent, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const { enqueue, pendingActions } = vi.hoisted(() => ({
  enqueue: vi.fn(),
  pendingActions: { value: [] as Array<{ type: string }> },
}))
vi.mock('~/composables/use_offline_queue', () => ({
  useOfflineQueue: () => ({ enqueue, pendingActions }),
}))
vi.mock('@inertiajs/vue3', () => ({ router: { post: vi.fn() }, usePage: vi.fn() }))

import { router } from '@inertiajs/vue3'
import {
  MAX_PENDING_TELEMETRY_BATCHES,
  useTelemetrySync,
} from '../../inertia/composables/use_telemetry_sync'
import { loadWindow } from '../../inertia/lib/signalk/instrument_store'

const T0 = Date.parse('2026-10-19T10:00:00.000Z')
const sample = (path: string, value: number) => ({
  path,
  value,
  valueJson: null,
  signalkTimestamp: null,
})

let clock = T0
const mounted: Array<{ unmount(): void }> = []
function mountSync(sourceId: number | null = 7) {
  let result!: ReturnType<typeof useTelemetrySync>
  const source = ref(sourceId)
  const wrapper = mount(
    defineComponent({
      setup() {
        result = useTelemetrySync({
          boatId: () => 3,
          sourceId: () => source.value,
          now: () => clock,
        })
        return {}
      },
      template: '<div />',
    })
  )
  mounted.push(wrapper)
  return { sync: result, wrapper }
}

function setOnline(online: boolean) {
  Object.defineProperty(navigator, 'onLine', { value: online, configurable: true })
}

function routerSucceeds() {
  vi.mocked(router.post).mockImplementation(((_url: string, _data: unknown, options: any) => {
    options.onSuccess?.()
    options.onFinish?.()
  }) as never)
}

describe('useTelemetrySync (#989)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    global.indexedDB = new IDBFactory()
    clock = T0
    pendingActions.value = []
    enqueue.mockResolvedValue(true)
    setOnline(true)
  })

  afterEach(() => {
    // Démonter arrête les timers et écouteurs de chaque instance.
    vi.mocked(router.post).mockReset()
    for (const wrapper of mounted.splice(0)) wrapper.unmount()
  })

  test('en ligne : router.post du lot, rechargement partiel de la seule prop instruments', async () => {
    routerSucceeds()
    const { sync } = mountSync()
    await sync.start()
    sync.push([
      sample('propulsion.port.revolutions', 40),
      sample('propulsion.port.revolutions', 50),
    ])

    clock = T0 + 61_000
    await sync.flush()

    expect(router.post).toHaveBeenCalledTimes(1)
    const [url, payload, options] = vi.mocked(router.post).mock.calls[0] as any
    expect(url).toBe('/boats/3/telemetry')
    expect(payload.sourceId).toBe(7)
    expect(payload.batchId).toEqual(expect.any(String))
    expect(payload.samples).toEqual([
      { path: 'propulsion.port.revolutions', recordedAt: '2026-10-19T10:00:00.000Z', value: 45 },
    ])
    expect(options).toMatchObject({
      only: ['instruments'],
      preserveState: true,
      preserveScroll: true,
    })
    expect(enqueue).not.toHaveBeenCalled()
  })

  test('rien à envoyer : aucune visite', async () => {
    const { sync } = mountSync()
    await sync.start()
    await sync.flush()
    expect(router.post).not.toHaveBeenCalled()
  })

  test('hors-ligne : enfilé en silence avec le type ingest-telemetry', async () => {
    setOnline(false)
    const { sync } = mountSync()
    await sync.start()
    sync.push([sample('environment.depth.belowKeel', 4)])

    await sync.flush({ force: true })

    expect(router.post).not.toHaveBeenCalled()
    expect(enqueue).toHaveBeenCalledTimes(1)
    expect(enqueue.mock.calls[0][0]).toMatchObject({
      type: 'ingest-telemetry',
      url: '/boats/3/telemetry',
      method: 'post',
      silent: true,
    })
    // Pas de dedupeKey : il remplacerait le payload et perdrait des échantillons.
    expect(enqueue.mock.calls[0][0]).not.toHaveProperty('dedupeKey')
  })

  test('hors-ligne : un lot par demi-heure, pas toutes les minutes', async () => {
    setOnline(false)
    const { sync } = mountSync()
    await sync.start()

    sync.push([sample('environment.depth.belowKeel', 4)], T0)
    clock = T0 + 6 * 60_000
    await sync.flush()
    expect(enqueue).toHaveBeenCalledTimes(1)

    sync.push([sample('environment.depth.belowKeel', 5)], clock)
    clock += 6 * 60_000
    await sync.flush()
    expect(enqueue).toHaveBeenCalledTimes(1)

    clock += 30 * 60_000
    await sync.flush()
    expect(enqueue).toHaveBeenCalledTimes(2)
  })

  test('échec transitoire en ligne (ni succès ni erreur) : le lot est enfilé', async () => {
    vi.mocked(router.post).mockImplementation(((_u: string, _d: unknown, options: any) => {
      options.onFinish?.()
    }) as never)
    const { sync } = mountSync()
    await sync.start()
    sync.push([sample('environment.depth.belowKeel', 4)])

    await sync.flush({ force: true })

    expect(enqueue).toHaveBeenCalledTimes(1)
    expect(enqueue.mock.calls[0][0].silent).toBe(true)
  })

  test('refus ou erreur de validation : le lot n’est pas renvoyé', async () => {
    vi.mocked(router.post).mockImplementation(((_u: string, _d: unknown, options: any) => {
      options.onError?.({})
      options.onFinish?.()
    }) as never)
    const { sync } = mountSync()
    await sync.start()
    sync.push([sample('environment.depth.belowKeel', 4)])

    await sync.flush({ force: true })

    expect(enqueue).not.toHaveBeenCalled()
  })

  test('plus de 500 échantillons : plusieurs lots', async () => {
    routerSucceeds()
    const { sync } = mountSync()
    await sync.start()
    const many = Array.from({ length: 501 }, (_, i) => sample(`tanks.fuel.${i}.currentLevel`, 0.5))
    sync.push(many)

    await sync.flush({ force: true })

    const sizes = vi.mocked(router.post).mock.calls.map((call: any) => call[1].samples.length)
    expect(sizes).toEqual([500, 1])
  })

  test('plafond de la file atteint : le lot est gardé en mémoire, pas enfilé', async () => {
    setOnline(false)
    pendingActions.value = Array.from({ length: MAX_PENDING_TELEMETRY_BATCHES }, () => ({
      type: 'ingest-telemetry',
    }))
    const { sync } = mountSync()
    await sync.start()
    sync.push([sample('environment.depth.belowKeel', 4)])

    await sync.flush({ force: true })
    expect(enqueue).not.toHaveBeenCalled()

    // Retour du réseau : le lot gardé repart.
    routerSucceeds()
    setOnline(true)
    await sync.flush({ force: true })
    expect(router.post).toHaveBeenCalledTimes(1)
  })

  test('la fenêtre en cours survit à un rechargement (IndexedDB)', async () => {
    const first = mountSync()
    await first.sync.start()
    first.sync.push([sample('propulsion.port.revolutions', 40)])
    await first.sync.flush()
    const saved = await loadWindow(7)
    expect(saved?.snapshot.open).toHaveLength(1)
    // Un rechargement ne démonte rien proprement : on laisse l'instance telle quelle.

    routerSucceeds()
    const second = mountSync()
    await second.sync.start()
    second.sync.push([sample('propulsion.port.revolutions', 50)], T0 + 10_000)
    clock = T0 + 61_000
    await second.sync.flush()

    const payload = (vi.mocked(router.post).mock.calls.at(-1) as any)[1]
    expect(payload.samples[0].value).toBe(45)
  })

  test('sans source : rien n’est envoyé', async () => {
    const { sync } = mountSync(null)
    await sync.start()
    sync.push([sample('environment.depth.belowKeel', 4)])
    await sync.flush({ force: true })
    expect(router.post).not.toHaveBeenCalled()
    expect(enqueue).not.toHaveBeenCalled()
  })
})
