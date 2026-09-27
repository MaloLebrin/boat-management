import MaintenancePolicy from '#policies/maintenance_policy'
import BoatMaintenanceService from '#services/boat_maintenance_service'
import BoatHullService from '#services/boat_hull_service'
import { BoatNotFoundError } from '#exceptions/boat_errors'
import MaintenanceLogPdfService from '#services/maintenance_log_pdf_service'
import QuotaService from '#services/quota_service'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { contentDisposition } from '#shared/helpers/content_disposition'

@inject()
export default class MaintenanceLogPdfController {
  constructor(
    private boatService: BoatHullService,
    private maintenanceService: BoatMaintenanceService,
    private pdfService: MaintenanceLogPdfService,
    private quotaService: QuotaService
  ) {}

  async download({ request, response, auth, bouncer, params, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await user.load('organization')

    this.quotaService.assertCanExport(user.organization)

    let boat
    try {
      boat = await this.boatService.getFullDetailForUser(user, Number(params.id))
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        return response.redirect('/boats')
      }
      throw error
    }

    // `getFullDetailForUser` ne scope que par organisation (#845). Le carnet
    // d'entretien relève de la maintenance, pas de la fiche bateau : un
    // mechanic (`maintenance.view` sans `boats.view`) le garde, un boat_owner non.
    await bouncer.with(MaintenancePolicy).authorize('view', boat)

    await boat.load('engines', (q) => q.preload('parts'))

    const events = await this.maintenanceService.listForBoat(boat)
    const eventsAsc = [...events].reverse()

    const { buffer, filename } = await this.pdfService.generate(boat, eventsAsc, i18n)

    const inline = request.input('inline') === '1'
    response.header('Content-Type', 'application/pdf')
    response.header('Content-Disposition', contentDisposition(filename, { inline }))
    response.header('Content-Length', String(buffer.length))
    return response.send(buffer)
  }
}
