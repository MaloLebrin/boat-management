import NavigationService from '#services/navigation_service'
import PortService from '#services/port_service'
import BoatPolicy from '#policies/boat_policy'
import IncidentPolicy from '#policies/incident_policy'
import { boatOwnerPortalRedirect } from '#utils/staff_route_guard'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class NavigationController {
  constructor(
    private navigationService: NavigationService,
    private portService: PortService
  ) {}

  async logbook({ inertia, auth, request, bouncer, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const portalRedirect = await boatOwnerPortalRedirect(user)
    if (portalRedirect) return response.redirect(portalRedirect)

    await bouncer.with(BoatPolicy).authorize('view')

    const boatId = request.qs().boatId ? Number(request.qs().boatId) : undefined
    const [logs, boats, ports] = await Promise.all([
      this.navigationService.getFleetLogbook(user, boatId),
      this.navigationService.getFleetBoats(user),
      this.portService.listNamesForOrg(user),
    ])

    const canCreateNavigationLogs = user.organizationId
      ? await user.hasPermission(user.organizationId, 'navigation_logs.create')
      : false

    return inertia.render('navigation/logbook', {
      logs,
      boats,
      selectedBoatId: boatId ?? null,
      portOptions: ports,
      canCreateNavigationLogs,
    })
  }

  async fuel({ inertia, auth, request, bouncer, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const portalRedirect = await boatOwnerPortalRedirect(user)
    if (portalRedirect) return response.redirect(portalRedirect)

    await bouncer.with(BoatPolicy).authorize('view')

    const boatId = request.qs().boatId ? Number(request.qs().boatId) : undefined
    const [logs, boats] = await Promise.all([
      this.navigationService.getFleetFuelLogs(user, boatId),
      this.navigationService.getFleetBoats(user),
    ])

    return inertia.render('navigation/fuel', { logs, boats, selectedBoatId: boatId ?? null })
  }

  async incidents({ inertia, auth, request, bouncer, response }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const portalRedirect = await boatOwnerPortalRedirect(user)
    if (portalRedirect) return response.redirect(portalRedirect)

    await bouncer.with(IncidentPolicy).authorize('view')

    const boatId = request.qs().boatId ? Number(request.qs().boatId) : undefined
    const [incidents, boats] = await Promise.all([
      this.navigationService.getFleetIncidents(user, boatId),
      this.navigationService.getFleetBoats(user),
    ])

    const canCreateIncidents = user.organizationId
      ? await user.hasPermission(user.organizationId, 'incidents.create')
      : false

    return inertia.render('navigation/incidents', {
      incidents,
      boats,
      selectedBoatId: boatId ?? null,
      canCreateIncidents,
    })
  }
}
