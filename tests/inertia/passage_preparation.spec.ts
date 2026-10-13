import { describe, expect, test } from 'vitest'
import {
  evaluatePassageChecklist,
  MIN_FREE_BYTES,
  passagePages,
  passagePageUrls,
  type PassageChecklistInput,
} from '../../inertia/lib/passage_preparation'
import { SESSION_IDLE_DAYS } from '../../shared/constants/auth'
import { sheetsForEngine } from '../../shared/helpers/diagnostic'

// #967 — pages pré-chargées et check-list de départ.

describe('passagePages', () => {
  test('fiche, quatre onglets terrain et planning', () => {
    expect(passagePages(7).map((page) => page.url)).toEqual([
      '/boats/7',
      '/boats/7?tab=navigation-logs',
      '/boats/7?tab=sheets',
      '/boats/7?tab=fuel',
      '/boats/7?tab=incidents',
      '/planning',
    ])
  })

  // #981 — diagnostic de panne disponible en mer.
  const outboard2t = { id: 11, kind: 'outboard', fuel: 'essence', strokeType: '2_stroke' }
  const electric = { id: 12, kind: 'electric', fuel: null, strokeType: null }
  const diesel = { id: 13, kind: 'inboard', fuel: 'diesel', strokeType: null, family: null }

  test('sans moteur éligible, aucune page de diagnostic', () => {
    expect(passagePages(7, [electric]).map((page) => page.key)).not.toContain('diagnosticIndex')
    expect(passagePages(7, [electric])).toHaveLength(6)
  })

  test('l’index, puis une ligne par moteur éligible avec ses fiches rangées dessous', () => {
    const diagnostic = passagePages(7, [outboard2t, electric, diesel]).slice(6)

    expect(diagnostic.map(({ key, url, engineId }) => ({ key, url, engineId }))).toEqual([
      { key: 'diagnosticIndex', url: '/diagnostic', engineId: undefined },
      { key: 'diagnostic', url: '/boats/7/engines/11/diagnostic', engineId: 11 },
      { key: 'diagnostic', url: '/boats/7/engines/13/diagnostic', engineId: 13 },
    ])
    const sheets = sheetsForEngine(outboard2t)
    expect(sheets.length).toBeGreaterThan(0)
    expect(diagnostic[1].extraUrls).toEqual(
      sheets.map((sheet) => `/boats/7/engines/11/diagnostic/sheets/${sheet.slug}`)
    )
    // Les fiches suivent la famille : le diesel n'a pas celles du 2 temps.
    expect(diagnostic[2].extraUrls).not.toEqual(diagnostic[1].extraUrls)
  })

  test('passagePageUrls : la page puis ses fiches', () => {
    expect(passagePageUrls({ key: 'boat', url: '/boats/7' })).toEqual(['/boats/7'])
    expect(
      passagePageUrls({ key: 'diagnostic', url: '/a', extraUrls: ['/a/sheets/x', '/a/sheets/y'] })
    ).toEqual(['/a', '/a/sheets/x', '/a/sheets/y'])
  })
})

const ready: PassageChecklistInput = {
  persisted: true,
  estimate: { usage: 0, quota: 10 * MIN_FREE_BYTES },
  cachedAt: [new Date(), new Date()],
  pendingCount: 0,
  failedCount: 0,
  returnDate: '2026-10-20',
  today: new Date(2026, 9, 12, 18, 0),
}

describe('evaluatePassageChecklist', () => {
  test('tout est prêt', () => {
    expect(evaluatePassageChecklist(ready)).toEqual({
      storage: 'ok',
      quota: 'ok',
      pages: 'ok',
      queue: 'ok',
      session: 'ok',
      daysUntilReturn: 8,
    })
  })

  test('stockage : non demandé → inconnu, refusé → à vérifier', () => {
    expect(evaluatePassageChecklist({ ...ready, persisted: null }).storage).toBe('unknown')
    expect(evaluatePassageChecklist({ ...ready, persisted: false }).storage).toBe('warning')
  })

  test('quota : inconnu sans estimation, à vérifier sous le seuil', () => {
    expect(evaluatePassageChecklist({ ...ready, estimate: null }).quota).toBe('unknown')
    expect(evaluatePassageChecklist({ ...ready, estimate: { usage: 0, quota: 0 } }).quota).toBe(
      'unknown'
    )
    const tight = { usage: 10 * MIN_FREE_BYTES - 1, quota: 10 * MIN_FREE_BYTES }
    expect(evaluatePassageChecklist({ ...ready, estimate: tight }).quota).toBe('warning')
  })

  test('pages : une seule absente suffit à avertir', () => {
    expect(evaluatePassageChecklist({ ...ready, cachedAt: [new Date(), null] }).pages).toBe(
      'warning'
    )
    expect(evaluatePassageChecklist({ ...ready, cachedAt: [] }).pages).toBe('warning')
  })

  test('file : en attente ou en échec → à vérifier', () => {
    expect(evaluatePassageChecklist({ ...ready, pendingCount: 1 }).queue).toBe('warning')
    expect(evaluatePassageChecklist({ ...ready, failedCount: 1 }).queue).toBe('warning')
  })

  test('session : bornée par la durée d’inactivité', () => {
    const at = (returnDate: string) => evaluatePassageChecklist({ ...ready, returnDate })
    expect(at('').session).toBe('unknown')
    expect(at('pas une date').session).toBe('unknown')
    expect(SESSION_IDLE_DAYS).toBe(30)
    expect(at('2026-11-11')).toMatchObject({ session: 'ok', daysUntilReturn: 30 })
    expect(at('2026-11-12')).toMatchObject({ session: 'warning', daysUntilReturn: 31 })
  })
})
