import { test } from '@japa/runner'
import { documentStatusFor } from '#shared/helpers/boat_document'

test.group('documentStatusFor (#832)', () => {
  test('is valid without expiry or far in the future', ({ assert }) => {
    assert.equal(documentStatusFor(null, '2026-09-26'), 'valid')
    assert.equal(documentStatusFor('2026-12-31', '2026-09-26'), 'valid')
  })

  test('is expiring soon under the 30-day warning window, today included', ({ assert }) => {
    assert.equal(documentStatusFor('2026-10-25', '2026-09-26'), 'expiring_soon')
    assert.equal(documentStatusFor('2026-09-26', '2026-09-26'), 'expiring_soon')
    assert.equal(documentStatusFor('2026-10-26', '2026-09-26'), 'valid')
  })

  test('is expired strictly before today', ({ assert }) => {
    assert.equal(documentStatusFor('2026-09-25', '2026-09-26'), 'expired')
  })
})
