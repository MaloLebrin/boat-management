import type User from '#models/user'
import BoatHullService from '#services/boat_hull_service'
import BoatOwnerService from '#services/boat_owner_service'
import BoatPolicy from '#policies/boat_policy'
import { BoatNotFoundError, InvalidBoatOwnerAssignmentError } from '#exceptions/boat_errors'
import { attachBoatOwnerValidator } from '#validators/boat_owner'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class BoatOwnersController {
  constructor(
    private boatService: BoatHullService,
    private boatOwnerService: BoatOwnerService
  ) {}

  async store({ request, response, auth, bouncer, params, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boat = await this.#boatOrRedirect(response, user, Number(params.id))
    if (!boat) return
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

    const boat = await this.#boatOrRedirect(response, user, Number(params.id))
    if (!boat) return
    await bouncer.with(BoatPolicy).authorize('manage', boat)

    await this.boatOwnerService.detachOwner(boat, Number(params.userId))

    session.flash('success', i18n.t('flash.owner.detached'))
    return response.redirect().back()
  }

  /**
   * Bateau d'une autre organisation : invisible, comme les autres routes
   * `/boats/:id`. Sans ce rattrapage, `BoatNotFoundError` part au handler
   * global et la route répond 500 (#855).
   */
  async #boatOrRedirect(response: HttpContext['response'], user: User, boatId: number) {
    try {
      return await this.boatService.getForUserOrFail(user, boatId)
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        response.redirect('/boats')
        return null
      }
      throw error
    }
  }
}
