import BoatHullService from '#services/boat_hull_service'
import QuotaService from '#services/quota_service'
import OrganizationPolicy from '#policies/organization_policy'
import { BoatNotFoundError } from '#exceptions/boat_errors'
import { TableFileUnreadableError } from '#exceptions/csv_errors'
import { prepareImportPreview, runImport } from '#services/csv_import_service'
import { parseUploadedTable } from '#services/table_file_parser_service'
import { csvPreviewValidator, csvConfirmValidator } from '#validators/csv_import'
import {
  type CsvBoatOption,
  type CsvImportPreviewData,
  type CsvImportRows,
  type CsvImportType,
  type CsvPreviewRow,
} from '#shared/types/csv'
import { CSV_IMPORT_MAX_ROWS } from '#shared/constants/csv_import'
import PendingImportModel from '#models/pending_import'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type User from '#models/user'
import { BILLING_SETTINGS_PATH } from '#shared/constants/billing'

@inject()
export default class CsvImportController {
  constructor(
    private boatService: BoatHullService,
    private quotaService: QuotaService
  ) {}

  /**
   * L'écran `/settings/import` sert **deux** fonctions : les exports CSV
   * (`canExport`, ouvert dès le plan Pro et à tous les rôles) et l'import
   * (admin, avec un palier par type : dépenses dès Pro, historique d'entretien
   * en Entreprise — `CSV_IMPORT_PLAN_FLAGS`). Il reste donc ouvert à qui n'a
   * que les exports — `importTypes` liste les types que le plan **et** le rôle
   * autorisent, `canImport` (au moins un) décide de la section d'import, côté
   * front comme sur les trois routes qui agissent. Personne n'y arrive les
   * mains vides : sans import ni export, on repart sur la facturation avec
   * l'upsell.
   *
   * `?type=expenses&boatId=N` présélectionne le formulaire — c'est le
   * raccourci « Importer des dépenses » de la page budget. Un type inconnu ou
   * non autorisé, ou un bateau hors de la flotte de l'utilisateur, sont
   * simplement ignorés.
   */
  async show({ inertia, session, auth, bouncer, response, i18n, request }: HttpContext) {
    const user = await auth.authenticate()
    await user.load('organization')

    const importTypes: CsvImportType[] = (await bouncer
      .with(OrganizationPolicy)
      .allows('runImport'))
      ? this.quotaService.importableTypes(user.organization)
      : []
    const canImport = importTypes.length > 0

    if (!canImport && !this.quotaService.canExport(user.organization)) {
      session.flash('error', i18n.t('flash.quota.exportExceeded'))
      session.flash('errorAction', BILLING_SETTINGS_PATH)
      return response.redirect(BILLING_SETTINGS_PATH)
    }

    const fleet = await this.boatService.listForUser(user)
    const boats: CsvBoatOption[] = fleet.map((b) => ({ id: b.id, name: b.name }))
    const rawPreview = session.flashMessages.get('importPreview') as string | undefined

    // L'attente fait foi en base depuis #774, plus en session : un `confirm`
    // joué dans un autre onglet laissait `hasPendingImport` à `true` et
    // l'écran proposait de confirmer un import déjà consommé.
    const hasPendingImport = canImport
      ? (await PendingImportModel.query().where('userId', user.id).first()) !== null
      : false

    const { initialType, initialBoatId } = this.readPreselection(request.qs(), boats, importTypes)

    return inertia.render('settings/import', {
      boats,
      preview: rawPreview ? (JSON.parse(rawPreview) as CsvImportPreviewData) : null,
      hasPendingImport,
      canImport,
      importTypes,
      initialType,
      initialBoatId,
    })
  }

  private readPreselection(
    qs: Record<string, unknown>,
    boats: CsvBoatOption[],
    importTypes: CsvImportType[]
  ): { initialType: CsvImportType | null; initialBoatId: number | null } {
    const rawType = typeof qs.type === 'string' ? qs.type : null
    const initialType = (importTypes as readonly string[]).includes(rawType ?? '')
      ? (rawType as CsvImportType)
      : null

    const rawBoatId = typeof qs.boatId === 'string' ? Number(qs.boatId) : Number.NaN
    const initialBoatId = boats.some((b) => b.id === rawBoatId) ? rawBoatId : null

    return { initialType, initialBoatId }
  }

  /**
   * Garde des trois routes qui agissent (#715) : plan **puis** capability
   * `import.run` (admin seul). Avant, seul `middleware.auth()` les couvrait —
   * un `mechanic`, et même un `boat_owner` qui n'a aucune capability,
   * écrivaient en masse dans l'historique d'entretien de n'importe quel bateau
   * de leur organisation.
   *
   * Le plan d'abord : sur une organisation qui n'a aucun import (Starter),
   * l'upsell vers la facturation dit plus qu'un 403 de rôle. Le palier du
   * **type** demandé (dépenses dès Pro, historique en Entreprise) se vérifie
   * ensuite par `preview` et `confirm`, une fois le type connu — un admin Pro
   * passe cette garde et se voit refuser un import de maintenance avec le
   * flash dédié, pas un formulaire qui accepte pour rien.
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
    this.quotaService.assertCanImport(user.organization, payload.type)

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

    let table
    try {
      table = await parseUploadedTable(payload.file)
    } catch (error) {
      if (error instanceof TableFileUnreadableError) {
        session.flash('error', i18n.t('flash.csv.fileUnreadable'))
        return response.redirect('/settings/import')
      }
      throw error
    }

    const { previewRows, validRows, totalRows, missingHeaders, tooManyRows, duplicateRows } =
      await prepareImportPreview(payload.type, table, boat.id)

    if (tooManyRows) {
      session.flash(
        'error',
        i18n.t('flash.csv.tooManyRows', {
          count: String(totalRows),
          limit: String(CSV_IMPORT_MAX_ROWS),
        })
      )
      return response.redirect('/settings/import')
    }

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
      status: row.status,
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
      invalidRows: totalRows - validRows.length - duplicateRows,
      duplicateRows,
      rows,
    }

    // Les lignes vont en base, pas en session (#774) : avec
    // `SESSION_DRIVER=cookie`, quelques centaines de lignes dépassaient les
    // ~4 Ko d'un cookie, et l'utilisateur obtenait un aperçu correct suivi
    // d'un `confirm` qui ne trouvait rien — sans message expliquant pourquoi.
    // La session ne garde plus que l'identifiant.
    await PendingImportModel.query().where('userId', user.id).delete()
    const pending = await PendingImportModel.create({
      userId: user.id,
      boatId: boat.id,
      type: payload.type,
      // `prepareImportPreview` renvoie l'union ; la colonne `type` écrite
      // juste au-dessus dit laquelle des deux formes ces lignes ont.
      rows: validRows as CsvImportRows,
    })

    session.put('pendingImportId', pending.id)
    session.put('hasPendingImport', true)
    session.flash('importPreview', JSON.stringify(previewData))

    return response.redirect('/settings/import')
  }

  async confirm({ request, response, session, auth, bouncer, i18n }: HttpContext) {
    const user = await this.authorizeImport({ auth, bouncer })

    await request.validateUsing(csvConfirmValidator)

    const pendingId = session.get('pendingImportId')
    const pending =
      typeof pendingId === 'number'
        ? await PendingImportModel.query()
            .where('id', pendingId)
            // La propriété se prouve en base, pas par la seule session : un
            // identifiant recopié ne doit pas confirmer l'import d'autrui.
            .where('userId', user.id)
            .first()
        : null

    if (!pending) {
      session.flash('error', i18n.t('flash.csv.previewExpired'))
      return response.redirect('/settings/import')
    }

    // Le type en attente se re-vérifie pour son propre compte : une
    // prévisualisation préparée avant un changement de plan ne doit pas
    // écrire un historique que le plan courant refuse.
    this.quotaService.assertCanImport(user.organization, pending.type)

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

    await runImport(pending.type, boat.id, pending.rows, i18n)

    const importedCount = pending.rows.length
    await pending.delete()
    session.forget('pendingImportId')
    session.forget('hasPendingImport')
    session.flash('success', i18n.t('flash.csv.imported', { count: String(importedCount) }))
    return response.redirect('/settings/import')
  }

  async cancel({ response, session, auth, bouncer }: HttpContext) {
    const user = await this.authorizeImport({ auth, bouncer })

    await PendingImportModel.query().where('userId', user.id).delete()
    session.forget('pendingImportId')
    session.forget('hasPendingImport')
    return response.redirect('/settings/import')
  }
}
