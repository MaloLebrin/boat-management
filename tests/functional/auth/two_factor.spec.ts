import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import AuditLog from '#models/audit_log'
import Organization from '#models/organization'
import TwoFactorRecoveryCode from '#models/two_factor_recovery_code'
import User from '#models/user'
import EmailQueueService from '#services/email_queue_service'
import TwoFactorService from '#services/two_factor_service'
import { TWO_FACTOR_ACCOUNT_LIMIT } from '#start/limiter'
import {
  RECOVERY_CODES_COUNT,
  TWO_FACTOR_PENDING_SESSION_KEY,
  TWO_FACTOR_RECOVERY_CODES_FLASH_KEY,
} from '#shared/constants/two_factor'
import type { TwoFactorEvent } from '#shared/types/two_factor'
import { totpCode } from '#utils/totp'
import { truncateDb } from '#tests/utils/db'
import { createAdminUser, createMemberUser } from '#tests/functional/helpers'

/**
 * Double authentification TOTP (#884) : activation, login en deux étapes,
 * anti-rejeu, codes de secours, désactivation, politique d'organisation.
 */

const PASSWORD = 'Password123!'

/** E-mails de notification capturés (la vraie file est remplacée). */
let sentEmails: Array<{ to: string; event: TwoFactorEvent }> = []

function swapEmails() {
  sentEmails = []
  app.container.swap(
    EmailQueueService,
    () =>
      ({
        sendTwoFactorChanged: async (params: { to: string; event: TwoFactorEvent }) => {
          sentEmails.push({ to: params.to, event: params.event })
        },
      }) as unknown as EmailQueueService
  )
}

/**
 * Active la 2FA directement par le service et rend le secret et les codes de
 * secours. Deux effets de la confirmation sont annulés pour le test : le pas
 * consommé (sinon le code courant serait refusé comme rejoué) et la révocation
 * des sessions (sinon `loginAs`, sans estampille, serait déconnecté).
 */
async function enableTwoFactor(user: User) {
  const service = await app.container.make(TwoFactorService)
  const setup = await service.beginSetup(user)
  const result = await service.confirmSetup(user, totpCode(setup.secret))
  await db
    .from('users')
    .where('id', user.id)
    .update({ two_factor_last_used_step: null, sessions_valid_after: null })
  sentEmails = []
  return { secret: setup.secret, recoveryCodes: result!.recoveryCodes }
}

function pendingSession(userId: number, remember = false, minutes = 5) {
  return {
    [TWO_FACTOR_PENDING_SESSION_KEY]: {
      userId,
      remember,
      expiresAt: DateTime.now().plus({ minutes }).toISO(),
    },
  }
}

let ipCounter = 0
/** IP distincte par requête : le compteur par IP ne doit pas masquer celui par compte. */
function nextIp() {
  ipCounter += 1
  return `198.19.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`
}

test.group('Two-factor authentication — setup (functional)', (group) => {
  group.each.setup(async () => {
    await truncateDb()
    swapEmails()
    return () => app.container.restore(EmailQueueService)
  })

  test('starting setup stores an encrypted secret and exposes a QR code', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()

    const start = await client.post('/settings/two-factor').loginAs(user).redirects(0)
    start.assertStatus(302)

    await user.refresh()
    assert.isNotNull(user.twoFactorSecret)
    assert.isTrue(user.twoFactorSecret!.startsWith('data.'), 'secret chiffré avec ENCRYPTION_KEY')
    assert.isNull(user.twoFactorConfirmedAt)

    const page = await client.get('/settings/me').loginAs(user).withInertia()
    page.assertStatus(200)
    const twoFactor = page.inertiaProps.twoFactor as Record<string, unknown>
    assert.isFalse(twoFactor.enabled)
    const setup = twoFactor.pendingSetup as Record<string, string>
    assert.match(setup.secret, /^[A-Z2-7]{32}$/)
    assert.isTrue(setup.qrCodeDataUri.startsWith('data:image/svg+xml;base64,'))
    assert.include(decodeURIComponent(setup.otpauthUri), `FleetAi:${user.email}`)
    // Le secret en clair n'est jamais dans la colonne.
    assert.notInclude(user.twoFactorSecret!, setup.secret)
  })

  test('a wrong code does not enable two-factor', async ({ client, assert }) => {
    const user = await createAdminUser()
    await client.post('/settings/two-factor').loginAs(user)

    const response = await client
      .post('/settings/two-factor/confirm')
      .loginAs(user)
      .form({ code: '000000' })
      .redirects(0)

    response.assertStatus(302)
    await user.refresh()
    assert.isNull(user.twoFactorConfirmedAt)
    assert.lengthOf(sentEmails, 0)
  })

  test('confirming enables 2FA, flashes recovery codes once, audits and notifies', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const service = await app.container.make(TwoFactorService)
    const setup = await service.beginSetup(user)

    const response = await client
      .post('/settings/two-factor/confirm')
      .loginAs(user)
      .form({ code: totpCode(setup.secret) })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('success')
    const codes = response.flashMessages()[TWO_FACTOR_RECOVERY_CODES_FLASH_KEY] as string[]
    assert.lengthOf(codes, RECOVERY_CODES_COUNT)
    for (const code of codes) assert.match(code, /^[a-z2-9]{5}-[a-z2-9]{5}$/)

    await user.refresh()
    assert.isNotNull(user.twoFactorConfirmedAt)
    // Activer coupe les autres sessions (#763).
    assert.isNotNull(user.sessionsValidAfter)

    const stored = await TwoFactorRecoveryCode.query().where('userId', user.id)
    assert.lengthOf(stored, RECOVERY_CODES_COUNT)
    for (const row of stored) assert.notInclude(codes, row.codeHash)

    const audit = await AuditLog.query()
      .where('action', 'auth.2fa_enabled')
      .where('userId', user.id)
      .first()
    assert.isNotNull(audit)
    assert.deepEqual(sentEmails, [{ to: user.email, event: 'enabled' }])
  })

  test('cancelling a pending setup clears the secret', async ({ client, assert }) => {
    const user = await createAdminUser()
    await client.post('/settings/two-factor').loginAs(user)

    await client.delete('/settings/two-factor/setup').loginAs(user).redirects(0)

    await user.refresh()
    assert.isNull(user.twoFactorSecret)
  })

  test('regenerating recovery codes requires a valid code and invalidates the old ones', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const { secret, recoveryCodes } = await enableTwoFactor(user)

    const refused = await client
      .post('/settings/two-factor/recovery-codes')
      .loginAs(user)
      .form({ code: '123456' })
      .redirects(0)
    assert.isUndefined(refused.flashMessages()[TWO_FACTOR_RECOVERY_CODES_FLASH_KEY])

    const response = await client
      .post('/settings/two-factor/recovery-codes')
      .loginAs(user)
      .form({ code: totpCode(secret) })
      .redirects(0)
    const fresh = response.flashMessages()[TWO_FACTOR_RECOVERY_CODES_FLASH_KEY] as string[]
    assert.lengthOf(fresh, RECOVERY_CODES_COUNT)
    assert.notInclude(fresh, recoveryCodes[0])

    const service = await app.container.make(TwoFactorService)
    await user.refresh()
    assert.isNull(await service.verifyCode(user, recoveryCodes[0]))
    assert.deepEqual(sentEmails, [{ to: user.email, event: 'recovery_regenerated' }])
  })

  test('disabling requires the password and a second factor', async ({ client, assert }) => {
    const user = await createAdminUser()
    const { secret } = await enableTwoFactor(user)

    await client
      .delete('/settings/two-factor')
      .loginAs(user)
      .form({ password: 'WrongPassword1!', code: totpCode(secret) })
      .redirects(0)
    await user.refresh()
    assert.isTrue(user.hasTwoFactorEnabled, 'mauvais mot de passe : rien ne change')

    await client
      .delete('/settings/two-factor')
      .loginAs(user)
      .form({ password: PASSWORD, code: '000000' })
      .redirects(0)
    await user.refresh()
    assert.isTrue(user.hasTwoFactorEnabled, 'mauvais code : rien ne change')

    const response = await client
      .delete('/settings/two-factor')
      .loginAs(user)
      .form({ password: PASSWORD, code: totpCode(secret) })
      .redirects(0)
    response.assertFlashMessage('success')

    await user.refresh()
    assert.isFalse(user.hasTwoFactorEnabled)
    assert.isNull(user.twoFactorSecret)
    assert.lengthOf(await TwoFactorRecoveryCode.query().where('userId', user.id), 0)
    assert.isNotNull(await AuditLog.findBy('action', 'auth.2fa_disabled'))
    assert.deepEqual(sentEmails, [{ to: user.email, event: 'disabled' }])
  })
})

test.group('Two-factor authentication — login (functional)', (group) => {
  group.each.setup(async () => {
    await truncateDb()
    swapEmails()
    return () => app.container.restore(EmailQueueService)
  })

  test('a valid password without 2FA signs in directly', async ({ client, assert }) => {
    const user = await createAdminUser()

    const response = await client
      .post('/login')
      .header('x-forwarded-for', nextIp())
      .form({ email: user.email, password: PASSWORD })
      .redirects(0)

    assert.equal(response.header('location'), '/dashboard')
    response.assertSessionMissing(TWO_FACTOR_PENDING_SESSION_KEY)
  })

  test('a valid password with 2FA opens the challenge, not the session', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    await enableTwoFactor(user)

    const response = await client
      .post('/login')
      .header('x-forwarded-for', nextIp())
      .form({ email: user.email, password: PASSWORD, remember: 'on' })
      .redirects(0)

    response.assertStatus(302)
    assert.equal(response.header('location'), '/login/2fa')
    const pending = response.session()[TWO_FACTOR_PENDING_SESSION_KEY] as Record<string, unknown>
    assert.equal(pending.userId, user.id)
    assert.isTrue(pending.remember)
    assert.isUndefined(response.session().auth_web, 'aucune session authentifiée avant le code')
    // Remember-me : pas avant le second facteur.
    assert.lengthOf(await User.rememberMeTokens.all(user), 0)
  })

  test('the challenge page requires a pending state', async ({ client, assert }) => {
    const user = await createAdminUser()

    const without = await client.get('/login/2fa').redirects(0)
    assert.equal(without.header('location'), '/login')

    const expired = await client
      .get('/login/2fa')
      .withSession(pendingSession(user.id, false, -1))
      .redirects(0)
    assert.equal(expired.header('location'), '/login')

    const page = await client.get('/login/2fa').withSession(pendingSession(user.id)).withInertia()
    page.assertStatus(200)
    page.assertInertiaComponent('auth/two_factor_challenge')
  })

  test('a valid TOTP code completes the login and applies remember-me', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const { secret } = await enableTwoFactor(user)

    const response = await client
      .post('/login/2fa')
      .header('x-forwarded-for', nextIp())
      .withSession(pendingSession(user.id, true))
      .form({ code: totpCode(secret) })
      .redirects(0)

    assert.equal(response.header('location'), '/dashboard')
    response.assertSessionMissing(TWO_FACTOR_PENDING_SESSION_KEY)
    assert.equal(response.session().auth_web, user.id)
    assert.lengthOf(await User.rememberMeTokens.all(user), 1)
    assert.isNotNull(await AuditLog.query().where('action', 'login').first())
  })

  test('a TOTP code cannot be replayed', async ({ client, assert }) => {
    const user = await createAdminUser()
    const { secret } = await enableTwoFactor(user)
    const code = totpCode(secret)

    const first = await client
      .post('/login/2fa')
      .header('x-forwarded-for', nextIp())
      .withSession(pendingSession(user.id))
      .form({ code })
      .redirects(0)
    assert.equal(first.header('location'), '/dashboard')

    const replay = await client
      .post('/login/2fa')
      .header('x-forwarded-for', nextIp())
      .withSession(pendingSession(user.id))
      .form({ code })
      .redirects(0)
    assert.notEqual(replay.header('location'), '/dashboard')
    assert.isUndefined(replay.session().auth_web)
    assert.isNotNull(await AuditLog.findBy('action', 'auth.2fa_failed'))
  })

  test('a recovery code works once', async ({ client, assert }) => {
    const user = await createAdminUser()
    const { recoveryCodes } = await enableTwoFactor(user)
    // Casse et tiret ignorés : l'utilisateur recopie un papier.
    const typed = recoveryCodes[0].toUpperCase().replace('-', ' ')

    const first = await client
      .post('/login/2fa')
      .header('x-forwarded-for', nextIp())
      .withSession(pendingSession(user.id))
      .form({ code: typed })
      .redirects(0)
    assert.equal(first.header('location'), '/dashboard')
    first.assertFlashMessage('info')
    assert.isNotNull(await AuditLog.findBy('action', 'auth.2fa_recovery_used'))
    assert.deepEqual(sentEmails, [{ to: user.email, event: 'recovery_used' }])

    const again = await client
      .post('/login/2fa')
      .header('x-forwarded-for', nextIp())
      .withSession(pendingSession(user.id))
      .form({ code: recoveryCodes[0] })
      .redirects(0)
    assert.isUndefined(again.session().auth_web)

    const service = await app.container.make(TwoFactorService)
    assert.equal(await service.recoveryCodesRemaining(user.id), RECOVERY_CODES_COUNT - 1)
  })

  test('the per-account counter blocks the challenge after repeated failures', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const { secret } = await enableTwoFactor(user)

    for (let index = 0; index < TWO_FACTOR_ACCOUNT_LIMIT.requests; index += 1) {
      await client
        .post('/login/2fa')
        .header('x-forwarded-for', nextIp())
        .withSession(pendingSession(user.id))
        .form({ code: '000000' })
        .redirects(0)
    }

    const blocked = await client
      .post('/login/2fa')
      .header('x-forwarded-for', nextIp())
      .withSession(pendingSession(user.id))
      .form({ code: totpCode(secret) })
      .redirects(0)

    assert.equal(blocked.header('location'), '/login')
    blocked.assertFlashMessage('error')
    blocked.assertSessionMissing(TWO_FACTOR_PENDING_SESSION_KEY)
    assert.isUndefined(blocked.session().auth_web)
  })

  test('a password reset does not disable 2FA', async ({ client, assert }) => {
    const user = await createAdminUser()
    await enableTwoFactor(user)
    user.password = 'NewPassword123!'
    await user.save()

    const response = await client
      .post('/login')
      .header('x-forwarded-for', nextIp())
      .form({ email: user.email, password: 'NewPassword123!' })
      .redirects(0)

    assert.equal(response.header('location'), '/login/2fa')
  })
})

test.group('Two-factor authentication — organization policy (functional)', (group) => {
  group.each.setup(async () => {
    await truncateDb()
    swapEmails()
    return () => app.container.restore(EmailQueueService)
  })

  test('an admin can require 2FA with a grace period; it is audited', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()

    const response = await client
      .put('/settings/org/two-factor')
      .loginAs(admin)
      .form({ requireTwoFactor: 'on', graceDays: '7' })
      .redirects(0)
    response.assertFlashMessage('success')

    const org = await Organization.findOrFail(admin.organizationId)
    assert.isTrue(org.requireTwoFactor)
    assert.approximately(
      org.twoFactorGraceEndsAt!.diff(DateTime.now(), 'days').days,
      7,
      0.01,
      'échéance à J+7'
    )
    const audit = await AuditLog.findByOrFail('action', 'organization.2fa_required')
    assert.deepEqual(audit.metadata, { required: true, graceDays: 7 })
  })

  test('a member cannot change the policy', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)

    const response = await client
      .put('/settings/org/two-factor')
      .loginAs(member)
      .form({ requireTwoFactor: 'on', graceDays: '0' })
      .redirects(0)

    assert.notEqual(response.status(), 200)
    const org = await Organization.findOrFail(admin.organizationId)
    assert.isFalse(org.requireTwoFactor)
  })

  test('during the grace period, members keep access and are warned at login', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    await Organization.query()
      .where('id', admin.organizationId!)
      .update({ requireTwoFactor: true, twoFactorGraceEndsAt: DateTime.now().plus({ days: 3 }) })

    const login = await client
      .post('/login')
      .header('x-forwarded-for', nextIp())
      .form({ email: member.email, password: PASSWORD })
      .redirects(0)
    assert.equal(login.header('location'), '/dashboard')
    login.assertFlashMessage('info')

    const dashboard = await client.get('/dashboard').loginAs(member).redirects(0)
    assert.equal(dashboard.status(), 200)
  })

  test('after the grace period, members without 2FA only reach the setup screen', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    await Organization.query()
      .where('id', admin.organizationId!)
      .update({ requireTwoFactor: true, twoFactorGraceEndsAt: null })

    const login = await client
      .post('/login')
      .header('x-forwarded-for', nextIp())
      .form({ email: member.email, password: PASSWORD })
      .redirects(0)
    assert.equal(login.header('location'), '/settings/me')

    const dashboard = await client.get('/dashboard').loginAs(member).redirects(0)
    assert.equal(dashboard.header('location'), '/settings/me')

    const settings = await client.get('/settings/me').loginAs(member).withInertia()
    settings.assertStatus(200)
    const twoFactor = settings.inertiaProps.twoFactor as Record<string, unknown>
    assert.isTrue(twoFactor.requiredByOrganization)

    const start = await client.post('/settings/two-factor').loginAs(member).redirects(0)
    assert.notEqual(start.header('location'), '/settings/me', 'activation autorisée')
    await member.refresh()
    assert.isNotNull(member.twoFactorSecret)

    // Une fois la 2FA active, l'accès revient.
    await db.from('users').where('id', member.id).update({ two_factor_secret: null })
    await member.refresh()
    await enableTwoFactor(member)
    const after = await client.get('/dashboard').loginAs(member).redirects(0)
    assert.equal(after.status(), 200)
  })

  test('the members directory shows who has 2FA', async ({ client, assert }) => {
    const admin = await createAdminUser()
    await createMemberUser(admin.organizationId!)
    await enableTwoFactor(admin)

    const page = await client.get('/settings/members').loginAs(admin).withInertia()
    const members = page.inertiaProps.members as Array<{
      userId: number
      twoFactorEnabled: boolean
    }>
    const byUser = Object.fromEntries(members.map((m) => [m.userId, m.twoFactorEnabled]))
    assert.isTrue(byUser[admin.id])
    assert.lengthOf(
      members.filter((m) => !m.twoFactorEnabled),
      1
    )

    const org = await client.get('/settings/org').loginAs(admin).withInertia()
    const policy = org.inertiaProps.twoFactorPolicy as Record<string, unknown>
    assert.equal(policy.membersWithoutTwoFactor, 1)
  })
})
