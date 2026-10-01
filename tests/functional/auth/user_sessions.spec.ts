import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'
import AuditLog from '#models/audit_log'
import User from '#models/user'
import UserSession from '#models/user_session'
import EmailQueueService from '#services/email_queue_service'
import { AUTH_SESSION_RECORD_KEY } from '#shared/constants/auth'
import type { UserSessionRow, UserSessionsSettingsProps } from '#shared/types/user_session'
import { truncateDb } from '#tests/utils/db'
import { createAdminUser } from '#tests/functional/helpers'

/**
 * Appareils et sessions connectés (#885) : registre `user_sessions`, liste,
 * révocation unitaire et globale, remember-me, alerte « nouvel appareil ».
 *
 * Le client Japa isole le magasin de sessions par requête : une « session »
 * se rejoue en reposant son identifiant de registre avec `withSession`.
 */

const PASSWORD = 'Password123!'
const MAC_CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
const WINDOWS_FIREFOX =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0'

let newLoginEmails: Array<{ to: string; browser: string | null }> = []

function swapEmails() {
  newLoginEmails = []
  app.container.swap(
    EmailQueueService,
    () =>
      ({
        sendNewLogin: async (params: { to: string; device: { browser: string | null } }) => {
          newLoginEmails.push({ to: params.to, browser: params.device.browser })
        },
        sendTwoFactorChanged: async () => {},
      }) as unknown as EmailQueueService
  )
}

async function createRecord(user: User, overrides: Partial<UserSession> = {}) {
  return UserSession.create({
    id: randomUUID(),
    userId: user.id,
    rememberMeTokenId: null,
    ipAddress: '203.0.113.9',
    userAgent: WINDOWS_FIREFOX,
    lastSeenAt: DateTime.now(),
    revokedAt: null,
    ...overrides,
  })
}

test.group('User sessions — registry (functional)', (group) => {
  group.each.setup(async () => {
    await truncateDb()
    swapEmails()
    return () => app.container.restore(EmailQueueService)
  })

  test('signing in records the session with its device and remember-me', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()

    const response = await client
      .post('/login')
      .header('user-agent', MAC_CHROME)
      .form({ email: user.email, password: PASSWORD, remember: true })
      .redirects(0)

    assert.equal(response.header('location'), '/dashboard')
    const recordId = response.session()[AUTH_SESSION_RECORD_KEY] as string
    const record = await UserSession.findOrFail(recordId)
    assert.equal(record.userId, user.id)
    assert.equal(record.userAgent, MAC_CHROME)
    assert.isNull(record.revokedAt)

    const tokens = await User.rememberMeTokens.all(user)
    assert.lengthOf(tokens, 1)
    assert.equal(record.rememberMeTokenId, Number(tokens[0].identifier))
  })

  test('a session without a record is adopted on its next request', async ({ client, assert }) => {
    const user = await createAdminUser()

    const response = await client.get('/dashboard').loginAs(user).withInertia()

    response.assertStatus(200)
    const recordId = response.session()[AUTH_SESSION_RECORD_KEY] as string
    assert.isString(recordId)
    const record = await UserSession.findOrFail(recordId)
    assert.equal(record.userId, user.id)
  })

  test('/settings/me lists only the account sessions and flags the current one', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const other = await createAdminUser()
    const current = await createRecord(user, { userAgent: MAC_CHROME })
    const elsewhere = await createRecord(user)
    await createRecord(other)
    await createRecord(user, { revokedAt: DateTime.now() })
    await createRecord(user, { lastSeenAt: DateTime.now().minus({ days: 6 }) })

    const page = await client
      .get('/settings/me')
      .loginAs(user)
      .withSession({ [AUTH_SESSION_RECORD_KEY]: current.id })
      .withInertia()

    page.assertStatus(200)
    const sessions = (page.inertiaProps.sessions as UserSessionsSettingsProps).sessions
    assert.sameMembers(
      sessions.map((s: UserSessionRow) => s.id),
      [current.id, elsewhere.id],
      'ni les sessions d’un autre compte, ni les révoquées, ni les expirées'
    )
    const mine = sessions.find((s) => s.id === current.id)!
    assert.isTrue(mine.isCurrent)
    assert.deepEqual(mine.device, { browser: 'Chrome', os: 'macOS' })
    assert.isFalse(sessions.find((s) => s.id === elsewhere.id)!.isCurrent)
  })

  test('a revoked session is signed out on its next request', async ({ client, assert }) => {
    const user = await createAdminUser()
    const record = await createRecord(user, { revokedAt: DateTime.now() })

    const response = await client
      .get('/dashboard')
      .loginAs(user)
      .withSession({ [AUTH_SESSION_RECORD_KEY]: record.id })
      .redirects(0)

    assert.equal(response.header('location'), '/login')
    assert.isUndefined(response.session().auth_web)
  })

  test('a session carrying another account record is recorded for its current user', async ({
    client,
    assert,
  }) => {
    // Le navigateur a changé de compte sans repasser par la connexion : la
    // session n'est pas falsifiable, on la recense pour son titulaire actuel
    // au lieu de couper un login légitime — et la ligne de l'autre compte
    // n'est pas touchée.
    const user = await createAdminUser()
    const other = await createAdminUser()
    const record = await createRecord(other)

    const response = await client
      .get('/dashboard')
      .loginAs(user)
      .withSession({ [AUTH_SESSION_RECORD_KEY]: record.id })
      .withInertia()

    response.assertStatus(200)
    const adoptedId = response.session()[AUTH_SESSION_RECORD_KEY] as string
    assert.notEqual(adoptedId, record.id)
    const adopted = await UserSession.findOrFail(adoptedId)
    assert.equal(adopted.userId, user.id)
    await record.refresh()
    assert.isNull(record.revokedAt)
  })

  test('signing out closes the record', async ({ client, assert }) => {
    const user = await createAdminUser()
    const record = await createRecord(user)

    await client
      .post('/logout')
      .loginAs(user)
      .withSession({ [AUTH_SESSION_RECORD_KEY]: record.id })
      .redirects(0)

    await record.refresh()
    assert.isNotNull(record.revokedAt)
  })
})

test.group('User sessions — revocation (functional)', (group) => {
  group.each.setup(async () => {
    await truncateDb()
    swapEmails()
    return () => app.container.restore(EmailQueueService)
  })

  test('revoking another session cuts it and deletes its remember-me', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const current = await createRecord(user)
    const token = await User.rememberMeTokens.create(user, '30d')
    const target = await createRecord(user, { rememberMeTokenId: Number(token.identifier) })

    const response = await client
      .delete(`/settings/sessions/${target.id}`)
      .loginAs(user)
      .withSession({ [AUTH_SESSION_RECORD_KEY]: current.id })
      .redirects(0)

    response.assertStatus(302)
    await target.refresh()
    assert.isNotNull(target.revokedAt)
    assert.lengthOf(
      await User.rememberMeTokens.all(user),
      0,
      'le remember-me rouvrirait la session'
    )

    const audit = await AuditLog.query().where('action', 'auth.session_revoked').firstOrFail()
    assert.equal(audit.userId, user.id)

    // La session coupée est refusée à sa requête suivante.
    const next = await client
      .get('/dashboard')
      .loginAs(user)
      .withSession({ [AUTH_SESSION_RECORD_KEY]: target.id })
      .redirects(0)
    assert.equal(next.header('location'), '/login')
  })

  test('a revoked remember-me can no longer restore a session', async ({ client, assert }) => {
    const user = await createAdminUser()

    const login = await client
      .post('/login')
      .header('user-agent', MAC_CHROME)
      .form({ email: user.email, password: PASSWORD, remember: true })
      .redirects(0)
    const recordId = login.session()[AUTH_SESSION_RECORD_KEY] as string
    const rememberCookie = login.cookie('remember_web')!.value as string

    // Le cookie seul rouvre une session, rattachée à la même ligne.
    const restored = await client
      .get('/dashboard')
      .withEncryptedCookie('remember_web', rememberCookie)
      .withInertia()
    restored.assertStatus(200)
    assert.equal(restored.session()[AUTH_SESSION_RECORD_KEY], recordId)
    const recycledCookie = restored.cookie('remember_web')!.value as string

    const current = await createRecord(user)
    await client
      .delete(`/settings/sessions/${recordId}`)
      .loginAs(user)
      .withSession({ [AUTH_SESSION_RECORD_KEY]: current.id })

    const replay = await client
      .get('/dashboard')
      .withEncryptedCookie('remember_web', recycledCookie)
      .redirects(0)
    assert.equal(replay.header('location'), '/login')
  })

  test('the current session cannot be revoked from the list', async ({ client, assert }) => {
    const user = await createAdminUser()
    const current = await createRecord(user)

    await client
      .delete(`/settings/sessions/${current.id}`)
      .loginAs(user)
      .withSession({ [AUTH_SESSION_RECORD_KEY]: current.id })
      .redirects(0)

    await current.refresh()
    assert.isNull(current.revokedAt)
  })

  test('another account session cannot be revoked', async ({ client, assert }) => {
    const user = await createAdminUser()
    const other = await createAdminUser()
    const target = await createRecord(other)

    const response = await client
      .delete(`/settings/sessions/${target.id}`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    await target.refresh()
    assert.isNull(target.revokedAt)
  })

  test('signing out everywhere else keeps only the current session', async ({ client, assert }) => {
    const user = await createAdminUser()
    const keptToken = await User.rememberMeTokens.create(user, '30d')
    const current = await createRecord(user, { rememberMeTokenId: Number(keptToken.identifier) })
    const otherToken = await User.rememberMeTokens.create(user, '30d')
    const other = await createRecord(user, { rememberMeTokenId: Number(otherToken.identifier) })
    // Remember-me antérieur au registre : rattaché à aucune ligne.
    await User.rememberMeTokens.create(user, '30d')

    const response = await client
      .delete('/settings/sessions/others')
      .loginAs(user)
      .withSession({ [AUTH_SESSION_RECORD_KEY]: current.id })
      .redirects(0)

    response.assertStatus(302)
    assert.notEqual(response.header('location'), '/login')
    await current.refresh()
    await other.refresh()
    assert.isNull(current.revokedAt)
    assert.isNotNull(other.revokedAt)

    const remaining = await User.rememberMeTokens.all(user)
    assert.deepEqual(
      remaining.map((t) => Number(t.identifier)),
      [Number(keptToken.identifier)]
    )

    await user.refresh()
    assert.isNotNull(user.sessionsValidAfter, 'les sessions antérieures au registre aussi')
    const audit = await AuditLog.query().where('action', 'auth.logout_all').firstOrFail()
    assert.deepEqual(audit.metadata, { sessions: 1 })
  })

  test('older remembered sign-ins are counted and revocable', async ({ client, assert }) => {
    const user = await createAdminUser()
    const current = await createRecord(user)
    await User.rememberMeTokens.create(user, '30d')

    const page = await client
      .get('/settings/me')
      .loginAs(user)
      .withSession({ [AUTH_SESSION_RECORD_KEY]: current.id })
      .withInertia()
    assert.equal((page.inertiaProps.sessions as UserSessionsSettingsProps).orphanRememberedCount, 1)

    await client
      .delete('/settings/sessions/remembered')
      .loginAs(user)
      .withSession({ [AUTH_SESSION_RECORD_KEY]: current.id })

    assert.lengthOf(await User.rememberMeTokens.all(user), 0)
  })

  test('changing the password closes the other records but not the current one', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const current = await createRecord(user)
    const other = await createRecord(user)

    await client
      .put('/settings/password')
      .loginAs(user)
      .withSession({ [AUTH_SESSION_RECORD_KEY]: current.id })
      .form({
        currentPassword: PASSWORD,
        password: 'NewPassword456!',
        passwordConfirmation: 'NewPassword456!',
      })
      .redirects(0)

    await current.refresh()
    await other.refresh()
    assert.isNull(current.revokedAt)
    assert.isNotNull(other.revokedAt)
  })
})

test.group('User sessions — new device alert (functional)', (group) => {
  group.each.setup(async () => {
    await truncateDb()
    swapEmails()
    return () => app.container.restore(EmailQueueService)
  })

  async function signIn(client: ApiClient, user: User, ua: string) {
    return client
      .post('/login')
      .header('user-agent', ua)
      .form({ email: user.email, password: PASSWORD })
      .redirects(0)
  }

  test('the first recorded sign-in sends nothing', async ({ client, assert }) => {
    const user = await createAdminUser()
    await signIn(client, user, MAC_CHROME)
    assert.lengthOf(newLoginEmails, 0)
  })

  test('a sign-in from an unseen device emails the account owner', async ({ client, assert }) => {
    const user = await createAdminUser()
    await createRecord(user, { userAgent: MAC_CHROME, revokedAt: DateTime.now() })

    await signIn(client, user, WINDOWS_FIREFOX)

    assert.deepEqual(newLoginEmails, [{ to: user.email, browser: 'Firefox' }])
  })

  test('a known device sends nothing', async ({ client, assert }) => {
    const user = await createAdminUser()
    await createRecord(user, { userAgent: MAC_CHROME })

    await signIn(client, user, MAC_CHROME)

    assert.lengthOf(newLoginEmails, 0)
  })

  test('the alert can be turned off', async ({ client, assert }) => {
    const user = await createAdminUser()
    await createRecord(user, { userAgent: MAC_CHROME })

    await client
      .put('/settings/sessions/notifications')
      .loginAs(user)
      .form({ enabled: false })
      .redirects(0)
    await user.refresh()
    assert.isFalse(user.notifyNewLogin)

    await signIn(client, user, WINDOWS_FIREFOX)
    assert.lengthOf(newLoginEmails, 0)
  })
})
