import { test } from '@japa/runner'
import User from '#models/user'

test.group('User model (auth)', () => {
  test('exposes rememberMeTokens provider when session guard uses remember-me', ({ assert }) => {
    assert.exists(User.rememberMeTokens)
    assert.isFunction(User.rememberMeTokens.create)
    assert.isFunction(User.rememberMeTokens.verify)
  })
})
