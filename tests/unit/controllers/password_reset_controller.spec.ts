import { test } from '@japa/runner'
import PasswordResetController from '#controllers/password_reset_controller'
import { UserFactory } from '#database/factories/user_factory'

function makeI18n(key: string) {
  return key
}

function makeSession() {
  const flashes: Record<string, string> = {}
  const store: Record<string, unknown> = {}
  return {
    flash: (type: string, msg: string) => {
      flashes[type] = msg
    },
    put: (key: string, value: unknown) => {
      store[key] = value
    },
    get: (key: string) => store[key],
    forget: (key: string) => {
      delete store[key]
    },
    get flashes() {
      return flashes
    },
    get store() {
      return store
    },
  }
}

function makeRedirect() {
  const calls: string[] = []
  const obj = {
    // `edit` sort le jeton de l'URL en rejouant la page sans query string
    // (#770) : le double doit donc accepter `withQs(false)`.
    withQs: (_forward: boolean) => obj,
    toPath: (path: string) => {
      calls.push(path)
      return obj
    },
    back: () => {
      calls.push('back')
      return obj
    },
  }
  return { redirect: () => obj, calls }
}

test.group('PasswordResetController (unit)', () => {
  // ── create ───────────────────────────────────────────────────────────────

  test('create renders the forgot_password page', async ({ assert }) => {
    const rendered: string[] = []
    const controller = new PasswordResetController(
      { createToken: async () => null } as any,
      { sendPasswordReset: async () => {} } as any
    )

    await controller.create({ inertia: { render: (c: string) => rendered.push(c) } } as any)
    assert.equal(rendered[0], 'auth/forgot_password')
  })

  // ── store ────────────────────────────────────────────────────────────────

  test('store queues a reset email and flashes success for a known email', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()

    const emailsSent: string[] = []
    const controller = new PasswordResetController(
      {
        createToken: async () => 'fake-token',
      } as any,
      {
        sendPasswordReset: async ({ to }: { to: string }) => emailsSent.push(to),
      } as any
    )

    const session = makeSession()
    const { redirect, calls } = makeRedirect()

    await controller.store({
      request: { validateUsing: async () => ({ email: user.email }) },
      response: { redirect },
      session,
      i18n: { t: makeI18n },
    } as any)

    assert.equal(emailsSent[0], user.email)
    assert.equal(session.flashes['success'], 'flash.auth.passwordResetSent')
    assert.equal(calls[0], '/forgot-password')
  })

  test('store does not send email and still flashes success for an unknown email', async ({
    assert,
  }) => {
    const emailsSent: string[] = []
    const controller = new PasswordResetController(
      {
        createToken: async () => null,
      } as any,
      {
        sendPasswordReset: async ({ to }: { to: string }) => emailsSent.push(to),
      } as any
    )

    const session = makeSession()
    const { redirect, calls } = makeRedirect()

    await controller.store({
      request: { validateUsing: async () => ({ email: 'ghost@example.com' }) },
      response: { redirect },
      session,
      i18n: { t: makeI18n },
    } as any)

    assert.equal(emailsSent.length, 0)
    assert.equal(session.flashes['success'], 'flash.auth.passwordResetSent')
    assert.equal(calls[0], '/forgot-password')
  })

  // ── edit ─────────────────────────────────────────────────────────────────

  test('edit stashes a query-string token and replays the page without it', async ({ assert }) => {
    // #770 : le jeton ne doit traverser l'URL que le temps d'une requête. Le
    // `GET` l'échange contre une valeur de session et redirige sans query
    // string — donc pas de rendu à ce passage.
    const rendered: Array<{ component: string; props: any }> = []
    const controller = new PasswordResetController(
      { createToken: async () => null } as any,
      { sendPasswordReset: async () => {} } as any
    )

    const session = makeSession()
    const { redirect, calls } = makeRedirect()

    await controller.edit({
      request: { qs: () => ({ token: 'abc123' }) },
      response: { redirect },
      session,
      inertia: {
        render: (c: string, p: any) => rendered.push({ component: c, props: p }),
      },
    } as any)

    assert.lengthOf(rendered, 0)
    assert.deepEqual(calls, ['/reset-password'])
    assert.equal(session.store['passwordResetToken'], 'abc123')
  })

  test('edit renders the reset_password page with the token read back from session', async ({
    assert,
  }) => {
    const rendered: Array<{ component: string; props: any }> = []
    const controller = new PasswordResetController(
      { createToken: async () => null } as any,
      { sendPasswordReset: async () => {} } as any
    )

    const session = makeSession()
    session.put('passwordResetToken', 'abc123')
    const { redirect } = makeRedirect()

    await controller.edit({
      request: { qs: () => ({}) },
      response: { redirect },
      session,
      inertia: {
        render: (c: string, p: any) => rendered.push({ component: c, props: p }),
      },
    } as any)

    assert.equal(rendered[0]!.component, 'auth/reset_password')
    assert.equal(rendered[0]!.props.token, 'abc123')
  })

  test('edit passes an empty token when none is provided in the query string', async ({
    assert,
  }) => {
    const rendered: Array<{ component: string; props: any }> = []
    const controller = new PasswordResetController(
      { createToken: async () => null } as any,
      { sendPasswordReset: async () => {} } as any
    )

    await controller.edit({
      request: { qs: () => ({}) },
      response: { redirect: makeRedirect().redirect },
      session: makeSession(),
      inertia: {
        render: (c: string, p: any) => rendered.push({ component: c, props: p }),
      },
    } as any)

    assert.equal(rendered[0]!.props.token, '')
  })

  // ── update ───────────────────────────────────────────────────────────────

  test('update resets password and redirects to /login on valid token', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()

    const controller = new PasswordResetController(
      {
        verifyToken: async () => ({ email: user.email }),
        updatePassword: async () => true,
        invalidateTokensForEmail: async () => {},
        // #763 — la réinitialisation coupe aussi les accès existants.
        revokeAllAccessForEmail: async () => null,
      } as any,
      { sendPasswordReset: async () => {} } as any
    )

    const session = makeSession()
    const { redirect, calls } = makeRedirect()

    await controller.update({
      request: { validateUsing: async () => ({ token: 'valid-token', password: 'NewPass2!' }) },
      response: { redirect },
      session,
      i18n: { t: makeI18n },
    } as any)

    assert.equal(session.flashes['success'], 'flash.auth.passwordResetSuccess')
    assert.equal(calls[0], '/login')
  })

  test('update flashes error and redirects back on invalid token', async ({ assert }) => {
    const controller = new PasswordResetController(
      {
        verifyToken: async () => null,
        updatePassword: async () => false,
        invalidateTokensForEmail: async () => {},
      } as any,
      { sendPasswordReset: async () => {} } as any
    )

    const session = makeSession()
    const { redirect, calls } = makeRedirect()

    await controller.update({
      request: { validateUsing: async () => ({ token: 'bad-token', password: 'NewPass2!' }) },
      response: { redirect },
      session,
      i18n: { t: makeI18n },
    } as any)

    assert.equal(session.flashes['error'], 'flash.auth.passwordResetTokenInvalid')
    assert.equal(calls[0], 'back')
  })

  test('update flashes error when user disappears between verify and update', async ({
    assert,
  }) => {
    const controller = new PasswordResetController(
      {
        verifyToken: async () => ({ email: 'gone@example.com' }),
        updatePassword: async () => false,
        invalidateTokensForEmail: async () => {},
      } as any,
      { sendPasswordReset: async () => {} } as any
    )

    const session = makeSession()
    const { redirect, calls } = makeRedirect()

    await controller.update({
      request: { validateUsing: async () => ({ token: 'valid-token', password: 'NewPass2!' }) },
      response: { redirect },
      session,
      i18n: { t: makeI18n },
    } as any)

    assert.equal(session.flashes['error'], 'flash.auth.passwordResetTokenInvalid')
    assert.equal(calls[0], 'back')
  })
})
