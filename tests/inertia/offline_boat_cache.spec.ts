import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  listCachedBoats,
  readOfflineBoatSnapshot,
  readPreparedBoat,
  rememberPreparedBoat,
} from '../../inertia/lib/offline_boat_cache'
import { DATA_CACHE, PAGES_CACHE, inertiaDataCacheKey } from '../../inertia/lib/offline_cache'

// #982 — relecture de la fiche bateau dans les caches du service worker.

const ORIGIN = 'http://localhost:3000'

function boatDocument(id: number, name: string, date: string, component = 'boats/show') {
  const page = {
    component,
    props: { boat: { id, name, engines: [{ id: 30 + id, status: 'operational', hours: 1200 }] } },
  }
  const encoded = JSON.stringify(page).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  return new Response(`<html><body><div id="app" data-page="${encoded}"></div></body></html>`, {
    headers: { 'Content-Type': 'text/html', 'Date': date },
  })
}

function deferred(props: Record<string, unknown>, date: string) {
  return new Response(JSON.stringify({ component: 'boats/show', props }), {
    headers: { 'Content-Type': 'application/json', 'Date': date },
  })
}

function dataKey(boatId: number, data: string[]) {
  return inertiaDataCacheKey(`${ORIGIN}/boats/${boatId}`, {
    component: 'boats/show',
    data: data.join(','),
    except: null,
  })
}

/** Faux `CacheStorage` : un dictionnaire URL → réponse par cache. */
function stubCaches(stores: Record<string, Record<string, Response>>) {
  vi.stubGlobal('caches', {
    open: vi.fn(async (name: string) => {
      const store = stores[name] ?? {}
      return {
        keys: async () => Object.keys(store).map((url) => new Request(url)),
        match: async (request: Request) => store[request.url],
      }
    }),
  })
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

describe('listCachedBoats', () => {
  test('liste les fiches en cache, une fois par bateau, triées par nom', async () => {
    stubCaches({
      [PAGES_CACHE]: {
        [`${ORIGIN}/boats/7`]: boatDocument(7, 'Ylang', 'Mon, 12 Oct 2026 08:00:00 GMT'),
        [`${ORIGIN}/boats/7?tab=fuel`]: boatDocument(7, 'Ylang', 'Mon, 12 Oct 2026 08:01:00 GMT'),
        [`${ORIGIN}/boats/9`]: boatDocument(9, 'Albatros', 'Mon, 12 Oct 2026 08:00:00 GMT'),
        [`${ORIGIN}/boats/9/engines/3/diagnostic`]: boatDocument(9, 'x', 'Mon, 12 Oct 2026', 'x'),
        [`${ORIGIN}/planning`]: boatDocument(1, 'Planning', 'Mon, 12 Oct 2026', 'planning'),
      },
    })

    expect(await listCachedBoats()).toEqual([
      { id: 9, name: 'Albatros' },
      { id: 7, name: 'Ylang' },
    ])
  })

  test('une page de connexion rangée sous l’URL de la fiche est ignorée', async () => {
    stubCaches({
      [PAGES_CACHE]: {
        [`${ORIGIN}/boats/7`]: boatDocument(7, 'Ylang', 'Mon, 12 Oct 2026', 'auth/login'),
      },
    })
    expect(await listCachedBoats()).toEqual([])
  })

  test('sans Cache API, aucun bateau', async () => {
    vi.stubGlobal('caches', undefined)
    expect(await listCachedBoats()).toEqual([])
  })
})

describe('readOfflineBoatSnapshot', () => {
  test('assemble la fiche et ses props différées, la plus récente l’emportant', async () => {
    stubCaches({
      [PAGES_CACHE]: {
        [`${ORIGIN}/boats/7`]: boatDocument(7, 'Ylang', 'Sun, 11 Oct 2026 08:00:00 GMT'),
        [`${ORIGIN}/boats/7?tab=fuel`]: boatDocument(7, 'Ylang', 'Mon, 12 Oct 2026 08:00:00 GMT'),
      },
      [DATA_CACHE]: {
        [dataKey(7, ['maintenanceTasks', 'maintenanceEvents'])]: deferred(
          { maintenanceTasks: [{ id: 1 }] },
          'Sat, 10 Oct 2026 08:00:00 GMT'
        ),
        [dataKey(7, ['fuelLogs', 'incidents', 'navigationLogs'])]: deferred(
          { fuelLogs: [{ id: 1 }], incidents: [], navigationLogs: [] },
          'Sat, 10 Oct 2026 08:00:00 GMT'
        ),
        // Rechargement partiel plus récent : il remplace les pleins.
        [dataKey(7, ['fuelLogs'])]: deferred(
          { fuelLogs: [{ id: 1 }, { id: 2 }] },
          'Mon, 12 Oct 2026 09:00:00 GMT'
        ),
        // Autre bateau : jamais mélangé.
        [dataKey(8, ['incidents'])]: deferred({ incidents: [{ id: 99 }] }, 'Mon, 12 Oct 2026'),
      },
    })

    const snapshot = await readOfflineBoatSnapshot(7)

    expect(snapshot).toMatchObject({
      boatId: 7,
      boatName: 'Ylang',
      cachedAt: new Date('2026-10-12T08:00:00Z'),
      engines: [{ id: 37 }],
      maintenanceTasks: { rows: [{ id: 1 }], cachedAt: new Date('2026-10-10T08:00:00Z') },
      fuelLogs: { rows: [{ id: 1 }, { id: 2 }], cachedAt: new Date('2026-10-12T09:00:00Z') },
      incidents: { rows: [] },
      navigationLogs: { rows: [] },
    })
  })

  test('groupe différé absent : section nulle', async () => {
    stubCaches({
      [PAGES_CACHE]: { [`${ORIGIN}/boats/7`]: boatDocument(7, 'Ylang', 'Mon, 12 Oct 2026') },
    })
    const snapshot = await readOfflineBoatSnapshot(7)
    expect(snapshot?.maintenanceTasks).toBeNull()
    expect(snapshot?.fuelLogs).toBeNull()
  })

  test('fiche absente du cache : pas d’instantané', async () => {
    stubCaches({})
    expect(await readOfflineBoatSnapshot(7)).toBeNull()
  })
})

test('le dernier bateau préparé est retenu', () => {
  expect(readPreparedBoat()).toBeNull()
  rememberPreparedBoat(7)
  expect(readPreparedBoat()).toBe(7)
  localStorage.setItem('fleetai:passage:last-boat', 'abc')
  expect(readPreparedBoat()).toBeNull()
})
