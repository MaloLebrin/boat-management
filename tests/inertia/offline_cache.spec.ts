import { describe, expect, test } from 'vitest'
import {
  inertiaDataCacheKey,
  isCacheableInertiaData,
  isWarmPageMessage,
  OFFLINE_CACHE_MAX_AGE_SECONDS,
  TERRAIN_PATH,
  WARM_PAGE_MESSAGE,
} from '../../inertia/lib/offline_cache'

// #967 — clé de cache des props différées, partagée par le SW et le pré-chargement.

const partial = { component: 'boats/show', data: 'fuelLogs,incidents', except: null }

describe('inertiaDataCacheKey', () => {
  test('ne coïncide jamais avec l’URL de la page', () => {
    const key = inertiaDataCacheKey('http://app.test/boats/1', partial)
    expect(key).not.toBe('http://app.test/boats/1')
    expect(new URL(key).pathname).toBe('/boats/1')
  })

  test('l’ordre des props demandées ne change pas la clé', () => {
    const reversed = { ...partial, data: 'incidents, fuelLogs' }
    expect(inertiaDataCacheKey('http://app.test/boats/1', reversed)).toBe(
      inertiaDataCacheKey('http://app.test/boats/1', partial)
    )
  })

  test('l’onglet est ignoré, les autres paramètres conservés', () => {
    const base = inertiaDataCacheKey('http://app.test/boats/1', partial)
    expect(inertiaDataCacheKey('http://app.test/boats/1?tab=fuel#x', partial)).toBe(base)
    expect(inertiaDataCacheKey('http://app.test/planning?week=12', partial)).toContain('week=12')
  })

  test('groupes, composants et exclusions distincts → clés distinctes', () => {
    const url = 'http://app.test/boats/1'
    const keys = new Set([
      inertiaDataCacheKey(url, partial),
      inertiaDataCacheKey(url, { ...partial, data: 'navigationLogs' }),
      inertiaDataCacheKey(url, { ...partial, component: 'boats/edit' }),
      inertiaDataCacheKey(url, { ...partial, except: 'incidents' }),
    ])
    expect(keys.size).toBe(4)
  })
})

describe('constantes et messages', () => {
  test('rétention de 35 jours et pages terrain', () => {
    expect(OFFLINE_CACHE_MAX_AGE_SECONDS).toBe(35 * 24 * 3600)
    expect(TERRAIN_PATH.test('/boats/1')).toBe(true)
    expect(TERRAIN_PATH.test('/planning')).toBe(true)
    expect(TERRAIN_PATH.test('/settings')).toBe(false)
    // #981 — l'index du diagnostic de panne ; la page marketing reste hors cache.
    expect(TERRAIN_PATH.test('/diagnostic')).toBe(true)
    expect(TERRAIN_PATH.test('/diagnostic-panne-ia')).toBe(false)
  })

  test('isWarmPageMessage', () => {
    expect(isWarmPageMessage({ type: WARM_PAGE_MESSAGE, url: '/boats/1' })).toBe(true)
    expect(isWarmPageMessage({ type: WARM_PAGE_MESSAGE })).toBe(false)
    expect(isWarmPageMessage({ type: 'push:navigate', url: '/x' })).toBe(false)
    expect(isWarmPageMessage(null)).toBe(false)
  })
})

describe('isCacheableInertiaData', () => {
  const inertia = (status = 200) => new Response('{}', { status, headers: { 'X-Inertia': 'true' } })

  test('réponse Inertia 200 → mise en cache', () => {
    expect(isCacheableInertiaData(inertia())).toBe(true)
  })

  test('redirigée (session expirée), en erreur ou non Inertia → refusée', () => {
    const redirected = inertia()
    Object.defineProperty(redirected, 'redirected', { value: true })
    expect(isCacheableInertiaData(redirected)).toBe(false)
    expect(isCacheableInertiaData(inertia(409))).toBe(false)
    expect(isCacheableInertiaData(new Response('<html>', { status: 200 }))).toBe(false)
  })
})
