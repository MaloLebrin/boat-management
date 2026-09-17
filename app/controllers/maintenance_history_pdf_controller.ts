import BoatMaintenanceService from '#services/boat_maintenance_service'
import MaintenanceHistoryPdfService from '#services/maintenance_history_pdf_service'
import QuotaService from '#services/quota_service'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { contentDisposition } from '#shared/helpers/content_disposition'

@inject()
export default class MaintenanceHistoryPdfController {
  constructor(
    private maintenanceService: BoatMaintenanceService,
    private pdfService: MaintenanceHistoryPdfService,
    private quotaService: QuotaService
  ) {}

  async download({ request, response, auth, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    await user.load('organization')

    this.quotaService.assertCanExport(user.organization)

    const { events, filters, boatName } = await this.maintenanceService.getHistoryEventsForPdf(
      user,
      request.qs()
    )

    const { buffer, filename } = await this.pdfService.generate(events, filters, boatName, i18n)

    response.header('Content-Type', 'application/pdf')
    response.header('Content-Disposition', contentDisposition(filename))
    response.header('Content-Length', String(buffer.length))
    return response.send(buffer)
  }
}
