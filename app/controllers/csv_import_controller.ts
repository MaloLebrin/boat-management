import BoatHullService from '#services/boat_hull_service'
import QuotaService from '#services/quota_service'
import OrganizationPolicy from '#policies/organization_policy'
import { BoatNotFoundError } from '#exceptions/boat_errors'
import { parseMaintenanceCsv, importMaintenanceRows } from '#services/csv_import_service'
import { csvPreviewValidator, csvConfirmValidator } from '#validators/csv_import'
import type { CsvImportPreviewData, CsvPreviewRow, MaintenanceImportRow } from '#shared/types/csv'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type User from '#models/user'
import { BILLING_SETTINGS_PATH } from '#shared/constants/billing'
import { promises as fs } from 'node:fs'

interface PendingImport {
  type: 'maintenance'
  boatId: number
  validRows: MaintenanceImportRow[]
}

@inject()
export default class CsvImportController {
  constructor(
    private boatService: BoatHullService,
    private quotaService: QuotaService
  ) {}

  /**
   * L'écran `/settings/import` sert **deux** fonctions : les exports CSV
   * (`canExport`, ouvert dès le plan Pro et à tous les rôles) et l'import
   * d'historique (Entreprise + admin). Il reste donc ouvert à qui n'a que les
   * exports — c'est `canImport` qui décide de la section d'import, côté front
   * comme sur les trois routes qui agissent. Personne n'y arrive les mains
   * vides : sans l'un ni l'autre, on repart sur la facturation avec l'upsell.
   */
  async show({ inertia, session, auth, bouncer, response, i18n }: HttpContext) {
    const user = await auth.authenticate()
    await user.load('organization')

    const canImport =
      this.quotaService.canImport(user.organization) &&
      (await bouncer.with(OrganizationPolicy).allows('runImport'))

    if (!canImport && !this.quotaService.canExport(user.organization)) {
      session.flash('error', i18n.t('flash.quota.exportExceeded'))
      session.flash('errorAction', BILLING_SETTINGS_PATH)
      return response.redirect(BILLING_SETTINGS_PATH)
    }

    const boats = await this.boatService.listForUser(user)
    const rawPreview = session.flashMessages.get('importPreview') as string | undefined

    return inertia.render('settings/import', {
      boats: boats.map((b) => ({ id: b.id, name: b.name })),
      preview: rawPreview ? (JSON.parse(rawPreview) as CsvImportPreviewData) : null,
      hasPendingImport: (session.get('hasPendingImport') ?? false) as boolean,
      canImport,
    })
  }

  /**
   * Garde des trois routes qui agissent (#715) : plan Entreprise **puis**
   * capability `import.run` (admin seul). Avant, seul `middleware.auth()` les
   * couvrait — un `mechanic`, et même un `boat_owner` qui n'a aucune
   * capability, écrivaient en masse dans l'historique d'entretien de n'importe
   * quel bateau de leur organisation.
   *
   * Le plan d'abord : sur une organisation qui n'a pas l'import du tout,
   * l'upsell vers la facturation dit plus qu'un 403 de rôle.
   */
  private async authorizeImport({
    auth,
    bouncer,
  }: Pick<HttpContext, 'auth' | 'bouncer'>): Promise<User> {
    const user = await auth.authenticate()
    await user.load('organization')

    this.quotaService.assertCanImport(user.organization)
    await bouncer.with(OrganizationPolicy).authorize('runImport')

    return user
  }

  async preview({ request, response, session, auth, bouncer, i18n }: HttpContext) {
    const user = await this.authorizeImport({ auth, bouncer })

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

  async confirm({ request, response, session, auth, bouncer, i18n }: HttpContext) {
    const user = await this.authorizeImport({ auth, bouncer })

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
      await importMaintenanceRows(boat.id, pending.validRows, i18n)
    }

    session.forget('pendingImport')
    session.forget('hasPendingImport')
    session.flash(
      'success',
      i18n.t('flash.csv.imported', { count: String(pending.validRows.length) })
    )
    return response.redirect('/settings/import')
  }

  async cancel({ response, session, auth, bouncer }: HttpContext) {
    await this.authorizeImport({ auth, bouncer })

    session.forget('pendingImport')
    session.forget('hasPendingImport')
    return response.redirect('/settings/import')
  }
}
