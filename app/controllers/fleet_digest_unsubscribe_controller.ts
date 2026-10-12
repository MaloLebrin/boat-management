import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import NotificationPreferenceService from '#services/notification_preference_service'

/**
 * Désinscription en un clic d'un rapport de flotte (#871) depuis le pied de
 * l'e-mail : jeton signé (utilisateur, rapport), sans session. Comme pour les
 * familles de notifications, le GET n'est qu'une page de confirmation — les
 * antivirus de messagerie suivent les liens.
 */
@inject()
export default class FleetDigestUnsubscribeController {
  constructor(private preferences: NotificationPreferenceService) {}

  async show({ inertia, response, params }: HttpContext) {
    const target = await this.preferences.resolveFleetDigestUnsubscribeToken(String(params.token))
    if (!target) return response.notFound()
    return inertia.render('reports/digest_unsubscribe', {
      kind: target.kind,
      action: `/reports/digest/unsubscribe/${params.token}`,
      done: false,
    })
  }

  async store({ inertia, response, params }: HttpContext) {
    const target = await this.preferences.resolveFleetDigestUnsubscribeToken(String(params.token))
    if (!target) return response.notFound()
    await this.preferences.unsubscribeFleetDigest(target.user, target.kind)
    return inertia.render('reports/digest_unsubscribe', {
      kind: target.kind,
      action: `/reports/digest/unsubscribe/${params.token}`,
      done: true,
    })
  }
}
