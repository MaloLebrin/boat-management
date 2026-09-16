import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { BoatNotFoundError } from '#exceptions/boat_errors'
import type Boat from '#models/boat'
import type BoatReservation from '#models/boat_reservation'
import type User from '#models/user'
import BoatHullService from '#services/boat_hull_service'
import BoatReservationService from '#services/boat_reservation_service'
import type { BoatContext, BoatReservationContext } from '#shared/types/boat_context'

type BoatRouteContext = Pick<HttpContext, 'auth' | 'response' | 'params'>

/**
 * Résolution du bateau désigné par la route, partagée par tous les
 * contrôleurs « sous » un bateau (`/boats/:boatId/…`).
 *
 * Contrat unique, hérité des douze copies de `loadBoat` qu'il remplace : un
 * bateau inexistant ou étranger à l'organisation de l'utilisateur vaut
 * `null` après une redirection vers `/boats` — l'appelant fait
 * `if (!resolved) return`. Toute autre erreur remonte au handler global.
 */
@inject()
export default class BoatContextService {
  constructor(
    private boatService: BoatHullService,
    private reservationService: BoatReservationService
  ) {}

  /**
   * `param` : nom du paramètre de route qui porte l'id (`boatId` par défaut,
   * `id` sur les routes de la ressource bateau elle-même).
   */
  async resolveBoat(
    ctx: BoatRouteContext,
    param = 'boatId'
  ): Promise<BoatContext<User, Boat> | null> {
    const user = ctx.auth.getUserOrFail()
    const boat = await this.findBoat(user, Number(ctx.params[param]), ctx.response)
    return boat ? { user, boat } : null
  }

  /**
   * Bateau + réservation : une réservation absente (ou d'un autre bateau)
   * redirige vers la liste des réservations du bateau.
   */
  async resolveBoatAndReservation(
    ctx: BoatRouteContext,
    params: { boat?: string; reservation?: string } = {}
  ): Promise<BoatReservationContext<User, Boat, BoatReservation> | null> {
    const resolved = await this.resolveBoat(ctx, params.boat)
    if (!resolved) return null

    const reservationId = Number(ctx.params[params.reservation ?? 'reservationId'])
    const reservation = await this.reservationService.findForBoat(
      resolved.user,
      resolved.boat,
      reservationId
    )
    if (!reservation) {
      ctx.response.redirect(`/boats/${resolved.boat.id}/reservations`)
      return null
    }

    return { ...resolved, reservation }
  }

  private async findBoat(
    user: User,
    boatId: number,
    response: HttpContext['response']
  ): Promise<Boat | null> {
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
