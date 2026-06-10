import { test } from '@japa/runner'
import { createHash } from 'node:crypto'
import { DateTime } from 'luxon'
import PasswordResetService from '#services/password_reset_service'
import PasswordResetToken from '#models/password_reset_token'
import { UserFactory } from '#database/factories/user_factory'

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

test.group('PasswordResetService (unit)', () => {
  // ── createToken ─────────────────────────────────────────────────────────

  test('createToken returns a token for an existing user', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()

    const svc = new PasswordResetService()
    const token = await svc.createToken(user.email)

    assert.isString(token)
    assert.equal(token!.length, 128) // 64 random bytes → 128 hex chars

    const record = await PasswordResetToken.findBy('email', user.email)
    assert.isNotNull(record)
    assert.equal(record!.token, sha256(token!))
    assert.isTrue(record!.expiresAt > DateTime.now())
  })

  test('createToken returns null for an unknown email', async ({ assert }) => {
    const svc = new PasswordResetService()
    const token = await svc.createToken('nobody@example.com')
    assert.isNull(token)
  })

  test('createToken replaces a previous token for the same email', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()

    const svc = new PasswordResetService()
    const first = await svc.createToken(user.email)
    const second = await svc.createToken(user.email)

    const records = await PasswordResetToken.query().where('email', user.email)
    assert.equal(records.length, 1)
    assert.equal(records[0]!.token, sha256(second!))
    assert.notEqual(first, second)
  })

  // ── verifyToken ──────────────────────────────────────────────────────────

  test('verifyToken returns the record for a valid token', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()

    const svc = new PasswordResetService()
    const token = await svc.createToken(user.email)
    const record = await svc.verifyToken(token!)

    assert.isNotNull(record)
    assert.equal(record!.email, user.email)
  })

  test('verifyToken returns null for an invalid token', async ({ assert }) => {
    const svc = new PasswordResetService()
    const record = await svc.verifyToken('a'.repeat(128))
    assert.isNull(record)
  })

  test('verifyToken returns null for an expired token', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()

    const rawToken = 'b'.repeat(128)
    await PasswordResetToken.create({
      email: user.email,
      token: sha256(rawToken),
      expiresAt: DateTime.now().minus({ hours: 2 }),
    })

    const svc = new PasswordResetService()
    const record = await svc.verifyToken(rawToken)
    assert.isNull(record)
  })

  // ── invalidateTokensForEmail ─────────────────────────────────────────────

  test('invalidateTokensForEmail removes all tokens for an email', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()

    const svc = new PasswordResetService()
    await svc.createToken(user.email)
    await svc.createToken(user.email) // second call replaces, but let's also add manually
    await PasswordResetToken.create({
      email: user.email,
      token: sha256('c'.repeat(128)),
      expiresAt: DateTime.now().plus({ hours: 1 }),
    })

    await svc.invalidateTokensForEmail(user.email)

    const remaining = await PasswordResetToken.query().where('email', user.email)
    assert.equal(remaining.length, 0)
  })

  // ── updatePassword ───────────────────────────────────────────────────────

  test('updatePassword changes the user password and returns true', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const oldHash = user.password

    const svc = new PasswordResetService()
    const result = await svc.updatePassword(user.email, 'NewPassword2!')

    assert.isTrue(result)
    await user.refresh()
    assert.notEqual(user.password, oldHash)
  })

  test('updatePassword returns false for an unknown email', async ({ assert }) => {
    const svc = new PasswordResetService()
    const result = await svc.updatePassword('ghost@example.com', 'NewPassword2!')
    assert.isFalse(result)
  })
})
