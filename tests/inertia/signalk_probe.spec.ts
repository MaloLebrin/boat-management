import { describe, expect, test, vi } from 'vitest'
import {
  inventoryFromVessel,
  isMixedContent,
  needsFullReloadForCsp,
  probeSignalKServer,
} from '../../inertia/lib/signalk/probe'
import type { SignalKTransport } from '../../inertia/lib/signalk/types'

const DISCOVERY = {
  server: { id: 'signalk-server-node', version: '2.8.1' },
  endpoints: {
    v1: {
      'signalk-http': 'http://signalk.local:3000/signalk/v1/api/',
      'signalk-ws': 'ws://signalk.local:3000/signalk/v1/stream',
    },
  },
}

/** `vessels/self` réaliste : deux moteurs, une batterie, un réservoir, une position. */
const VESSEL = {
  uuid: 'urn:mrn:signalk:uuid:c0d79334-4e25-4245-8892-54e8ccc8021d',
  name: 'Cap Horn',
  navigation: {
    position: {
      value: { longitude: -4.48, latitude: 48.38 },
      timestamp: '2026-10-25T08:00:00.000Z',
      $source: 'gps.GP',
    },
    speedOverGround: { value: 2.57, $source: 'gps.GP' },
  },
  propulsion: {
    port: { revolutions: { value: 25 }, temperature: { value: 340 } },
    starboard: { revolutions: { value: 24 } },
  },
  electrical: {
    batteries: { house: { voltage: { value: 12.7 }, current: { value: -3.2 } } },
  },
  tanks: { fuel: { '0': { currentLevel: { value: 0.62 } } } },
}

interface Reply {
  status: number
  body?: unknown
  throws?: boolean
}

function transport(discovery: Reply, vessel: Reply) {
  const fetchMock = vi.fn(async (url: string) => {
    const reply = url.endsWith('/signalk') ? discovery : vessel
    if (reply.throws) throw new TypeError('Failed to fetch')
    return {
      ok: reply.status < 400,
      status: reply.status,
      json: async () => {
        if (reply.body === undefined) throw new SyntaxError('Unexpected token')
        return reply.body
      },
    }
  })
  return { fetch: fetchMock as unknown as SignalKTransport['fetch'], mock: fetchMock }
}

const base = { baseUrl: 'https://sk.local:3443', token: 'tok', pageProtocol: 'https:' }

describe('isMixedContent', () => {
  test.each([
    ['http://192.168.1.20:3000', 'https:', true],
    ['http://signalk.local:3000', 'https:', true],
    ['https://signalk.local:3443', 'https:', false],
    ['http://192.168.1.20:3000', 'http:', false],
    ['http://localhost:3000', 'https:', false],
    ['http://127.0.0.1:3000', 'https:', false],
    ['http://192.168.1.20:3000', undefined, false],
    ['pas une url', 'https:', false],
  ])('%s sur %s → %s', (url, protocol, expected) => {
    expect(isMixedContent(url, protocol)).toBe(expected)
  })
})

describe('needsFullReloadForCsp', () => {
  test('origine différente, première source, même origine', () => {
    expect(needsFullReloadForCsp('https://a.local:3443', 'https://b.local:3443')).toBe(true)
    expect(needsFullReloadForCsp('https://a.local:3443', 'https://a.local:3444')).toBe(true)
    expect(needsFullReloadForCsp(null, 'https://a.local:3443')).toBe(true)
    expect(needsFullReloadForCsp('https://a.local:3443', 'https://a.local:3443/')).toBe(false)
  })
})

describe('inventoryFromVessel', () => {
  test('extrait moteurs, batteries, réservoirs, position et nom', () => {
    expect(inventoryFromVessel(VESSEL, '2.8.1')).toEqual({
      serverVersion: '2.8.1',
      vesselName: 'Cap Horn',
      engineIds: ['port', 'starboard'],
      batteryIds: ['house'],
      tankIds: ['fuel.0'],
      hasPosition: true,
    })
  })

  test('corps vide ou inattendu : inventaire vide', () => {
    const empty = {
      serverVersion: null,
      vesselName: null,
      engineIds: [],
      batteryIds: [],
      tankIds: [],
      hasPosition: false,
    }
    expect(inventoryFromVessel({})).toEqual(empty)
    expect(inventoryFromVessel(null)).toEqual(empty)
    expect(inventoryFromVessel({ navigation: { position: { value: null } } })).toEqual(empty)
  })
})

describe('probeSignalKServer', () => {
  test('adresse invalide : aucune requête', async () => {
    const t = transport({ status: 200 }, { status: 200 })
    for (const baseUrl of ['', 'pas une url', 'ftp://sk.local']) {
      expect(await probeSignalKServer({ ...base, baseUrl, fetch: t.fetch })).toEqual({
        ok: false,
        error: 'invalid_url',
        status: null,
      })
    }
    expect(t.mock).not.toHaveBeenCalled()
  })

  test('contenu mixte : erreur avant tout fetch', async () => {
    const t = transport({ status: 200 }, { status: 200 })
    const result = await probeSignalKServer({
      ...base,
      baseUrl: 'http://192.168.1.20:3000',
      fetch: t.fetch,
    })
    expect(result).toEqual({ ok: false, error: 'mixed_content', status: null })
    expect(t.mock).not.toHaveBeenCalled()
  })

  test('401 à la découverte', async () => {
    const t = transport({ status: 401 }, { status: 200 })
    expect(await probeSignalKServer({ ...base, fetch: t.fetch })).toEqual({
      ok: false,
      error: 'unauthorized',
      status: 401,
    })
  })

  test('401 à la sonde vessels/self', async () => {
    const t = transport({ status: 200, body: DISCOVERY }, { status: 401 })
    expect(await probeSignalKServer({ ...base, fetch: t.fetch })).toEqual({
      ok: false,
      error: 'unauthorized',
      status: 401,
    })
  })

  test('500 : injoignable, avec le statut', async () => {
    const t = transport({ status: 500 }, { status: 200 })
    expect(await probeSignalKServer({ ...base, fetch: t.fetch })).toEqual({
      ok: false,
      error: 'unreachable',
      status: 500,
    })
  })

  test('fetch qui échoue : tls en https, unreachable en http', async () => {
    const t = transport({ status: 0, throws: true }, { status: 200 })
    expect(await probeSignalKServer({ ...base, fetch: t.fetch })).toMatchObject({ error: 'tls' })
    expect(
      await probeSignalKServer({
        ...base,
        baseUrl: 'http://192.168.1.20:3000',
        pageProtocol: 'http:',
        fetch: t.fetch,
      })
    ).toMatchObject({ error: 'unreachable' })
  })

  test('JSON invalide à la découverte, ou découverte hors protocole', async () => {
    const invalid = transport({ status: 200 }, { status: 200 })
    expect(await probeSignalKServer({ ...base, fetch: invalid.fetch })).toMatchObject({
      error: 'protocol',
    })
    const alien = transport({ status: 200, body: { hello: 'world' } }, { status: 200 })
    expect(await probeSignalKServer({ ...base, fetch: alien.fetch })).toMatchObject({
      error: 'protocol',
    })
  })

  test('vessels/self qui n’est pas un objet JSON : protocol', async () => {
    const t = transport({ status: 200, body: DISCOVERY }, { status: 200 })
    expect(await probeSignalKServer({ ...base, fetch: t.fetch })).toMatchObject({
      ok: false,
      error: 'protocol',
    })
  })

  test('succès : inventaire, jeton envoyé, origine configurée reprise', async () => {
    const t = transport({ status: 200, body: DISCOVERY }, { status: 200, body: VESSEL })
    const result = await probeSignalKServer({ ...base, fetch: t.fetch })

    expect(result).toEqual({
      ok: true,
      inventory: {
        serverVersion: '2.8.1',
        vesselName: 'Cap Horn',
        engineIds: ['port', 'starboard'],
        batteryIds: ['house'],
        tankIds: ['fuel.0'],
        hasPosition: true,
      },
    })
    expect(t.mock.mock.calls.map(([url]) => url)).toEqual([
      'https://sk.local:3443/signalk',
      'https://sk.local:3443/signalk/v1/api/vessels/self',
    ])
    expect(t.mock.mock.calls[0][1]).toEqual({ headers: { Authorization: 'Bearer tok' } })
  })

  test('sans jeton : pas d’en-tête Authorization', async () => {
    const t = transport({ status: 200, body: DISCOVERY }, { status: 200, body: VESSEL })
    await probeSignalKServer({ ...base, token: null, fetch: t.fetch })
    expect(t.mock.mock.calls[0][1]).toEqual({ headers: {} })
  })

  test('preflight : valide l’adresse sans aucune requête', async () => {
    const t = transport({ status: 200, body: DISCOVERY }, { status: 200, body: VESSEL })
    expect(await probeSignalKServer({ ...base, preflight: true, fetch: t.fetch })).toEqual({
      ok: true,
      inventory: null,
    })
    expect(
      await probeSignalKServer({
        ...base,
        baseUrl: 'http://192.168.1.20:3000',
        preflight: true,
        fetch: t.fetch,
      })
    ).toMatchObject({ ok: false, error: 'mixed_content' })
    expect(t.mock).not.toHaveBeenCalled()
  })
})
