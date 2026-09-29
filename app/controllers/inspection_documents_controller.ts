import {
  BoatInspectionLockedError,
  BoatInspectionNoClientEmailError,
  BoatInspectionNotFoundError,
  BoatInspectionNotSignedError,
  BoatInspectionValidationError,
} from '#exceptions/inspection_errors'
import InspectionPolicy from '#policies/inspection_policy'
import BoatContextService from '#services/boat_context_service'
import BoatInspectionService from '#services/boat_inspection_service'
import InspectionDocumentService from '#services/inspection_document_service'
import OrganizationService from '#services/organization_service'
import { signBoatInspectionValidator } from '#validators/boat_inspection'
import { contentDisposition } from '#shared/helpers/content_disposition'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/** Erreurs métier de l'état des lieux signé → clé de flash (#889). */
function flashKeyFor(error: unknown): string | null {
  if (error instanceof BoatInspectionNotFoundError) return 'flash.inspections.notFound'
  if (error instanceof BoatInspectionLockedError) return 'flash.inspections.locked'
  if (error instanceof BoatInspectionNotSignedError) return 'flash.inspections.notSigned'
  if (error instanceof BoatInspectionNoClientEmailError) return 'flash.inspections.noClientEmail'
  if (error instanceof BoatInspectionValidationError) {
    return `flash.inspections.${error.errorCode}`
  }
  return null
}

/**
 * PDF d'état des lieux, signature sur place et envoi au client (#889).
 * Lecture du PDF : `inspections.view` ; signer et envoyer : `inspections.edit`.
 */
@inject()
export default class InspectionDocumentsController {
  constructor(
    private boatContext: BoatContextService,
    private inspectionService: BoatInspectionService,
    private documentService: InspectionDocumentService,
    private organizationService: OrganizationService
  ) {}

  /** `GET …/inspections/:inspectionId/pdf` — archive signée, sinon brouillon. */
  async pdf(ctx: HttpContext) {
    const { request, response, auth, params, bouncer, i18n } = ctx
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const loaded = await this.boatContext.resolveBoatAndReservation({ auth, params, response })
    if (!loaded) return
    const { boat, reservation } = loaded
    await bouncer.with(InspectionPolicy).authorize('view', reservation)

    let inspection
    try {
      inspection = await this.inspectionService.findForReservation(
        user,
        reservation,
        Number(params.inspectionId)
      )
    } catch (error) {
      return this.#fail(ctx, error, `/boats/${boat.id}/reservations/${reservation.id}/inspection`)
    }

    const org = await this.organizationService.findOrFail(boat.organizationId)
    const { buffer, filename } = await this.documentService.pdfFor(
      inspection,
      reservation,
      org,
      i18n
    )

    response.header('Content-Type', 'application/pdf')
    response.header(
      'Content-Disposition',
      contentDisposition(filename, { inline: request.input('inline') === '1' })
    )
    response.header('Content-Length', String(buffer.length))
    return response.send(buffer)
  }

  /** `POST …/inspections/:inspectionId/sign` — les deux tracés, puis le verrou. */
  async sign(ctx: HttpContext) {
    const { request, response, auth, params, bouncer, session, i18n } = ctx
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const loaded = await this.boatContext.resolveBoatAndReservation({ auth, params, response })
    if (!loaded) return
    const { boat, reservation } = loaded
    await bouncer.with(InspectionPolicy).authorize('edit', reservation)

    const payload = await request.validateUsing(signBoatInspectionValidator)
    const org = await this.organizationService.findOrFail(boat.organizationId)

    try {
      const inspection = await this.inspectionService.findForReservation(
        user,
        reservation,
        Number(params.inspectionId)
      )
      await this.documentService.sign(user, inspection, reservation, payload, org, i18n)
    } catch (error) {
      return this.#fail(ctx, error)
    }

    session.flash('success', i18n.t('flash.inspections.signed'))
    return response.redirect().back()
  }

  /** `POST …/inspections/:inspectionId/send` — le PDF signé au client, par e-mail. */
  async send(ctx: HttpContext) {
    const { response, auth, params, bouncer, session, i18n } = ctx
    await auth.authenticate()
    const user = auth.getUserOrFail()

    const loaded = await this.boatContext.resolveBoatAndReservation({ auth, params, response })
    if (!loaded) return
    const { reservation } = loaded
    await bouncer.with(InspectionPolicy).authorize('edit', reservation)

    let to
    try {
      const inspection = await this.inspectionService.findForReservation(
        user,
        reservation,
        Number(params.inspectionId)
      )
      to = await this.documentService.send(inspection, reservation, i18n.locale)
    } catch (error) {
      return this.#fail(ctx, error)
    }

    session.flash('success', i18n.t('flash.inspections.sent', { email: to }))
    return response.redirect().back()
  }

  #fail({ response, session, i18n }: HttpContext, error: unknown, redirectTo?: string) {
    const key = flashKeyFor(error)
    if (!key) throw error
    session.flash('error', i18n.t(key))
    return redirectTo ? response.redirect(redirectTo) : response.redirect().back()
  }
}
