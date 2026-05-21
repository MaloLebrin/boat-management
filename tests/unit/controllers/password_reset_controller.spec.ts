import { test } from '@japa/runner'
import PasswordResetController from '#controllers/password_reset_controller'
import Organization from '#models/organization'
import User from '#models/user'
import PasswordResetToken from '#models/password_reset_token'

function makeI18n(key: string) {
  return key
}

function makeSession() {
  const flashes: Record<string, string> = {}
  return {
    flash: (type: string, msg: string) => {
      flashes[type] = msg
    },
    get flashes() {
      return flashes
    },
  }
}

function makeRedirect() {
  const calls: string[] = []
  const obj = {
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

test.group('PasswordResetController (unit)', (group) => {
  group.each.teardown(async () => {
    await PasswordResetToken.query().delete()
    await User.query().delete()
    await Organization.query().delete()
  })

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
    const org = await Organization.create({ name: 'O', slug: 'o-prc-1' })
    await User.create({ email: 'ctrl1@example.com', password: 'Password123!', fullName: 'C1', organizationId: org.id })

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
      request: { validateUsing: async () => ({ email: 'ctrl1@example.com' }) },
      response: { redirect },
      session,
      i18n: { t: makeI18n },
    } as any)

    assert.equal(emailsSent[0], 'ctrl1@example.com')
    assert.equal(session.flashes['success'], 'flash.auth.passwordResetSent')
    assert.equal(calls[0], '/forgot-password')
  })

  test('store does not send email and still flashes success for an unknown email', async ({ assert }) => {
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

  test('edit renders the reset_password page with the token prop', async ({ assert }) => {
    const rendered: Array<{ component: string; props: any }> = []
    const controller = new PasswordResetController(
      { createToken: async () => null } as any,
      { sendPasswordReset: async () => {} } as any
    )

    await controller.edit({
      request: { qs: () => ({ token: 'abc123' }) },
      inertia: {
        render: (c: string, p: any) => rendered.push({ component: c, props: p }),
      },
    } as any)

    assert.equal(rendered[0]!.component, 'auth/reset_password')
    assert.equal(rendered[0]!.props.token, 'abc123')
  })

  test('edit passes an empty token when none is provided in the query string', async ({ assert }) => {
    const rendered: Array<{ component: string; props: any }> = []
    const controller = new PasswordResetController(
      { createToken: async () => null } as any,
      { sendPasswordReset: async () => {} } as any
    )

    await controller.edit({
      request: { qs: () => ({}) },
      inertia: {
        render: (c: string, p: any) => rendered.push({ component: c, props: p }),
      },
    } as any)

    assert.equal(rendered[0]!.props.token, '')
  })

  // ── update ───────────────────────────────────────────────────────────────

  test('update resets password and redirects to /login on valid token', async ({ assert }) => {
    const org = await Organization.create({ name: 'O', slug: 'o-prc-2' })
    await User.create({ email: 'ctrl2@example.com', password: 'OldPass1!', fullName: 'C2', organizationId: org.id })

    const controller = new PasswordResetController(
      {
        verifyToken: async () => ({ email: 'ctrl2@example.com' }),
        updatePassword: async () => true,
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

  test('update flashes error when user disappears between verify and update', async ({ assert }) => {
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
