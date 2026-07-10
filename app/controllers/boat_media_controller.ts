import BoatPolicy from '#policies/boat_policy'
import InspectionPolicy from '#policies/inspection_policy'
import BoatService, { BoatNotFoundError } from '#services/boat_service'
import BoatReservationService from '#services/boat_reservation_service'
import BoatInspectionService from '#services/boat_inspection_service'
import { BoatInspectionNotFoundError } from '#exceptions/inspection_errors'
import MediaService, { MediaNotFoundError } from '#services/media_service'
import OrganizationService from '#services/organization_service'
import { CloudinaryFolders, CloudinaryService } from '#services/cloudinary_service'
import { storeBoatPhotosValidator, storeBoatDocumentsValidator } from '#validators/media'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

function buildContentDisposition(filename: string, format: string): string {
  const full = `${filename}.${format}`
  // Strip control characters (CR, LF, NUL, etc.) and quotes to prevent header splitting
  // eslint-disable-next-line no-control-regex
  const ascii = full.replace(/[\x00-\x1f\x7f"\\]/g, '_')
  const encoded = encodeURIComponent(full)
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`
}

@inject()
export default class BoatMediaController {
  constructor(
    private boatService: BoatService,
    private mediaService: MediaService,
    private cloudinaryService: CloudinaryService,
    private organizationService: OrganizationService,
    private reservationService: BoatReservationService,
    private inspectionService: BoatInspectionService
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

  async storePhoto({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoat({ auth, response, params })
    if (!loaded) return

    const { boat, user } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)

    const payload = await request.validateUsing(storeBoatPhotosValidator)
    const org = await this.organizationService.findOrFail(boat.organizationId)

    const { uploaded, failed } = await this.mediaService.uploadMany(
      user,
      payload.files,
      {
        folder: CloudinaryFolders.boatPhotos(org.slug, boat.id),
        entityType: 'boat',
        entityId: boat.id,
        kind: 'photo',
        caption: payload.caption ?? null,
      },
      org
    )

    if (failed.length === 0) {
      session.flash(
        'success',
        i18n.t('flash.media.photosAdded', { count: String(uploaded.length) })
      )
    } else if (uploaded.length > 0) {
      session.flash(
        'success',
        i18n.t('flash.media.photosAddedPartial', {
          succeeded: String(uploaded.length),
          failed: String(failed.length),
        })
      )
    } else {
      session.flash('error', i18n.t('flash.media.photosAddFailed'))
    }
    response.redirect(`/boats/${boat.id}?tab=overview`)
  }

  async storeDocument({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoat({ auth, response, params })
    if (!loaded) return

    const { boat, user } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)

    const payload = await request.validateUsing(storeBoatDocumentsValidator)
    const org = await this.organizationService.findOrFail(boat.organizationId)

    const { uploaded, failed } = await this.mediaService.uploadMany(
      user,
      payload.files,
      {
        folder: CloudinaryFolders.boatDocuments(org.slug, boat.id),
        entityType: 'boat',
        entityId: boat.id,
        kind: 'document',
        caption: payload.caption ?? null,
      },
      org
    )

    if (failed.length === 0) {
      session.flash(
        'success',
        i18n.t('flash.media.documentsAdded', { count: String(uploaded.length) })
      )
    } else if (uploaded.length > 0) {
      session.flash(
        'success',
        i18n.t('flash.media.documentsAddedPartial', {
          succeeded: String(uploaded.length),
          failed: String(failed.length),
        })
      )
    } else {
      session.flash('error', i18n.t('flash.media.documentsAddFailed'))
    }
    response.redirect(`/boats/${boat.id}?tab=documents`)
  }

  async destroy({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoat({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)

    const org = await this.organizationService.findOrFail(boat.organizationId)

    try {
      await this.mediaService.deleteForEntity(Number(params.mediaId), 'boat', boat.id, org)
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
    await bouncer.with(BoatPolicy).authorize('edit', boat)

    const engineId = Number(params.engineId)
    const engine = boat.engines.find((e) => e.id === engineId)
    if (!engine) {
      response.redirect(`/boats/${boat.id}`)
      return
    }

    const payload = await request.validateUsing(storeBoatDocumentsValidator)
    const org = await this.organizationService.findOrFail(boat.organizationId)

    const { uploaded, failed } = await this.mediaService.uploadMany(
      user,
      payload.files,
      {
        folder: CloudinaryFolders.boatEngineDocuments(org.slug, boat.id, engineId),
        entityType: 'boat_engine',
        entityId: engineId,
        kind: 'document',
        caption: payload.caption ?? null,
      },
      org
    )

    if (failed.length === 0) {
      session.flash(
        'success',
        i18n.t('flash.media.documentsAdded', { count: String(uploaded.length) })
      )
    } else if (uploaded.length > 0) {
      session.flash(
        'success',
        i18n.t('flash.media.documentsAddedPartial', {
          succeeded: String(uploaded.length),
          failed: String(failed.length),
        })
      )
    } else {
      session.flash('error', i18n.t('flash.media.documentsAddFailed'))
    }
    response.redirect(`/boats/${boat.id}/engines/${engineId}?tab=documents`)
  }

  async destroyEngineMedia({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoat({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)

    const engineId = Number(params.engineId)
    const engine = boat.engines.find((e) => e.id === engineId)
    if (!engine) {
      response.redirect(`/boats/${boat.id}`)
      return
    }

    const mediaId = Number(params.mediaId)
    const media = await this.mediaService.getForEntity(mediaId, 'boat_engine', engineId)

    if (!media) {
      response.redirect(`/boats/${boat.id}/engines/${engineId}?tab=documents`)
      return
    }

    const org = await this.organizationService.findOrFail(boat.organizationId)

    try {
      await this.mediaService.deleteForEntity(mediaId, 'boat_engine', engineId, org)
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

  async storeInspectionPhoto({
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
    const reservation = await this.reservationService.findForBoat(
      user,
      boat,
      Number(params.reservationId)
    )
    if (!reservation) {
      session.flash('error', i18n.t('flash.reservation.notFound'))
      response.redirect(`/boats/${boat.id}/reservations`)
      return
    }

    await bouncer.with(InspectionPolicy).authorize('edit', reservation)

    const inspectionId = Number(params.inspectionId)
    let inspection
    try {
      inspection = await this.inspectionService.findForReservation(user, reservation, inspectionId)
    } catch (error) {
      if (error instanceof BoatInspectionNotFoundError) {
        session.flash('error', i18n.t('flash.inspections.notFound'))
        response.redirect(`/boats/${boat.id}/reservations/${reservation.id}/inspection`)
        return
      }
      throw error
    }

    const payload = await request.validateUsing(storeBoatPhotosValidator)
    const org = await this.organizationService.findOrFail(boat.organizationId)

    const { uploaded, failed } = await this.mediaService.uploadMany(
      user,
      payload.files,
      {
        folder: CloudinaryFolders.inspectionPhotos(
          org.slug,
          boat.id,
          reservation.id,
          inspection.kind
        ),
        entityType: 'inspection',
        entityId: inspection.id,
        kind: 'photo',
        caption: payload.caption ?? null,
      },
      org
    )

    if (failed.length === 0) {
      session.flash(
        'success',
        i18n.t('flash.media.photosAdded', { count: String(uploaded.length) })
      )
    } else if (uploaded.length > 0) {
      session.flash(
        'success',
        i18n.t('flash.media.photosAddedPartial', {
          succeeded: String(uploaded.length),
          failed: String(failed.length),
        })
      )
    } else {
      session.flash('error', i18n.t('flash.media.photosAddFailed'))
    }
    response.redirect(`/boats/${boat.id}/reservations/${reservation.id}/inspection`)
  }

  async destroyInspectionMedia({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoat({ auth, response, params })
    if (!loaded) return

    const { boat, user } = loaded
    const reservation = await this.reservationService.findForBoat(
      user,
      boat,
      Number(params.reservationId)
    )
    if (!reservation) {
      session.flash('error', i18n.t('flash.reservation.notFound'))
      response.redirect(`/boats/${boat.id}/reservations`)
      return
    }

    await bouncer.with(InspectionPolicy).authorize('delete', reservation)

    const inspectionId = Number(params.inspectionId)
    try {
      await this.inspectionService.findForReservation(user, reservation, inspectionId)
    } catch (error) {
      if (error instanceof BoatInspectionNotFoundError) {
        session.flash('error', i18n.t('flash.inspections.notFound'))
        response.redirect(`/boats/${boat.id}/reservations/${reservation.id}/inspection`)
        return
      }
      throw error
    }

    const org = await this.organizationService.findOrFail(boat.organizationId)

    try {
      await this.mediaService.deleteForEntity(
        Number(params.mediaId),
        'inspection',
        inspectionId,
        org
      )
    } catch (error) {
      if (error instanceof MediaNotFoundError) {
        response.redirect(`/boats/${boat.id}/reservations/${reservation.id}/inspection`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.media.deleted'))
    response.redirect(`/boats/${boat.id}/reservations/${reservation.id}/inspection`)
  }

  async downloadMedia({ response, auth, params }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadBoat({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    const mediaId = Number(params.mediaId)

    const media = await this.mediaService.getForEntity(mediaId, 'boat', boat.id)

    if (!media) {
      response.redirect(`/boats/${boat.id}`)
      return
    }

    const resourceType = media.format === 'pdf' ? 'raw' : 'image'
    const { buffer, contentType } = await this.cloudinaryService.downloadAsBuffer(
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
    const media = await this.mediaService.getForEntity(mediaId, 'boat_engine', engineId)

    if (!media) {
      response.redirect(`/boats/${boat.id}/engines/${engineId}?tab=documents`)
      return
    }

    const resourceType = media.format === 'pdf' ? 'raw' : 'image'
    const { buffer, contentType } = await this.cloudinaryService.downloadAsBuffer(
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
