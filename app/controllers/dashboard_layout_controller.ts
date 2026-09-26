import DashboardLayoutService from '#services/dashboard_layout_service'
import { updateDashboardLayoutValidator } from '#validators/dashboard_layout'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Personnalisation du tableau de bord : la modale « Personnaliser » enregistre
 * (PUT) ou réinitialise (DELETE) la disposition, puis la page se recharge par
 * redirection Inertia et relit la prop `layout`.
 */
@inject()
export default class DashboardLayoutController {
  constructor(private layoutService: DashboardLayoutService) {}

  async update({ request, response, session, auth, i18n }: HttpContext) {
    const user = await auth.authenticate()
    const payload = await request.validateUsing(updateDashboardLayoutValidator)

    if (user.organizationId) await user.load('organization')
    const role = user.organizationId ? await user.getEffectiveRoleInOrg(user.organizationId) : null
    const availability = await this.layoutService.availabilityFor(user, role)

    await this.layoutService.save(user, payload, availability)

    session.flash('success', i18n.t('flash.dashboard.layoutSaved'))
    return response.redirect().back()
  }

  async destroy({ response, session, auth, i18n }: HttpContext) {
    const user = await auth.authenticate()

    await this.layoutService.reset(user)

    session.flash('success', i18n.t('flash.dashboard.layoutReset'))
    return response.redirect().back()
  }
}
