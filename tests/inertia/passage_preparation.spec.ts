import { describe, expect, test } from 'vitest'
import {
  evaluatePassageChecklist,
  MIN_FREE_BYTES,
  passagePages,
  type PassageChecklistInput,
} from '../../inertia/lib/passage_preparation'
import { SESSION_IDLE_DAYS } from '../../shared/constants/auth'

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
