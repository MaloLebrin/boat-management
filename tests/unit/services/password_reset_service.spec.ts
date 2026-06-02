import { test } from '@japa/runner'
import { createHash } from 'node:crypto'
import { DateTime } from 'luxon'
import PasswordResetService from '#services/password_reset_service'
import PasswordResetToken from '#models/password_reset_token'
import Organization from '#models/organization'
import User from '#models/user'

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

test.group('PasswordResetService (unit)', (group) => {
  group.each.teardown(async () => {
    await PasswordResetToken.query().delete()
    await User.query().delete()
    await Organization.query().delete()
  })

  // ── createToken ─────────────────────────────────────────────────────────

  test('createToken returns a token for an existing user', async ({ assert }) => {
    const org = await Organization.create({ name: 'O', slug: 'o-prs-1' })
    await User.create({
      email: 'reset1@example.com',
      password: 'Password123!',
      fullName: 'R1',
      organizationId: org.id,
    })

    const svc = new PasswordResetService()
    const token = await svc.createToken('reset1@example.com')

    assert.isString(token)
    assert.equal(token!.length, 128) // 64 random bytes → 128 hex chars

    const record = await PasswordResetToken.findBy('email', 'reset1@example.com')
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
    const org = await Organization.create({ name: 'O', slug: 'o-prs-2' })
    await User.create({
      email: 'reset2@example.com',
      password: 'Password123!',
      fullName: 'R2',
      organizationId: org.id,
    })

    const svc = new PasswordResetService()
    const first = await svc.createToken('reset2@example.com')
    const second = await svc.createToken('reset2@example.com')

    const records = await PasswordResetToken.query().where('email', 'reset2@example.com')
    assert.equal(records.length, 1)
    assert.equal(records[0]!.token, sha256(second!))
    assert.notEqual(first, second)
  })

  // ── verifyToken ──────────────────────────────────────────────────────────

  test('verifyToken returns the record for a valid token', async ({ assert }) => {
    const org = await Organization.create({ name: 'O', slug: 'o-prs-3' })
    await User.create({
      email: 'reset3@example.com',
      password: 'Password123!',
      fullName: 'R3',
      organizationId: org.id,
    })

    const svc = new PasswordResetService()
    const token = await svc.createToken('reset3@example.com')
    const record = await svc.verifyToken(token!)

    assert.isNotNull(record)
    assert.equal(record!.email, 'reset3@example.com')
  })

  test('verifyToken returns null for an invalid token', async ({ assert }) => {
    const svc = new PasswordResetService()
    const record = await svc.verifyToken('a'.repeat(128))
    assert.isNull(record)
  })

  test('verifyToken returns null for an expired token', async ({ assert }) => {
    const org = await Organization.create({ name: 'O', slug: 'o-prs-4' })
    await User.create({
      email: 'reset4@example.com',
      password: 'Password123!',
      fullName: 'R4',
      organizationId: org.id,
    })

    const rawToken = 'b'.repeat(128)
    await PasswordResetToken.create({
      email: 'reset4@example.com',
      token: sha256(rawToken),
      expiresAt: DateTime.now().minus({ hours: 2 }),
    })

    const svc = new PasswordResetService()
    const record = await svc.verifyToken(rawToken)
    assert.isNull(record)
  })

  // ── invalidateTokensForEmail ─────────────────────────────────────────────

  test('invalidateTokensForEmail removes all tokens for an email', async ({ assert }) => {
    const org = await Organization.create({ name: 'O', slug: 'o-prs-5' })
    await User.create({
      email: 'reset5@example.com',
      password: 'Password123!',
      fullName: 'R5',
      organizationId: org.id,
    })

    const svc = new PasswordResetService()
    await svc.createToken('reset5@example.com')
    await svc.createToken('reset5@example.com') // second call replaces, but let's also add manually
    await PasswordResetToken.create({
      email: 'reset5@example.com',
      token: sha256('c'.repeat(128)),
      expiresAt: DateTime.now().plus({ hours: 1 }),
    })

    await svc.invalidateTokensForEmail('reset5@example.com')

    const remaining = await PasswordResetToken.query().where('email', 'reset5@example.com')
    assert.equal(remaining.length, 0)
  })

  // ── updatePassword ───────────────────────────────────────────────────────

  test('updatePassword changes the user password and returns true', async ({ assert }) => {
    const org = await Organization.create({ name: 'O', slug: 'o-prs-6' })
    const user = await User.create({
      email: 'reset6@example.com',
      password: 'OldPassword1!',
      fullName: 'R6',
      organizationId: org.id,
    })
    const oldHash = user.password

    const svc = new PasswordResetService()
    const result = await svc.updatePassword('reset6@example.com', 'NewPassword2!')

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
