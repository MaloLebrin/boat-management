import { describe, expect, test } from 'vitest'
import { parsePushPayload, PUSH_FALLBACK_TITLE } from '../../inertia/lib/push_payload'

/**
 * #498 — parsing du payload push, extrait du SW en fonction pure. Contrat :
 * ne jamais lever et toujours renvoyer de quoi afficher — Safari et Chrome
 * désabonnent un endpoint qui reçoit des push sans notification affichée.
 */
describe('parsePushPayload', () => {
  test('parse un payload JSON complet', () => {
    const parsed = parsePushPayload(
      JSON.stringify({
        title: 'Vidange en retard',
        body: 'Sun Odyssey 35',
        actionUrl: '/planning',
        type: 'maintenance.overdue',
      })
    )

    expect(parsed).toEqual({
      title: 'Vidange en retard',
      body: 'Sun Odyssey 35',
      url: '/planning',
      tag: 'fleetai-maintenance.overdue',
    })
  })

  test('payload vide → notification générique affichable', () => {
    for (const raw of [null, undefined, '']) {
      const parsed = parsePushPayload(raw)
      expect(parsed.title).toBe(PUSH_FALLBACK_TITLE)
      expect(parsed.url).toBe('/notifications')
      expect(parsed.tag).toBe('fleetai-generic')
    }
  })

  test('JSON invalide → le texte brut devient le corps, jamais de throw', () => {
    const parsed = parsePushPayload('pas du json {')
    expect(parsed.title).toBe(PUSH_FALLBACK_TITLE)
    expect(parsed.body).toBe('pas du json {')
  })

  test('un tag par type — les alertes récurrentes coalescent', () => {
    const a = parsePushPayload(JSON.stringify({ title: 'A', type: 'maintenance.overdue' }))
    const b = parsePushPayload(JSON.stringify({ title: 'B', type: 'maintenance.overdue' }))
    const c = parsePushPayload(JSON.stringify({ title: 'C', type: 'document.expired' }))

    expect(a.tag).toBe(b.tag)
    expect(a.tag).not.toBe(c.tag)
  })

  test("une actionUrl absolue ou non relative est remplacée par le repli — pas d'ouverture hors app", () => {
    for (const actionUrl of ['https://evil.example/x', 'javascript:alert(1)', 'notifications']) {
      const parsed = parsePushPayload(JSON.stringify({ title: 'X', actionUrl }))
      expect(parsed.url).toBe('/notifications')
    }
  })

  test('un payload JSON non-objet retombe sur le générique', () => {
    for (const raw of ['42', '"texte"', 'null', '[1,2]']) {
      const parsed = parsePushPayload(raw)
      expect(parsed.title).toBe(PUSH_FALLBACK_TITLE)
    }
  })
})
