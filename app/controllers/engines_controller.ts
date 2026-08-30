import BoatPolicy from '#policies/boat_policy'
import EngineListService from '#services/engine_list_service'
import { boatOwnerPortalRedirect } from '#utils/staff_route_guard'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Inventaire moteur transverse (#598) — jusqu'ici un moteur ne se consultait
 * qu'en descendant dans la fiche de son bateau. Cet écran liste toute la flotte
 * d'un coup, avec recherche, filtres et tri.
 */
@inject()
export default class EnginesController {
  constructor(private engineListService: EngineListService) {}

  async index({ inertia, auth, request, bouncer, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const portalRedirect = await boatOwnerPortalRedirect(user)
    if (portalRedirect) return response.redirect(portalRedirect)

    // Même capability que la fiche bateau d'où les moteurs sont issus : la liste
    // n'ouvre aucun accès que `/boats/:id` n'accordait pas déjà.
    await bouncer.with(BoatPolicy).authorize('view')

    const { engines, filters, boatOptions, summary } = await this.engineListService.listForUser(
      user,
      request.qs()
    )

    return inertia.render('engines/index', { engines, filters, boatOptions, summary })
  }
}
