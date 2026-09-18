import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { simulatorShareValidator } from '#validators/simulator_share'
import SimulatorShareService from '#services/simulator_share_service'
import { computeSimulatorCosts } from '#shared/simulator_costs'

@inject()
export default class SimulatorShareController {
  constructor(private simulatorShareService: SimulatorShareService) {}

  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(simulatorShareValidator)
    const locale = payload.locale ?? 'fr'
    const input = {
      ...payload.input,
      winteringZone: payload.input.winteringZone ?? undefined,
    }
    // Le breakdown est produit ici, à partir du seul `input` validé : le
    // partage reste cohérent avec la grille de coûts en vigueur, et aucun
    // montant venu de l'appelant n'atteint la page de lecture (#730).
    const share = await this.simulatorShareService.create(
      input,
      computeSimulatorCosts(input),
      locale
    )
    const path = locale === 'fr' ? `/simulateur/r/${share.token}` : `/simulator/r/${share.token}`
    return response.redirect(path)
  }

  async show({ params, inertia, response }: HttpContext) {
    const share = await this.simulatorShareService.findByToken(params.token)
    if (!share) {
      return response.redirect('/fr/simulateur-cout-entretien')
    }
    return inertia.render('marketing/simulator_share', {
      token: share.token,
      input: share.input,
      breakdown: share.breakdown,
      locale: share.locale,
    })
  }
}
