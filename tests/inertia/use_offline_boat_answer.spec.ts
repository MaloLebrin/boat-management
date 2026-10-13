import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import assistantFr from '../../resources/lang/fr/assistant.json'
import type { OfflineBoatSnapshot } from '../../inertia/lib/offline_boat_context'

// #982 — réponses factuelles sur le bateau, depuis la fiche en cache.

function flatten(value: unknown, prefix: string, out: Record<string, string>) {
  if (typeof value === 'string') out[prefix] = value
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) flatten(child, `${prefix}.${key}`, out)
  }
  return out
}

const pageProps = vi.hoisted(() => ({ appT: {} as Record<string, string>, locale: 'fr' }))
vi.mock('@inertiajs/vue3', () => ({ usePage: () => ({ url: '/', props: pageProps }) }))

const cache = vi.hoisted(() => ({
  listCachedBoats: vi.fn(),
  readOfflineBoatSnapshot: vi.fn(),
  readPreparedBoat: vi.fn(),
}))
vi.mock('~/lib/offline_boat_cache', () => cache)

import {
  resetOfflineBoatAnswer,
  useOfflineBoatAnswer,
} from '../../inertia/composables/use_offline_boat_answer'

function mountAnswer() {
  let result: ReturnType<typeof useOfflineBoatAnswer> | undefined
  mount(
    defineComponent({
      setup() {
        result = useOfflineBoatAnswer()
        return {}
      },
      template: '<div />',
    })
  )
  return result!.answer
}

const FRESH = new Date('2026-10-12T08:00:00Z')

function snapshot(overrides: Partial<OfflineBoatSnapshot> = {}): OfflineBoatSnapshot {
  return {
    boatId: 7,
    boatName: 'Ylang',
    cachedAt: FRESH,
    engines: [
      {
        id: 1,
        kind: 'inboard',
        brand: 'Volvo',
        model: 'D2-40',
        serialNumber: null,
        strokeType: null,
        hours: 1240,
        status: 'operational',
      },
      { id: 2, kind: 'outboard', brand: 'Yamaha', model: null, hours: null, status: 'operational' },
      { id: 3, kind: 'outboard', brand: 'Old', model: null, hours: 99, status: 'retired' },
    ] as OfflineBoatSnapshot['engines'],
    maintenanceTasks: {
      cachedAt: new Date('2026-10-11T08:00:00Z'),
      rows: [
        { id: 1, title: 'Vidange', status: 'open', dueAt: '2026-10-20', dueEngineHours: null },
        { id: 2, title: 'Turbine', status: 'open', dueAt: null, dueEngineHours: 1300 },
      ] as NonNullable<OfflineBoatSnapshot['maintenanceTasks']>['rows'],
    },
    fuelLogs: {
      cachedAt: FRESH,
      rows: [
        {
          id: 1,
          fueledAt: '2026-10-05T10:00:00Z',
          quantityLiters: 80,
          engineHoursAtFueling: 1220,
        },
      ] as NonNullable<OfflineBoatSnapshot['fuelLogs']>['rows'],
    },
    incidents: {
      cachedAt: FRESH,
      rows: [
        {
          id: 1,
          type: 'damage',
          status: 'open',
          occurredAt: '2026-10-03T10:00:00Z',
          description: 'Fuite au presse-étoupe',
        },
      ] as NonNullable<OfflineBoatSnapshot['incidents']>['rows'],
    },
    navigationLogs: {
      cachedAt: FRESH,
      rows: [
        {
          id: 1,
          departedAt: '2026-10-06T08:00:00Z',
          arrivedAt: '2026-10-06T18:00:00Z',
          departurePortName: 'Lorient',
          arrivalPortName: 'Groix',
          distanceNm: 12.5,
          notes: null,
        },
      ] as NonNullable<OfflineBoatSnapshot['navigationLogs']>['rows'],
    },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  resetOfflineBoatAnswer()
  pageProps.appT = {
    ...flatten(assistantFr, 'assistant', {}),
    'incidents.type.damage': 'Avarie',
  }
  cache.listCachedBoats.mockResolvedValue([{ id: 7, name: 'Ylang' }])
  cache.readOfflineBoatSnapshot.mockResolvedValue(snapshot())
  cache.readPreparedBoat.mockReturnValue(null)
})

describe('réponses par intention', () => {
  test('échéances : en-tête de fraîcheur, la plus proche d’abord, lien vers la fiche', async () => {
    const reply = await mountAnswer()('prochaines échéances ?', '/boats/7')

    expect(reply).toEqual({
      content:
        'Ylang — d’après les données du 11/10/2026\n\n2 échéances ouvertes, les plus proches :\n• Vidange — le 20/10/2026\n• Turbine — à 1300 h moteur',
      link: { href: '/boats/7', label: 'Ouvrir la fiche de Ylang' },
      fromBoatData: true,
    })
  })

  test('heures moteur : moteurs en service seulement, date du document', async () => {
    const reply = await mountAnswer()('heures moteur', '/boats/7')
    expect(reply?.content).toContain('d’après les données du 12/10/2026')
    expect(reply?.content).toContain('• Volvo D2-40 : 1240 h')
    expect(reply?.content).toContain('• Yamaha : compteur non renseigné')
    expect(reply?.content).not.toContain('Old')
  })

  test('carburant : dernier plein, compteur, et le niveau n’est pas suivi', async () => {
    const reply = await mountAnswer()('niveau de carburant ?', '/boats/7')
    expect(reply?.content).toContain('Dernier plein le 05/10/2026 : 80 L.')
    expect(reply?.content).toContain('Compteur moteur au plein : 1220 h.')
    expect(reply?.content).toContain('Le niveau de la cuve n’est pas suivi')
    expect(reply?.link?.href).toBe('/boats/7?tab=fuel')
  })

  test('incidents ouverts, avec leur type traduit', async () => {
    const reply = await mountAnswer()('incidents ouverts', '/boats/7')
    expect(reply?.content).toContain('1 incident ouvert :')
    expect(reply?.content).toContain('• Avarie du 03/10/2026 — Fuite au presse-étoupe')
    expect(reply?.link?.href).toBe('/boats/7?tab=incidents')
  })

  test('journal de bord : dernière sortie et distance', async () => {
    const reply = await mountAnswer()('dernière sortie', '/boats/7')
    expect(reply?.content).toContain('Dernière sortie le 06/10/2026 : Lorient → Groix.')
    expect(reply?.content).toContain('Distance : 12.5 NM.')
    expect(reply?.link?.href).toBe('/boats/7?tab=navigation-logs')
  })

  test('section non mise en cache : invite à préparer la traversée', async () => {
    cache.readOfflineBoatSnapshot.mockResolvedValue(snapshot({ incidents: null }))
    const reply = await mountAnswer()('incidents ouverts', '/boats/7')
    expect(reply?.fromBoatData).toBe(false)
    expect(reply?.content).toContain('Ces données de Ylang n’ont pas été mises en cache')
  })

  test('aucune ligne : message dédié', async () => {
    cache.readOfflineBoatSnapshot.mockResolvedValue(
      snapshot({ fuelLogs: { rows: [], cachedAt: FRESH } })
    )
    const reply = await mountAnswer()('dernier plein', '/boats/7')
    expect(reply?.content).toContain('Aucun plein enregistré.')
  })
})

describe('choix du bateau', () => {
  test('question non reconnue : rien, l’aide produit prend le relais', async () => {
    expect(await mountAnswer()('quel temps demain', '/boats/7')).toBeNull()
    expect(cache.listCachedBoats).not.toHaveBeenCalled()
  })

  test('rien en cache : rien, même depuis une fiche', async () => {
    cache.listCachedBoats.mockResolvedValue([])
    expect(await mountAnswer()('dernier plein', '/boats/7')).toBeNull()
  })

  test('fiche courante absente du cache : le dit, sans répondre pour un autre bateau', async () => {
    const reply = await mountAnswer()('dernier plein', '/boats/8?tab=fuel')
    expect(reply?.content).toContain('La fiche de ce bateau n’est pas en cache')
    expect(cache.readOfflineBoatSnapshot).not.toHaveBeenCalled()
  })

  test('hors fiche : le dernier bateau préparé', async () => {
    cache.listCachedBoats.mockResolvedValue([
      { id: 7, name: 'Ylang' },
      { id: 9, name: 'Albatros' },
    ])
    cache.readPreparedBoat.mockReturnValue(9)
    await mountAnswer()('dernier plein', '/planning')
    expect(cache.readOfflineBoatSnapshot).toHaveBeenCalledWith(9)
  })

  test('hors fiche, un seul bateau en cache : celui-là', async () => {
    await mountAnswer()('dernier plein', '/dashboard')
    expect(cache.readOfflineBoatSnapshot).toHaveBeenCalledWith(7)
  })

  test('le nom cité dans la question l’emporte sur la page', async () => {
    cache.listCachedBoats.mockResolvedValue([
      { id: 7, name: 'Ylang' },
      { id: 9, name: 'Albatros' },
    ])
    await mountAnswer()('dernier plein d’Albatros', '/boats/7')
    expect(cache.readOfflineBoatSnapshot).toHaveBeenCalledWith(9)
  })

  test('ambigu : demande lequel, puis répond quand le nom arrive', async () => {
    cache.listCachedBoats.mockResolvedValue([
      { id: 9, name: 'Albatros' },
      { id: 7, name: 'Ylang' },
    ])
    const answer = mountAnswer()

    const question = await answer('dernier plein', '/dashboard')
    expect(question).toEqual({
      content: 'De quel bateau parlez-vous ? En cache : Albatros, Ylang.',
      fromBoatData: false,
    })
    expect(cache.readOfflineBoatSnapshot).not.toHaveBeenCalled()

    const reply = await answer('Ylang', '/dashboard')
    expect(cache.readOfflineBoatSnapshot).toHaveBeenCalledWith(7)
    expect(reply?.link?.href).toBe('/boats/7?tab=fuel')
  })

  test('ambigu, puis autre chose qu’un nom : la question en attente est oubliée', async () => {
    cache.listCachedBoats.mockResolvedValue([
      { id: 9, name: 'Albatros' },
      { id: 7, name: 'Ylang' },
    ])
    const answer = mountAnswer()
    await answer('dernier plein', '/dashboard')

    expect(await answer('quel temps demain', '/dashboard')).toBeNull()
    expect(await answer('Ylang', '/dashboard')).toBeNull()
  })
})
