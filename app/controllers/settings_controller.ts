import { updateOrganizationValidator, updateProfileValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class SettingsController {
  async index({ inertia, auth }: HttpContext) {
    const user = await auth.authenticate()
    await user.load('organization')

    return inertia.render('settings/index', {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
      },
    })
  }

  async updateProfile({ request, response, session, auth, i18n }: HttpContext) {
    const user = await auth.authenticate()
    const { fullName } = await request.validateUsing(updateProfileValidator)

    user.fullName = fullName
    await user.save()

    session.flash('success', i18n.t('flash.settings.profileUpdated'))
    return response.redirect().back()
  }

  async updateOrganization({ request, response, session, auth, i18n }: HttpContext) {
    const user = await auth.authenticate()
    await user.load('organization')

    const { name } = await request.validateUsing(updateOrganizationValidator)

    user.organization.name = name
    await user.organization.save()

    session.flash('success', i18n.t('flash.settings.orgUpdated'))
    return response.redirect().back()
  }
}
