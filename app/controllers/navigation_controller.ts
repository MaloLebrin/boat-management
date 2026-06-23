import NavigationService from '#services/navigation_service'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class NavigationController {
  constructor(private navigationService: NavigationService) {}

  async logbook({ inertia, auth, request }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boatId = request.qs().boatId ? Number(request.qs().boatId) : undefined
    const [logs, boats] = await Promise.all([
      this.navigationService.getFleetLogbook(user, boatId),
      this.navigationService.getFleetBoats(user),
    ])

    return inertia.render('navigation/logbook', { logs, boats, selectedBoatId: boatId ?? null })
  }

  async fuel({ inertia, auth, request }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boatId = request.qs().boatId ? Number(request.qs().boatId) : undefined
    const [logs, boats] = await Promise.all([
      this.navigationService.getFleetFuelLogs(user, boatId),
      this.navigationService.getFleetBoats(user),
    ])

    return inertia.render('navigation/fuel', { logs, boats, selectedBoatId: boatId ?? null })
  }

  async incidents({ inertia, auth, request }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boatId = request.qs().boatId ? Number(request.qs().boatId) : undefined
    const [incidents, boats] = await Promise.all([
      this.navigationService.getFleetIncidents(user, boatId),
      this.navigationService.getFleetBoats(user),
    ])

    return inertia.render('navigation/incidents', {
      incidents,
      boats,
      selectedBoatId: boatId ?? null,
    })
  }
}
