import { test } from '@japa/runner'
import { computeContextHash } from '#utils/context_hash'

test.group('context_hash', () => {
  test('the same input always produces the same hash', ({ assert }) => {
    const input = { boat: { id: 1, name: 'Sun Odyssey 35' }, parts: [{ designation: 'Turbine' }] }

    assert.equal(computeContextHash(input), computeContextHash(input))
    assert.equal(
      computeContextHash(input),
      computeContextHash({
        boat: { id: 1, name: 'Sun Odyssey 35' },
        parts: [{ designation: 'Turbine' }],
      })
    )
  })

  test('a field change produces a different hash', ({ assert }) => {
    const before = { boat: { id: 1 }, parts: [{ wearState: 'good' }] }
    const after = { boat: { id: 1 }, parts: [{ wearState: 'to_replace' }] }

    assert.notEqual(computeContextHash(before), computeContextHash(after))
  })

  test('the hash is a 64-char hex sha256', ({ assert }) => {
    assert.match(computeContextHash({ a: 1 }), /^[0-9a-f]{64}$/)
  })
})
