import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import UserTransformer from '#transformers/user_transformer'
import type User from '#models/user'

function makeUser(overrides: Partial<User> & { initials?: string } = {}): User {
  return {
    id: 1,
    fullName: 'Alice Martin',
    email: 'alice@example.com',
    createdAt: DateTime.fromISO('2026-07-04T10:00:00.000Z'),
    updatedAt: DateTime.fromISO('2026-07-04T12:00:00.000Z'),
    initials: 'AM',
    ...overrides,
  } as unknown as User
}

test.group('UserTransformer', () => {
  test('toObject returns all picked keys', ({ assert }) => {
    const user = makeUser()
    const result = new UserTransformer(user).toObject()

    assert.equal(result.id, 1)
    assert.equal(result.fullName, 'Alice Martin')
    assert.equal(result.email, 'alice@example.com')
    assert.equal(result.initials, 'AM')
  })

  test('password is not included in picked keys', ({ assert }) => {
    const user = makeUser()
    const result = new UserTransformer(user).toObject()
    assert.notProperty(result, 'password')
  })

  test('createdAt DateTime is preserved as-is', ({ assert }) => {
    const dt = DateTime.fromISO('2026-07-04T10:00:00.000Z')
    const user = makeUser({ createdAt: dt })
    const result = new UserTransformer(user).toObject()
    assert.deepEqual(result.createdAt, dt)
  })

  test('updatedAt null is preserved', ({ assert }) => {
    const user = makeUser({ updatedAt: null })
    const result = new UserTransformer(user).toObject()
    assert.isNull(result.updatedAt)
  })

  test('fullName null is preserved', ({ assert }) => {
    const user = makeUser({ fullName: null, initials: 'AL' })
    const result = new UserTransformer(user).toObject()
    assert.isNull(result.fullName)
  })
})
