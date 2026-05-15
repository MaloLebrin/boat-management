import Organization from '#models/organization'
import BoatService, { BoatNotFoundError } from '#services/boat_service'
import MediaService, { MediaNotFoundError } from '#services/media_service'
import { CloudinaryFolders } from '#services/cloudinary_service'
import { storeBoatPhotoValidator, storeBoatDocumentValidator } from '#validators/media'
import type { HttpContext } from '@adonisjs/core/http'

export default class BoatMediaController {
  private async loadBoat(ctx: Pick<HttpContext, 'auth' | 'response' | 'params'>) {
    const user = ctx.auth.getUserOrFail()
    const boatService = new BoatService()
    try {
      const boat = await boatService.getForUserOrFail(user, Number(ctx.params.boatId))
      return { user, boat }
    } catch (error) {
      if (error instanceof BoatNotFoundError) {
        ctx.response.redirect('/boats')
        return null
      }
      throw error
    }
  }

  async storePhoto({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoat({ auth, response, params })
    if (!loaded) return

    const { boat, user } = loaded
    await bouncer.authorize('boatUpdate', boat)

    const payload = await request.validateUsing(storeBoatPhotoValidator)
    const org = await Organization.findOrFail(boat.organizationId)

    const mediaService = new MediaService()
    await mediaService.upload(user, payload.file, {
      folder: CloudinaryFolders.boatPhotos(org.slug, boat.id),
      entityType: 'boat',
      entityId: boat.id,
      kind: 'photo',
      caption: payload.caption ?? null,
    })

    session.flash('success', i18n.t('flash.media.photoAdded'))
    response.redirect(`/boats/${boat.id}?tab=overview`)
  }

  async storeDocument({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoat({ auth, response, params })
    if (!loaded) return

    const { boat, user } = loaded
    await bouncer.authorize('boatUpdate', boat)

    const payload = await request.validateUsing(storeBoatDocumentValidator)
    const org = await Organization.findOrFail(boat.organizationId)

    const mediaService = new MediaService()
    await mediaService.upload(user, payload.file, {
      folder: CloudinaryFolders.boatDocuments(org.slug, boat.id),
      entityType: 'boat',
      entityId: boat.id,
      kind: 'document',
      caption: payload.caption ?? null,
    })

    session.flash('success', i18n.t('flash.media.documentAdded'))
    response.redirect(`/boats/${boat.id}?tab=documents`)
  }

  async destroy({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoat({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.authorize('boatUpdate', boat)

    const mediaService = new MediaService()
    try {
      await mediaService.deleteById(Number(params.mediaId))
    } catch (error) {
      if (error instanceof MediaNotFoundError) {
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.media.deleted'))
    response.redirect(`/boats/${boat.id}`)
  }
}
