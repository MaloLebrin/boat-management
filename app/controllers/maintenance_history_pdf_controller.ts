import BoatMaintenanceService from '#services/boat_maintenance_service'
import MaintenanceHistoryPdfService from '#services/maintenance_history_pdf_service'
import QuotaService from '#services/quota_service'
import { QuotaExceededError } from '#exceptions/quota_errors'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class MaintenanceHistoryPdfController {
  constructor(
    private maintenanceService: BoatMaintenanceService,
    private pdfService: MaintenanceHistoryPdfService,
    private quotaService: QuotaService
  ) {}

  async download({ request, response, auth, session, i18n }: HttpContext) {
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

    const { events, filters, boatName } = await this.maintenanceService.getHistoryEventsForPdf(
      user,
      request.qs()
    )

    const { buffer, filename } = await this.pdfService.generate(events, filters, boatName, i18n)

    response.header('Content-Type', 'application/pdf')
    response.header('Content-Disposition', `attachment; filename="${filename}"`)
    response.header('Content-Length', String(buffer.length))
    return response.send(buffer)
  }
}
