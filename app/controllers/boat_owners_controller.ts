import BoatService from '#services/boat_service'
import BoatOwnerService from '#services/boat_owner_service'
import BoatPolicy from '#policies/boat_policy'
import { InvalidBoatOwnerAssignmentError } from '#exceptions/boat_errors'
import { attachBoatOwnerValidator } from '#validators/boat_owner'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class BoatOwnersController {
  constructor(
    private boatService: BoatService,
    private boatOwnerService: BoatOwnerService
  ) {}

  async store({ request, response, auth, bouncer, params, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boat = await this.boatService.getForUserOrFail(user, Number(params.id))
    await bouncer.with(BoatPolicy).authorize('manage', boat)

    const { userId } = await request.validateUsing(attachBoatOwnerValidator)

    try {
      await this.boatOwnerService.attachOwner(boat, userId)
    } catch (error) {
      if (error instanceof InvalidBoatOwnerAssignmentError) {
        session.flash('error', i18n.t('flash.owner.invalidAssignment'))
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', i18n.t('flash.owner.attached'))
    return response.redirect().back()
  }

  async destroy({ response, auth, bouncer, params, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boat = await this.boatService.getForUserOrFail(user, Number(params.id))
    await bouncer.with(BoatPolicy).authorize('manage', boat)

    await this.boatOwnerService.detachOwner(boat, Number(params.userId))

    session.flash('success', i18n.t('flash.owner.detached'))
    return response.redirect().back()
  }
}
