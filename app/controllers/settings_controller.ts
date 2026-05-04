import type { HttpContext } from '@adonisjs/core/http'

export default class SettingsController {
  async index({ inertia, auth }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    return inertia.render('settings/index', {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
    })
  }
}
