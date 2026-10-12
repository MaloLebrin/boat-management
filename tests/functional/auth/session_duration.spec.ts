import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import User from '#models/user'
import EmailQueueService from '#services/email_queue_service'
import { REMEMBER_ME_DAYS, SESSION_IDLE_DAYS } from '#shared/constants/auth'
import { truncateDb } from '#tests/utils/db'
import { createAdminUser } from '#tests/functional/helpers'

/**
 * Durées de session dimensionnées pour une traversée (#951, épic #949).
 *
 * Une sortie de 2 à 4 semaines sans réseau dépassait l'ancien `age: '5d'` :
 * au retour, le rejeu de la file hors-ligne tombait sur /login (#950). La
 * session inactive tient désormais `SESSION_IDLE_DAYS`, le remember-me
 * `REMEMBER_ME_DAYS` — et les deux configs lisent ces constantes, qui servent
 * aussi à `UserSessionService.listActive` et au libellé de la case.
 */

const PASSWORD = 'Password123!'

test.group('Session duration — traversée (#951)', (group) => {
  group.each.setup(() => truncateDb())
  group.each.setup(() => {
    app.container.swap(
      EmailQueueService,
      () =>
        ({
          sendNewLogin: async () => {},
          sendTwoFactorChanged: async () => {},
        }) as unknown as EmailQueueService
    )
    return () => app.container.restore(EmailQueueService)
  })

  test('the constants cover a long crossing', ({ assert }) => {
    assert.isAtLeast(SESSION_IDLE_DAYS, 30)
    assert.isAtLeast(REMEMBER_ME_DAYS, 90)
    assert.isAtLeast(REMEMBER_ME_DAYS, SESSION_IDLE_DAYS)
  })

  test('a remember-me token issued at login expires after REMEMBER_ME_DAYS', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const before = DateTime.now()

    await client
      .post('/login')
      .form({ email: user.email, password: PASSWORD, remember: true })
      .redirects(0)

    const tokens = await User.rememberMeTokens.all(user)
    assert.lengthOf(tokens, 1)
    const expiresAt = DateTime.fromJSDate(tokens[0].expiresAt)
    const lifetimeDays = expiresAt.diff(before, 'days').days
    assert.closeTo(lifetimeDays, REMEMBER_ME_DAYS, 0.01)
  })

  test('the session cookie lives SESSION_IDLE_DAYS', async ({ client, assert }) => {
    const user = await createAdminUser()

    const response = await client
      .post('/login')
      .form({ email: user.email, password: PASSWORD })
      .redirects(0)

    const setCookie = ([] as string[]).concat(response.header('set-cookie') ?? [])
    const sessionCookie = setCookie.find((cookie) => cookie.startsWith('adonis-session='))
    assert.isDefined(sessionCookie, 'session cookie should be set at login')
    const maxAge = Number(/max-age=(\d+)/i.exec(sessionCookie!)?.[1])
    assert.equal(maxAge, SESSION_IDLE_DAYS * 24 * 3600)
  })
})
