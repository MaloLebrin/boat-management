import DataExportService from '#services/data_export_service'
import QuotaService from '#services/quota_service'
import { BILLING_SETTINGS_PATH } from '#shared/constants/billing'
import { EXPORT_ASYNC_THRESHOLD, EXPORT_RETENTION_DAYS } from '#shared/constants/exports'
import { contentDisposition } from '#shared/helpers/content_disposition'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Exports générés en arrière-plan (#879) : liste sur `/settings/exports` et
 * téléchargement par lien signé. Le lien seul ne suffit pas : il faut aussi
 * être connecté en tant que demandeur de l'export.
 */
@inject()
export default class DataExportsController {
  constructor(
    private dataExportService: DataExportService,
    private quotaService: QuotaService
  ) {}

  async index({ inertia, auth, response }: HttpContext) {
    const user = await auth.authenticate()
    await user.load('organization')
    if (!user.organization || !this.quotaService.canExport(user.organization)) {
      return response.redirect(BILLING_SETTINGS_PATH)
    }

    return inertia.render('settings/exports', {
      exports: await this.dataExportService.listForUser(user),
      threshold: EXPORT_ASYNC_THRESHOLD,
      retentionDays: EXPORT_RETENTION_DAYS,
    })
  }

  async download({ auth, request, response, params }: HttpContext) {
    const user = await auth.authenticate()
    if (!request.hasValidSignature('data_export')) {
      return response.notFound()
    }

    const file = await this.dataExportService.findFileForUser(user, Number(params.id))
    if (!file) return response.notFound()

    response.header('Content-Type', file.contentType)
    response.header('Content-Disposition', contentDisposition(file.filename))
    response.header('Content-Length', String(file.buffer.length))
    return response.send(file.buffer)
  }
}
