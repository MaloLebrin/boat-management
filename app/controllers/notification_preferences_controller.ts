import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import NotificationPreferenceService from '#services/notification_preference_service'
import { updateNotificationPreferencesValidator } from '#validators/notification_preferences'

/**
 * Préférences de notifications (#888) : matrice familles × canaux depuis
 * `/settings/notifications`, et désinscription en un clic depuis le pied
 * d'un e-mail (jeton signé, sans session).
 */
@inject()
export default class NotificationPreferencesController {
  constructor(private preferences: NotificationPreferenceService) {}

  async update({ auth, request, response, session, i18n }: HttpContext) {
    const user = await auth.authenticate()
    const payload = await request.validateUsing(updateNotificationPreferencesValidator)
    await this.preferences.update(user, payload)
    session.flash('success', i18n.t('flash.notifications.preferencesSaved'))
    return response.redirect().back()
  }

  /**
   * Page de confirmation. Le lien d'un e-mail est ouvert par les antivirus de
   * messagerie : un GET ne doit rien changer, la désinscription est le POST
   * de la page (même URL).
   */
  async confirmUnsubscribe({ inertia, response, params }: HttpContext) {
    const target = await this.preferences.resolveUnsubscribeToken(String(params.token))
    if (!target) return response.notFound()
    return inertia.render('notifications/unsubscribe', {
      family: target.family,
      action: `/notifications/unsubscribe/${params.token}`,
      done: false,
    })
  }

  async unsubscribe({ inertia, response, params }: HttpContext) {
    const target = await this.preferences.resolveUnsubscribeToken(String(params.token))
    if (!target) return response.notFound()
    await this.preferences.unsubscribeEmail(target.user, target.family)
    return inertia.render('notifications/unsubscribe', {
      family: target.family,
      action: `/notifications/unsubscribe/${params.token}`,
      done: true,
    })
  }
}
