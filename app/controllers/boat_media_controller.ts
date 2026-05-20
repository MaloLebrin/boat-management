import Media from '#models/media'
import Organization from '#models/organization'
import BoatService, { BoatNotFoundError } from '#services/boat_service'
import MediaService, { MediaNotFoundError } from '#services/media_service'
import { CloudinaryFolders, CloudinaryService } from '#services/cloudinary_service'
import { storeBoatPhotoValidator, storeBoatDocumentValidator } from '#validators/media'
import type { HttpContext } from '@adonisjs/core/http'

function buildContentDisposition(filename: string, format: string): string {
  const full = `${filename}.${format}`
  // Strip control characters (CR, LF, NUL, etc.) and quotes to prevent header splitting
  const ascii = full.replace(/[\x00-\x1f\x7f"\\]/g, '_')
  const encoded = encodeURIComponent(full)
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`
}

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

  async storeEngineDocument({
    request,
    response,
    auth,
    params,
    bouncer,
    session,
    i18n,
  }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoat({ auth, response, params })
    if (!loaded) return

    const { boat, user } = loaded
    await bouncer.authorize('boatUpdate', boat)

    const engineId = Number(params.engineId)
    const engine = boat.engines.find((e) => e.id === engineId)
    if (!engine) {
      response.redirect(`/boats/${boat.id}`)
      return
    }

    const payload = await request.validateUsing(storeBoatDocumentValidator)
    const org = await Organization.findOrFail(boat.organizationId)

    const mediaService = new MediaService()
    await mediaService.upload(user, payload.file, {
      folder: CloudinaryFolders.boatEngineDocuments(org.slug, boat.id, engineId),
      entityType: 'boat_engine',
      entityId: engineId,
      kind: 'document',
      caption: payload.caption ?? null,
    })

    session.flash('success', i18n.t('flash.media.documentAdded'))
    response.redirect(`/boats/${boat.id}/engines/${engineId}?tab=documents`)
  }

  async destroyEngineMedia({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoat({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.authorize('boatUpdate', boat)

    const engineId = Number(params.engineId)
    const engine = boat.engines.find((e) => e.id === engineId)
    if (!engine) {
      response.redirect(`/boats/${boat.id}`)
      return
    }

    const mediaId = Number(params.mediaId)
    const media = await Media.query()
      .where('id', mediaId)
      .where('entityType', 'boat_engine')
      .where('entityId', engineId)
      .first()

    if (!media) {
      response.redirect(`/boats/${boat.id}/engines/${engineId}?tab=documents`)
      return
    }

    const mediaService = new MediaService()
    try {
      await mediaService.deleteById(mediaId)
    } catch (error) {
      if (error instanceof MediaNotFoundError) {
        response.redirect(`/boats/${boat.id}/engines/${engineId}?tab=documents`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.media.deleted'))
    response.redirect(`/boats/${boat.id}/engines/${engineId}?tab=documents`)
  }

  async downloadMedia({ response, auth, params }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoat({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    const mediaId = Number(params.mediaId)

    const media = await Media.query()
      .where('id', mediaId)
      .where('entityType', 'boat')
      .where('entityId', boat.id)
      .first()

    if (!media) {
      response.redirect(`/boats/${boat.id}`)
      return
    }

    const cloudinaryService = new CloudinaryService()
    const resourceType = media.format === 'pdf' ? 'raw' : 'image'
    const { buffer, contentType } = await cloudinaryService.downloadAsBuffer(
      media.cloudinaryPublicId,
      resourceType,
      media.format
    )

    response.header('Content-Type', contentType)
    response.header(
      'Content-Disposition',
      buildContentDisposition(media.originalFilename, media.format)
    )
    return response.send(buffer)
  }

  async downloadEngineMedia({ response, auth, params }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoat({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    const engineId = Number(params.engineId)
    const engine = boat.engines.find((e) => e.id === engineId)
    if (!engine) {
      response.redirect(`/boats/${boat.id}`)
      return
    }

    const mediaId = Number(params.mediaId)
    const media = await Media.query()
      .where('id', mediaId)
      .where('entityType', 'boat_engine')
      .where('entityId', engineId)
      .first()

    if (!media) {
      response.redirect(`/boats/${boat.id}/engines/${engineId}?tab=documents`)
      return
    }

    const cloudinaryService = new CloudinaryService()
    const resourceType = media.format === 'pdf' ? 'raw' : 'image'
    const { buffer, contentType } = await cloudinaryService.downloadAsBuffer(
      media.cloudinaryPublicId,
      resourceType,
      media.format
    )

    response.header('Content-Type', contentType)
    response.header(
      'Content-Disposition',
      buildContentDisposition(media.originalFilename, media.format)
    )
    return response.send(buffer)
  }
}
