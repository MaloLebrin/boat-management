import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import NotificationPreferenceService from '#services/notification_preference_service'
import { isNotificationFamily } from '#shared/constants/notifications'
import { updateNotificationPreferencesValidator } from '#validators/notification_preferences'

const UNSUBSCRIBE_PURPOSE = 'notification_unsubscribe'

/**
 * Préférences de notifications (#888) : matrice familles × canaux depuis
 * `/settings/notifications`, et désinscription en un clic depuis le pied
 * d'un e-mail (URL signée, sans session).
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
   * de la page (même URL signée).
   */
  async confirmUnsubscribe({ inertia, request, response, params }: HttpContext) {
    const user = await this.#resolve(request, params)
    if (!user) return response.notFound()
    return inertia.render('notifications/unsubscribe', {
      family: params.family,
      action: request.url(true),
      done: false,
    })
  }

  async unsubscribe({ inertia, request, response, params }: HttpContext) {
    const user = await this.#resolve(request, params)
    if (!user) return response.notFound()
    await this.preferences.unsubscribeEmail(user, params.family)
    return inertia.render('notifications/unsubscribe', {
      family: params.family,
      action: request.url(true),
      done: true,
    })
  }

  async #resolve(request: HttpContext['request'], params: HttpContext['params']) {
    if (!request.hasValidSignature(UNSUBSCRIBE_PURPOSE)) return null
    if (!isNotificationFamily(params.family)) return null
    return this.preferences.findActiveUser(Number(params.userId))
  }
}
