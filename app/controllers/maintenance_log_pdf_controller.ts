import BoatMaintenanceService from '#services/boat_maintenance_service'
import BoatService, { BoatNotFoundError } from '#services/boat_service'
import MaintenanceLogPdfService from '#services/maintenance_log_pdf_service'
import QuotaService from '#services/quota_service'
import { QuotaExceededError } from '#exceptions/quota_errors'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class MaintenanceLogPdfController {
  constructor(
    private boatService: BoatService,
    private maintenanceService: BoatMaintenanceService,
    private pdfService: MaintenanceLogPdfService,
    private quotaService: QuotaService
  ) {}

  async download({ response, auth, params, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await user.load('organization')

    try {
      this.quotaService.assertCanExport(user.organization)
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        session.flash('error', i18n.t(`flash.quota.exportExceeded`))
        return response.redirect().back()
      }
      throw error
    }

    let boat
    try {
      boat = await this.boatService.getFullDetailForUser(user, Number(params.id))
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        return response.redirect('/boats')
      }
      throw error
    }

    const events = await this.maintenanceService.listForBoat(user, boat)
    const eventsAsc = [...events].reverse()

    const { buffer, filename } = await this.pdfService.generate(boat, eventsAsc)

    response.header('Content-Type', 'application/pdf')
    response.header('Content-Disposition', `attachment; filename="${filename}"`)
    response.header('Content-Length', String(buffer.length))
    return response.send(buffer)
  }
}
