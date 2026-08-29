import { test } from '@japa/runner'
import {
  NAVIGATION_TITLE_VALIDITY_YEARS,
  suggestedExpiryDate,
} from '#shared/helpers/navigation_title'
import { NAVIGATION_TITLES } from '#shared/types/navigation_title'

test.group('suggestedExpiryDate (#585)', () => {
  test('propose une date à deux ans pour une visite médicale', ({ assert }) => {
    assert.equal(
      suggestedExpiryDate('medical_certificate', new Date('2026-08-29T12:00:00Z')),
      '2028-08-29'
    )
  })

  test('propose une date à cinq ans pour les STCW', ({ assert }) => {
    const from = new Date('2026-08-29T12:00:00Z')
    assert.equal(suggestedExpiryDate('stcw_basic', from), '2031-08-29')
    assert.equal(suggestedExpiryDate('stcw_proficiency', from), '2031-08-29')
  })

  test('ne propose rien pour les titres délivrés à vie', ({ assert }) => {
    const from = new Date('2026-08-29T12:00:00Z')
    for (const type of [
      'coastal_permit',
      'offshore_permit',
      'crr',
      'first_aid',
      'other',
    ] as const) {
      assert.isNull(suggestedExpiryDate(type, from))
    }
  })

  test('ne propose rien tant qu’aucun type n’est choisi', ({ assert }) => {
    assert.isNull(suggestedExpiryDate(''))
    assert.isNull(suggestedExpiryDate(null))
    assert.isNull(suggestedExpiryDate(undefined))
  })

  test('ne propose de durée que pour des titres du vocabulaire partagé', ({ assert }) => {
    for (const type of Object.keys(NAVIGATION_TITLE_VALIDITY_YEARS)) {
      assert.include(NAVIGATION_TITLES as readonly string[], type)
    }
  })
})
