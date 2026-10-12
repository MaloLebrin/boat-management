import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// #968 — une visite Inertia restée sans réponse bascule en navigation pleine page.

const probe = vi.hoisted(() => vi.fn())
vi.mock('~/composables/use_connectivity', () => ({ probeConnectivity: probe }))

import {
  installOfflineNavigationFallback,
  offlineFallbackUrl,
  resetOfflineNavigationFallback,
} from '../../inertia/utils/offline_navigation'

const ORIGIN = 'http://localhost:3000'

function networkError(
  overrides: Record<string, unknown> = {},
  headers: Record<string, unknown> = {}
) {
  return {
    config: {
      method: 'get',
      url: `${ORIGIN}/boats/1/navigation`,
      params: {},
      headers: { 'X-Inertia': true, ...headers },
      ...overrides,
    },
  }
}

describe('offlineFallbackUrl', () => {
  test('visite GET sans réponse → URL de la page', () => {
    expect(offlineFallbackUrl(networkError(), ORIGIN)).toBe(`${ORIGIN}/boats/1/navigation`)
  })

  test('les paramètres GET sont reportés dans l’URL', () => {
    const error = networkError({ params: { tab: 'logs', page: 2, empty: undefined } })
    expect(offlineFallbackUrl(error, ORIGIN)).toBe(`${ORIGIN}/boats/1/navigation?tab=logs&page=2`)
  })

  test('URL relative résolue sur l’origine', () => {
    expect(offlineFallbackUrl(networkError({ url: '/planning' }), ORIGIN)).toBe(
      `${ORIGIN}/planning`
    )
  })

  test('en-têtes AxiosHeaders lus via get()', () => {
    const map: Record<string, unknown> = { 'X-Inertia': true }
    const error = networkError({ headers: { get: (name: string) => map[name] } })
    expect(offlineFallbackUrl(error, ORIGIN)).toBe(`${ORIGIN}/boats/1/navigation`)
  })

  test('une réponse HTTP (4xx/5xx) n’est pas une coupure', () => {
    expect(offlineFallbackUrl({ ...networkError(), response: { status: 500 } }, ORIGIN)).toBeNull()
  })

  test('mutation → laissée à la file hors-ligne', () => {
    expect(offlineFallbackUrl(networkError({ method: 'post' }), ORIGIN)).toBeNull()
  })

  test('préchargement ignoré', () => {
    expect(offlineFallbackUrl(networkError({}, { Purpose: 'prefetch' }), ORIGIN)).toBeNull()
  })

  test('rechargement partiel ignoré', () => {
    const error = networkError({}, { 'X-Inertia-Partial-Component': 'boats/show' })
    expect(offlineFallbackUrl(error, ORIGIN)).toBeNull()
  })

  test('requête hors Inertia ou autre origine ignorée', () => {
    expect(offlineFallbackUrl(networkError({ headers: {} }), ORIGIN)).toBeNull()
    expect(offlineFallbackUrl(networkError({ url: 'https://example.com/x' }), ORIGIN)).toBeNull()
  })

  test('exception sans config ou non-objet ignorée', () => {
    expect(offlineFallbackUrl(new Error('boom'), ORIGIN)).toBeNull()
    expect(offlineFallbackUrl(undefined, ORIGIN)).toBeNull()
  })
})

describe('installOfflineNavigationFallback', () => {
  type Handler = (event: { detail: { exception: unknown }; preventDefault: () => void }) => void
  let handler: Handler
  const router = { on: vi.fn((_name: string, cb: Handler) => (handler = cb)) }
  const assign = vi.fn()

  beforeEach(() => {
    resetOfflineNavigationFallback()
    router.on.mockClear()
    probe.mockReset()
    assign.mockReset()
    vi.stubGlobal('location', { origin: window.location.origin, assign })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function fire(exception: unknown) {
    const event = { detail: { exception }, preventDefault: vi.fn() }
    handler(event)
    return event
  }

  test('erreur réseau sur une visite : bascule, probe, rejet annulé', () => {
    installOfflineNavigationFallback(router as never)
    const event = fire(networkError({ url: '/boats/1' }))

    expect(event.preventDefault).toHaveBeenCalled()
    expect(probe).toHaveBeenCalledOnce()
    expect(assign).toHaveBeenCalledWith(`${window.location.origin}/boats/1`)
  })

  test('autre exception : comportement par défaut d’Inertia', () => {
    installOfflineNavigationFallback(router as never)
    const event = fire(networkError({ method: 'post' }))

    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(assign).not.toHaveBeenCalled()
  })

  test('une seule bascule, même si plusieurs visites échouent', () => {
    installOfflineNavigationFallback(router as never)
    fire(networkError({ url: '/boats/1' }))
    const second = fire(networkError({ url: '/boats/2' }))

    expect(second.preventDefault).toHaveBeenCalled()
    expect(assign).toHaveBeenCalledOnce()
  })

  test('installation idempotente', () => {
    installOfflineNavigationFallback(router as never)
    installOfflineNavigationFallback(router as never)
    expect(router.on).toHaveBeenCalledOnce()
  })
})
