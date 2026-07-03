import BoatService, { BoatNotFoundError } from '#services/boat_service'
import { parseMaintenanceCsv, importMaintenanceRows } from '#services/csv_import_service'
import { csvPreviewValidator, csvConfirmValidator } from '#validators/csv_import'
import type { CsvImportPreviewData, CsvPreviewRow, MaintenanceImportRow } from '#shared/types/csv'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { promises as fs } from 'node:fs'

interface PendingImport {
  type: 'maintenance'
  boatId: number
  validRows: MaintenanceImportRow[]
}

@inject()
export default class CsvImportController {
  constructor(private boatService: BoatService) {}

  async show({ inertia, session, auth }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const boats = await this.boatService.listForUser(user)
    const rawPreview = session.flashMessages.get('importPreview') as string | undefined

    return inertia.render('settings/import', {
      boats: boats.map((b) => ({ id: b.id, name: b.name })),
      preview: rawPreview ? (JSON.parse(rawPreview) as CsvImportPreviewData) : null,
      hasPendingImport: (session.get('hasPendingImport') ?? false) as boolean,
    })
  }

  async preview({ request, response, session, auth, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const payload = await request.validateUsing(csvPreviewValidator)

    let boat
    try {
      boat = await this.boatService.getForUserOrFail(user, payload.boatId)
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        session.flash('error', i18n.t('flash.csv.boatNotFound'))
        return response.redirect('/settings/import')
      }
      throw error
    }

    const content = await fs.readFile(payload.file.tmpPath!, 'utf-8')
    const { previewRows, validRows, totalRows, missingHeaders } = parseMaintenanceCsv(
      content,
      payload.type
    )

    if (missingHeaders.length > 0) {
      session.flash(
        'error',
        i18n.t('flash.csv.missingHeaders', { headers: missingHeaders.join(', ') })
      )
      return response.redirect('/settings/import')
    }

    const rows: CsvPreviewRow[] = previewRows.slice(0, 50).map((row) => ({
      line: row.line,
      raw: row.raw,
      errors: row.errors.map((error) => ({
        column: error.column,
        message: i18n.t(error.key, error.params),
      })),
    }))

    const previewData: CsvImportPreviewData = {
      type: payload.type,
      boatId: boat.id,
      boatName: boat.name,
      totalRows,
      validRows: validRows.length,
      invalidRows: totalRows - validRows.length,
      rows,
    }

    const pending: PendingImport = { type: payload.type, boatId: boat.id, validRows }
    session.put('pendingImport', pending)
    session.put('hasPendingImport', true)
    session.flash('importPreview', JSON.stringify(previewData))

    return response.redirect('/settings/import')
  }

  async confirm({ request, response, session, auth, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()

    await request.validateUsing(csvConfirmValidator)

    const pending = (session.get('pendingImport') ?? undefined) as PendingImport | undefined
    if (!pending) {
      session.flash('error', i18n.t('flash.csv.previewExpired'))
      return response.redirect('/settings/import')
    }

    let boat
    try {
      boat = await this.boatService.getForUserOrFail(user, pending.boatId)
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        session.flash('error', i18n.t('flash.csv.boatNotFound'))
        return response.redirect('/settings/import')
      }
      throw error
    }

    if (pending.type === 'maintenance') {
      await importMaintenanceRows(boat.id, pending.validRows)
    }

    session.forget('pendingImport')
    session.forget('hasPendingImport')
    session.flash(
      'success',
      i18n.t('flash.csv.imported', { count: String(pending.validRows.length) })
    )
    return response.redirect('/settings/import')
  }

  async cancel({ response, session }: HttpContext) {
    session.forget('pendingImport')
    session.forget('hasPendingImport')
    return response.redirect('/settings/import')
  }
}
