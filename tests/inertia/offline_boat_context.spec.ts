import { describe, expect, test } from 'vitest'
import {
  activeEngines,
  asksFuelLevel,
  boatIdFromPageUrl,
  detectOfflineBoatIntent,
  latestFuelLog,
  latestNavigationLog,
  mentionedBoatId,
  openIncidents,
  readInertiaPageFromHtml,
  upcomingTasks,
} from '../../inertia/lib/offline_boat_context'
import type { FuelLogRow } from '#shared/types/fuel_log'
import type { BoatIncidentRow } from '#shared/types/incident'
import type { NavigationLogRow } from '#shared/types/navigation_log'
import type { BoatShowEngine, MaintenanceTaskRow } from '../../inertia/types/boat_show'

// #982 — contexte du bateau pour l'assistant hors-ligne : intention et extraction.

describe('detectOfflineBoatIntent', () => {
  test.each([
    ['Quelles sont les prochaines échéances ?', 'maintenance'],
    ['quand est la prochaine vidange', 'maintenance'],
    ['upcoming maintenance tasks', 'maintenance'],
    ['Y a-t-il des incidents ouverts ?', 'incidents'],
    ['une avarie en cours ?', 'incidents'],
    ['Dernier plein de gasoil', 'fuel'],
    ['when did we last refuel', 'fuel'],
    ['Combien d’heures moteur ?', 'engineHours'],
    ['engine hours please', 'engineHours'],
    ['Dernière sortie au journal de bord', 'logbook'],
    ['show me the last trip', 'logbook'],
  ])('« %s » → %s', (question, intent) => {
    expect(detectOfflineBoatIntent(question)).toBe(intent)
  })

  test('l’entretien l’emporte sur les heures moteur, le carburant aussi', () => {
    expect(detectOfflineBoatIntent('heures moteur de la prochaine vidange')).toBe('maintenance')
    expect(detectOfflineBoatIntent('heures moteur au dernier plein')).toBe('fuel')
  })

  test('une question « comment faire » reste à l’aide produit', () => {
    expect(detectOfflineBoatIntent('Comment saisir un plein ?')).toBeNull()
    expect(detectOfflineBoatIntent('how do I add an incident')).toBeNull()
    expect(detectOfflineBoatIntent('où trouver le journal de bord')).toBeNull()
  })

  test('une question sans rapport n’est pas reconnue', () => {
    expect(detectOfflineBoatIntent('quel temps fera-t-il demain')).toBeNull()
  })
})

test('asksFuelLevel repère une question sur le niveau', () => {
  expect(asksFuelLevel('quel niveau de carburant reste-t-il')).toBe(true)
  expect(asksFuelLevel('how much fuel is left')).toBe(true)
  expect(asksFuelLevel('dernier plein')).toBe(false)
})

test('boatIdFromPageUrl lit la fiche et ses sous-pages', () => {
  expect(boatIdFromPageUrl('/boats/7')).toBe(7)
  expect(boatIdFromPageUrl('/boats/7?tab=fuel')).toBe(7)
  expect(boatIdFromPageUrl('/boats/7/engines/3/diagnostic')).toBe(7)
  expect(boatIdFromPageUrl('/boats')).toBeNull()
  expect(boatIdFromPageUrl('/boats/create')).toBeNull()
  expect(boatIdFromPageUrl('/planning')).toBeNull()
})

test('mentionedBoatId retrouve un nom de bateau, accents et casse ignorés', () => {
  const boats = [
    { id: 1, name: 'Ylang' },
    { id: 2, name: 'Étoile' },
    { id: 3, name: 'Étoile de mer' },
  ]
  expect(mentionedBoatId('et pour ylang ?', boats)).toBe(1)
  expect(mentionedBoatId('etoile', boats)).toBe(2)
  expect(mentionedBoatId('le plein d’Étoile de Mer', boats)).toBe(3)
  expect(mentionedBoatId('Ylangylang', boats)).toBeNull()
})

describe('readInertiaPageFromHtml', () => {
  const page = { component: 'boats/show', props: { boat: { id: 7, name: 'Ylang & co' } } }

  test('attribut data-page du conteneur', () => {
    const encoded = JSON.stringify(page).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    const html = `<html><body><div id="app" data-page="${encoded}"><main>…</main></div></body></html>`
    expect(readInertiaPageFromHtml(html)).toEqual(page)
  })

  test('élément <script data-page>', () => {
    const html = `<html><body><script data-page="app" type="application/json">${JSON.stringify(page)}</script><div id="app"></div></body></html>`
    expect(readInertiaPageFromHtml(html)).toEqual(page)
  })

  test('document sans objet page ou JSON invalide', () => {
    expect(readInertiaPageFromHtml('<html><body>login</body></html>')).toBeNull()
    expect(readInertiaPageFromHtml('<div data-page="{oops"></div>')).toBeNull()
  })
})

function task(overrides: Partial<MaintenanceTaskRow>): MaintenanceTaskRow {
  return {
    id: 1,
    subject: 'engine',
    title: 'Vidange',
    notes: null,
    status: 'open',
    dueAt: null,
    dueEngineHours: null,
    boatEngineId: null,
    boatSailId: null,
    boatRigId: null,
    boatSafetyEquipmentId: null,
    boatGenericEquipmentId: null,
    recurrenceIntervalMonths: null,
    recurrenceIntervalEngineHours: null,
    boatIncidentId: null,
    ...overrides,
  }
}

test('upcomingTasks : ouvertes et échues, datées d’abord, puis à l’horamètre', () => {
  const rows = upcomingTasks([
    task({ id: 1, dueEngineHours: 900 }),
    task({ id: 2, dueAt: '2026-11-02' }),
    task({ id: 3, dueAt: '2026-10-20' }),
    task({ id: 4, dueEngineHours: 500 }),
    task({ id: 5, dueAt: '2026-10-01', status: 'done' }),
    task({ id: 6 }),
  ])
  expect(rows.map((row) => row.id)).toEqual([3, 2, 4, 1])
})

test('activeEngines écarte les moteurs retirés', () => {
  const engines = [
    { id: 1, status: 'operational' },
    { id: 2, status: 'retired' },
    { id: 3, status: 'in_maintenance' },
  ] as BoatShowEngine[]
  expect(activeEngines(engines).map((engine) => engine.id)).toEqual([1, 3])
})

test('latestFuelLog et latestNavigationLog prennent le plus récent', () => {
  const fuel = [
    { id: 1, fueledAt: '2026-09-01T10:00:00Z' },
    { id: 2, fueledAt: '2026-10-01T10:00:00Z' },
  ] as FuelLogRow[]
  expect(latestFuelLog(fuel)?.id).toBe(2)
  expect(latestFuelLog([])).toBeNull()

  const logs = [
    { id: 1, departedAt: '2026-10-05T08:00:00Z' },
    { id: 2, departedAt: '2026-09-05T08:00:00Z' },
  ] as NavigationLogRow[]
  expect(latestNavigationLog(logs)?.id).toBe(1)
  expect(latestNavigationLog([])).toBeNull()
})

test('openIncidents garde ouverts et en cours, le plus récent d’abord', () => {
  const incidents = [
    { id: 1, status: 'open', occurredAt: '2026-09-01T00:00:00Z' },
    { id: 2, status: 'closed', occurredAt: '2026-10-01T00:00:00Z' },
    { id: 3, status: 'in_progress', occurredAt: '2026-10-02T00:00:00Z' },
  ] as BoatIncidentRow[]
  expect(openIncidents(incidents).map((incident) => incident.id)).toEqual([3, 1])
})
