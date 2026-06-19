import BoatPolicy from '#policies/boat_policy'
import BoatDocumentService from '#services/boat_document_service'
import BoatHullService, { BoatNotFoundError } from '#services/boat_hull_service'
import { BoatDocumentNotFoundError } from '#exceptions/boat_document_errors'
import { createBoatDocumentValidator, updateBoatDocumentValidator } from '#validators/boat_document'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class BoatDocumentsController {
  constructor(
    private boatService: BoatHullService,
    private documentService: BoatDocumentService
  ) {}

  private async loadBoat(ctx: Pick<HttpContext, 'auth' | 'response' | 'params'>) {
    const user = ctx.auth.getUserOrFail()
    try {
      const boat = await this.boatService.getForUserOrFail(user, Number(ctx.params.boatId))
      return { user, boat }
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        ctx.response.redirect('/boats')
        return null
      }
      throw error
    }
  }

  async store({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoat({ auth, response, params })
    if (!loaded) return
    const { user, boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)
    const payload = await request.validateUsing(createBoatDocumentValidator)
    await this.documentService.create(user, boat, payload)
    session.flash('success', i18n.t('flash.boatDocument.created'))
    response.redirect(`/boats/${boat.id}?tab=admin-docs`)
  }

  async update({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoat({ auth, response, params })
    if (!loaded) return
    const { user, boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)
    const payload = await request.validateUsing(updateBoatDocumentValidator)
    try {
      await this.documentService.update(user, boat, Number(params.documentId), payload)
    } catch (error) {
      if (error instanceof BoatDocumentNotFoundError) {
        session.flash('error', i18n.t('flash.boatDocument.notFound'))
        response.redirect(`/boats/${boat.id}?tab=admin-docs`)
        return
      }
      throw error
    }
    session.flash('success', i18n.t('flash.boatDocument.updated'))
    response.redirect(`/boats/${boat.id}?tab=admin-docs`)
  }

  async destroy({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoat({ auth, response, params })
    if (!loaded) return
    const { user, boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)
    try {
      await this.documentService.delete(user, boat, Number(params.documentId))
    } catch (error) {
      if (error instanceof BoatDocumentNotFoundError) {
        session.flash('error', i18n.t('flash.boatDocument.notFound'))
        response.redirect(`/boats/${boat.id}?tab=admin-docs`)
        return
      }
      throw error
    }
    session.flash('success', i18n.t('flash.boatDocument.deleted'))
    response.redirect(`/boats/${boat.id}?tab=admin-docs`)
  }
}
