import BoatPolicy from '#policies/boat_policy'
import InspectionPolicy from '#policies/inspection_policy'
import BoatReservationService from '#services/boat_reservation_service'
import BoatInspectionService from '#services/boat_inspection_service'
import { BoatInspectionNotFoundError } from '#exceptions/inspection_errors'
import MediaService from '#services/media_service'
import { MediaNotFoundError } from '#exceptions/media_errors'
import OrganizationService from '#services/organization_service'
import { CloudinaryFolders, CloudinaryService } from '#services/cloudinary_service'
import { storeBoatPhotosValidator, storeBoatDocumentsValidator } from '#validators/media'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import BoatContextService from '#services/boat_context_service'
import { contentDisposition } from '#shared/helpers/content_disposition'
import { contentTypeForMediaFormat, type MediaKind } from '#shared/constants/media'

@inject()
export default class BoatMediaController {
  constructor(
    private boatContext: BoatContextService,
    private mediaService: MediaService,
    private cloudinaryService: CloudinaryService,
    private organizationService: OrganizationService,
    private reservationService: BoatReservationService,
    private inspectionService: BoatInspectionService
  ) {}

  async storePhoto({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
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
    response.redirect(`/boats/${boat.id}?tab=photos`)
  }

  async storeDocument({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
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
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)

    const org = await this.organizationService.findOrFail(boat.organizationId)

    let kind: MediaKind
    try {
      kind = await this.mediaService.deleteForEntity(Number(params.mediaId), 'boat', boat.id, org)
    } catch (error) {
      if (error instanceof MediaNotFoundError) {
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.media.deleted'))
    // On revient sur l'onglet qui porte le média supprimé (#811)
    response.redirect(`/boats/${boat.id}?tab=${kind === 'photo' ? 'photos' : 'documents'}`)
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
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
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
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
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
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
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

    // État des lieux signé (#889) : ses photos sont celles du PDF, figées.
    if (inspection.lockedAt) {
      session.flash('error', i18n.t('flash.inspections.locked'))
      response.redirect(`/boats/${boat.id}/reservations/${reservation.id}/inspection`)
      return
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
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
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
      const inspection = await this.inspectionService.findForReservation(
        user,
        reservation,
        inspectionId
      )
      // Photos d'un état des lieux signé — et son PDF archivé — restent (#889).
      if (inspection.lockedAt) {
        session.flash('error', i18n.t('flash.inspections.locked'))
        response.redirect(`/boats/${boat.id}/reservations/${reservation.id}/inspection`)
        return
      }
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

  async downloadMedia({ response, auth, params, bouncer }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    // Même seuil que la fiche bateau (#846) : `resolveBoat` ne scope que par
    // organisation, et ni un mechanic ni un boat_owner n'ont `boats.view`.
    await bouncer.with(BoatPolicy).authorize('view', boat)
    const mediaId = Number(params.mediaId)

    const media = await this.mediaService.getForEntity(mediaId, 'boat', boat.id)

    if (!media) {
      response.redirect(`/boats/${boat.id}`)
      return
    }

    const resourceType = media.format === 'pdf' ? 'raw' : 'image'
    const buffer = await this.cloudinaryService.downloadAsBuffer(
      media.cloudinaryPublicId,
      resourceType,
      media.format
    )

    // `attachment` (défaut, pas d'`inline`) fait partie de la garde (#784).
    // Le type vient de l'allowlist sur `media.format`, jamais de Cloudinary.
    // Avant un aperçu dans le navigateur, revoir `contentTypeForMediaFormat`.
    response.header('Content-Type', contentTypeForMediaFormat(media.format))
    response.header(
      'Content-Disposition',
      contentDisposition(`${media.originalFilename}.${media.format}`)
    )
    return response.send(buffer)
  }

  async downloadEngineMedia({ response, auth, params, bouncer }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    // Même seuil que la fiche bateau (#846) : `resolveBoat` ne scope que par
    // organisation, et ni un mechanic ni un boat_owner n'ont `boats.view`.
    await bouncer.with(BoatPolicy).authorize('view', boat)
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
    const buffer = await this.cloudinaryService.downloadAsBuffer(
      media.cloudinaryPublicId,
      resourceType,
      media.format
    )

    // `attachment` (défaut, pas d'`inline`) fait partie de la garde (#784).
    // Le type vient de l'allowlist sur `media.format`, jamais de Cloudinary.
    // Avant un aperçu dans le navigateur, revoir `contentTypeForMediaFormat`.
    response.header('Content-Type', contentTypeForMediaFormat(media.format))
    response.header(
      'Content-Disposition',
      contentDisposition(`${media.originalFilename}.${media.format}`)
    )
    return response.send(buffer)
  }
}
