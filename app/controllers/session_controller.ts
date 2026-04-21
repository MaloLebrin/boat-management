import User from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'
import fs from 'node:fs'

export default class SessionController {
  async create({ inertia }: HttpContext) {
    // #region agent log
    try {
      fs.appendFileSync(
        '/Users/malolebrin/Documents/3d-website/.cursor/debug-cde605.log',
        `${JSON.stringify({
          sessionId: 'cde605',
          runId: 'pre-fix',
          hypothesisId: 'H2',
          location: 'app/controllers/session_controller.ts:create',
          message: 'render login page',
          data: {},
          timestamp: Date.now(),
        })}\n`
      )
    } catch {}
    // #endregion agent log
    return inertia.render('auth/login', {})
  }

  async store({ request, auth, response }: HttpContext) {
    const { email, password } = request.all()
    // #region agent log
    try {
      fs.appendFileSync(
        '/Users/malolebrin/Documents/3d-website/.cursor/debug-cde605.log',
        `${JSON.stringify({
          sessionId: 'cde605',
          runId: 'pre-fix',
          hypothesisId: 'H3',
          location: 'app/controllers/session_controller.ts:store',
          message: 'login attempt',
          data: {
            hasEmail: Boolean(email),
            passwordLen: typeof password === 'string' ? password.length : null,
          },
          timestamp: Date.now(),
        })}\n`
      )
    } catch {}
    // #endregion agent log
    try {
      const user = await User.verifyCredentials(email, password)
      await auth.use('web').login(user)
      // #region agent log
      try {
        fs.appendFileSync(
          '/Users/malolebrin/Documents/3d-website/.cursor/debug-cde605.log',
          `${JSON.stringify({
            sessionId: 'cde605',
            runId: 'pre-fix',
            hypothesisId: 'H4',
            location: 'app/controllers/session_controller.ts:store',
            message: 'login success, redirecting to dashboard',
            data: { userId: user.id },
            timestamp: Date.now(),
          })}\n`
        )
      } catch {}
      // #endregion agent log
      response.redirect().toRoute('dashboard')
    } catch (error: any) {
      // #region agent log
      try {
        fs.appendFileSync(
          '/Users/malolebrin/Documents/3d-website/.cursor/debug-cde605.log',
          `${JSON.stringify({
            sessionId: 'cde605',
            runId: 'pre-fix',
            hypothesisId: 'H4',
            location: 'app/controllers/session_controller.ts:store',
            message: 'login failed (exception)',
            data: {
              errorName: error?.name ?? null,
              errorCode: error?.code ?? null,
              errorMessage: typeof error?.message === 'string' ? error.message.slice(0, 140) : null,
            },
            timestamp: Date.now(),
          })}\n`
        )
      } catch {}
      // #endregion agent log
      throw error
    }
  }

  async destroy({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    response.redirect().toRoute('session.create')
  }
}
