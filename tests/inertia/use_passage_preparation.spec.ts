import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// #967 — « Préparer la traversée » : documents via le SW, props différées via
// des visites Inertia que le SW range dans `inertia-data`.

const storage = vi.hoisted(() => ({
  requestPersistentStorage: vi.fn(),
  refreshStorageEstimate: vi.fn(),
}))
vi.mock('~/composables/use_persistent_storage', () => storage)
vi.mock('@inertiajs/vue3', () => ({ usePage: () => ({ version: 'v1', props: {} }) }))

import {
  readCachedAt,
  usePassagePreparation,
  WARM_TIMEOUT_MS,
  warmDeferredProps,
} from '../../inertia/composables/use_passage_preparation'
import { WARM_PAGE_MESSAGE } from '../../inertia/lib/offline_cache'
import { passagePages } from '../../inertia/lib/passage_preparation'

const originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')

function setController(controller: Partial<ServiceWorker> | null) {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { controller },
    configurable: true,
  })
}

/** SW qui répond `ok` à chaque message, sauf pour les URLs listées. */
function fakeServiceWorker(failing: string[] = []) {
  const postMessage = vi.fn((message: { url: string }, ports: MessagePort[]) => {
    ports[0]!.postMessage({ url: message.url, ok: !failing.includes(message.url) })
  })
  setController({ postMessage } as unknown as ServiceWorker)
  return postMessage
}

function inertiaResponse(body: unknown, init: { redirected?: boolean; status?: number } = {}) {
  const response = new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'X-Inertia': 'true', 'Content-Type': 'application/json' },
  })
  if (init.redirected) Object.defineProperty(response, 'redirected', { value: true })
  return response
}

const fetchMock = vi.fn()

function headersOf(call: unknown[]): Record<string, string> {
  return (call[1] as RequestInit).headers as Record<string, string>
}

beforeEach(() => {
  storage.requestPersistentStorage.mockReset().mockResolvedValue(true)
  storage.refreshStorageEstimate.mockReset().mockResolvedValue(null)
  fetchMock.mockReset().mockImplementation(async (_url: string, init: RequestInit) => {
    const headers = init.headers as Record<string, string>
    if (headers['X-Inertia-Partial-Data']) return inertiaResponse({ component: 'boats/show' })
    return inertiaResponse({
      component: 'boats/show',
      deferredProps: { default: ['fuelLogs', 'incidents'], crew: ['crewMemberOptions'] },
    })
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  if (originalServiceWorker)
    Object.defineProperty(navigator, 'serviceWorker', originalServiceWorker)
  else Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true })
})

describe('warmDeferredProps', () => {
  test('une visite Inertia puis un rechargement partiel par groupe différé', async () => {
    await expect(warmDeferredProps('/boats/1', 'v1')).resolves.toBe(true)

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(headersOf(fetchMock.mock.calls[0]!)).toMatchObject({
      'X-Inertia': 'true',
      'X-Inertia-Version': 'v1',
    })
    expect(headersOf(fetchMock.mock.calls[0]!)['X-Inertia-Partial-Data']).toBeUndefined()
    expect(headersOf(fetchMock.mock.calls[1]!)).toMatchObject({
      'X-Inertia-Partial-Component': 'boats/show',
      'X-Inertia-Partial-Data': 'fuelLogs,incidents',
    })
    expect(headersOf(fetchMock.mock.calls[2]!)['X-Inertia-Partial-Data']).toBe('crewMemberOptions')
  })

  test('page sans props différées : une seule requête', async () => {
    fetchMock.mockResolvedValueOnce(inertiaResponse({ component: 'planning/index' }))
    await expect(warmDeferredProps('/planning', null)).resolves.toBe(true)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(headersOf(fetchMock.mock.calls[0]!)['X-Inertia-Version']).toBeUndefined()
  })

  test('session expirée (redirection vers /login) → échec', async () => {
    fetchMock.mockResolvedValueOnce(
      inertiaResponse({ component: 'auth/login' }, { redirected: true })
    )
    await expect(warmDeferredProps('/boats/1', 'v1')).resolves.toBe(false)
  })

  test('conflit de version (409) ou réponse non Inertia → échec', async () => {
    fetchMock.mockResolvedValueOnce(inertiaResponse({}, { status: 409 }))
    await expect(warmDeferredProps('/boats/1', 'v0')).resolves.toBe(false)
    fetchMock.mockResolvedValueOnce(new Response('<html></html>', { status: 200 }))
    await expect(warmDeferredProps('/boats/1', 'v1')).resolves.toBe(false)
  })

  test('un groupe en échec ou une coupure → échec, sans lever', async () => {
    fetchMock
      .mockResolvedValueOnce(
        inertiaResponse({ component: 'boats/show', deferredProps: { default: ['fuelLogs'] } })
      )
      .mockResolvedValueOnce(inertiaResponse({}, { status: 500 }))
    await expect(warmDeferredProps('/boats/1', 'v1')).resolves.toBe(false)
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(warmDeferredProps('/boats/1', 'v1')).resolves.toBe(false)
  })
})

describe('readCachedAt', () => {
  test('date de la copie lue dans inertia-pages', async () => {
    const match = vi
      .fn()
      .mockResolvedValue(new Response('', { headers: { Date: 'Mon, 12 Oct 2026 10:00:00 GMT' } }))
    const open = vi.fn().mockResolvedValue({ match })
    vi.stubGlobal('caches', { open })

    const date = await readCachedAt('/boats/1?tab=fuel')
    expect(date?.toISOString()).toBe('2026-10-12T10:00:00.000Z')
    expect(open).toHaveBeenCalledWith('inertia-pages')
    expect(match).toHaveBeenCalledWith(`${window.location.origin}/boats/1?tab=fuel`, {
      ignoreVary: true,
    })
  })

  test('absente, sans en-tête Date, ou API indisponible', async () => {
    const match = vi.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce(new Response(''))
    vi.stubGlobal('caches', { open: vi.fn().mockResolvedValue({ match }) })
    await expect(readCachedAt('/boats/1')).resolves.toBeNull()
    await expect(readCachedAt('/boats/1')).resolves.toEqual(new Date(0))

    vi.stubGlobal('caches', undefined)
    await expect(readCachedAt('/boats/1')).resolves.toBeNull()
  })
})

describe('usePassagePreparation', () => {
  beforeEach(() => {
    vi.stubGlobal('caches', {
      open: vi.fn().mockResolvedValue({ match: vi.fn().mockResolvedValue(undefined) }),
    })
  })

  test('chaque document est demandé au SW, les props différées une fois par URL', async () => {
    const postMessage = fakeServiceWorker()
    const { pages, prepare, isPreparing } = usePassagePreparation(() => 4)

    const run = prepare()
    expect(isPreparing.value).toBe(true)
    await run

    expect(storage.requestPersistentStorage).toHaveBeenCalledOnce()
    expect(postMessage.mock.calls.map(([message]) => message)).toEqual(
      pages.value.map((page) => ({ type: WARM_PAGE_MESSAGE, url: page.url }))
    )
    // Fiche (3 requêtes : visite + 2 groupes) partagée par les onglets, planning (3).
    const visited = fetchMock.mock.calls
      .filter((call) => !headersOf(call)['X-Inertia-Partial-Data'])
      .map(([url]) => url)
    expect(visited).toEqual(['/boats/4', '/planning'])
    expect(pages.value.every((page) => page.status === 'done')).toBe(true)
    expect(isPreparing.value).toBe(false)
    expect(storage.refreshStorageEstimate).toHaveBeenCalled()
  })

  test('un document refusé par le SW marque sa page en échec', async () => {
    fakeServiceWorker(['/boats/4?tab=fuel'])
    const { pages, prepare } = usePassagePreparation(() => 4)
    await prepare()

    const statuses = Object.fromEntries(pages.value.map((page) => [page.key, page.status]))
    expect(statuses.fuel).toBe('failed')
    expect(statuses.boat).toBe('done')
  })

  test('props différées en échec : toutes les pages qui les partagent échouent', async () => {
    fakeServiceWorker()
    fetchMock.mockImplementation(async () => inertiaResponse({}, { status: 500 }))
    const { pages, prepare } = usePassagePreparation(() => 4)
    await prepare()
    expect(pages.value.every((page) => page.status === 'failed')).toBe(true)
  })

  test('sans service worker : rien n’est demandé, tout échoue', async () => {
    setController(null)
    const { pages, prepare, serviceWorkerReady } = usePassagePreparation(() => 4)
    expect(serviceWorkerReady.value).toBe(false)
    await prepare()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(pages.value.every((page) => page.status === 'failed')).toBe(true)
  })

  test('un SW qui ne répond pas expire au bout du délai', async () => {
    vi.useFakeTimers()
    setController({ postMessage: vi.fn() } as unknown as ServiceWorker)
    const { pages, prepare } = usePassagePreparation(() => 4)
    const run = prepare()
    for (let i = 0; i < pages.value.length; i++) {
      await vi.advanceTimersByTimeAsync(WARM_TIMEOUT_MS)
    }
    await run
    expect(pages.value.every((page) => page.status === 'failed')).toBe(true)
  })

  // #981 — une ligne de diagnostic porte la checklist et les fiches du moteur.
  const outboard2t = { id: 9, kind: 'outboard', fuel: 'essence', strokeType: '2_stroke' }

  test('les fiches d’un moteur sont pré-chargées sous sa ligne de diagnostic', async () => {
    const postMessage = fakeServiceWorker()
    const { pages, prepare } = usePassagePreparation(
      () => 4,
      () => [outboard2t]
    )
    await prepare()

    const row = pages.value.find((page) => page.key === 'diagnostic')!
    const warmed = postMessage.mock.calls.map(([message]) => message.url)
    expect(warmed).toContain('/diagnostic')
    expect(warmed).toEqual(expect.arrayContaining([row.url, ...row.extraUrls!]))
    expect(row.status).toBe('done')
  })

  test('une fiche refusée fait échouer la ligne de son moteur', async () => {
    const [, sheet] = passagePages(4, [outboard2t]).at(-1)!.extraUrls!
    fakeServiceWorker([sheet!])
    const { pages, prepare } = usePassagePreparation(
      () => 4,
      () => [outboard2t]
    )
    await prepare()

    expect(pages.value.find((page) => page.key === 'diagnostic')!.status).toBe('failed')
    expect(pages.value.find((page) => page.key === 'diagnosticIndex')!.status).toBe('done')
  })

  test('la date d’une ligne est celle de sa plus vieille copie, nulle si une fiche manque', async () => {
    fakeServiceWorker()
    const { pages, refreshCachedDates } = usePassagePreparation(
      () => 4,
      () => [outboard2t]
    )
    const row = pages.value.find((page) => page.key === 'diagnostic')!
    const oldest = 'Sun, 11 Oct 2026 08:00:00 GMT'
    const match = vi.fn(async (url: string) => {
      const path = new URL(url).pathname
      if (path === row.extraUrls![0]) return new Response('', { headers: { Date: oldest } })
      return new Response('', { headers: { Date: 'Mon, 12 Oct 2026 10:00:00 GMT' } })
    })
    vi.stubGlobal('caches', { open: vi.fn().mockResolvedValue({ match }) })

    await refreshCachedDates()
    expect(row.cachedAt?.toUTCString()).toBe(oldest)

    match.mockImplementation(async (url: string) =>
      new URL(url).pathname === row.extraUrls![2]
        ? undefined
        : new Response('', { headers: { Date: oldest } })
    )
    await refreshCachedDates()
    expect(pages.value.find((page) => page.key === 'diagnostic')!.cachedAt).toBeNull()
  })

  test('une préparation en cours ignore un second clic', async () => {
    fakeServiceWorker()
    const { prepare } = usePassagePreparation(() => 4)
    await Promise.all([prepare(), prepare()])
    expect(storage.requestPersistentStorage).toHaveBeenCalledOnce()
  })
})
