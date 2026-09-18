import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { simulatorShareValidator } from '#validators/simulator_share'
import SimulatorShareService from '#services/simulator_share_service'
import { marketingPath } from '#shared/helpers/locale_path'
import type { AppLocale } from '#shared/helpers/locale_path'

@inject()
export default class SimulatorShareController {
  constructor(private simulatorShareService: SimulatorShareService) {}

  /**
   * Locale de la route de lecture empruntée — `simulator.share.show.en` sert
   * `/simulator/r/:token`, `simulator.share.show.fr` sert `/simulateur/r/:token`.
   * Les deux pointent sur la même méthode ; seul le nom les distingue.
   */
  private localeOfShareRoute(routeName: string | undefined): AppLocale {
    return routeName === 'simulator.share.show.en' ? 'en' : 'fr'
  }

  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(simulatorShareValidator)
    const locale = payload.locale ?? 'fr'
    const input = {
      ...payload.input,
      winteringZone: payload.input.winteringZone ?? undefined,
    }
    const share = await this.simulatorShareService.create(input, payload.breakdown, locale)
    const path = locale === 'fr' ? `/simulateur/r/${share.token}` : `/simulator/r/${share.token}`
    return response.redirect(path)
  }

  async show({ params, inertia, response, route }: HttpContext) {
    const share = await this.simulatorShareService.findByToken(params.token)
    if (!share) {
      // Un jeton périmé ou mal recopié renvoie au simulateur **de la route
      // empruntée** (#732) : la cible unique `/fr/…` posait un visiteur
      // anglophone sur la page française.
      return response.redirect(marketingPath('simulator', this.localeOfShareRoute(route?.name)))
    }
    return inertia.render('marketing/simulator_share', {
      token: share.token,
      input: share.input,
      breakdown: share.breakdown,
      locale: share.locale,
    })
  }
}
