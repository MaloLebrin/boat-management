import BoatPolicy from '#policies/boat_policy'
import { toMediaRow } from '#transformers/media_row_transformer'
import BoatEquipmentService from '#services/boat_equipment_service'
import { BoatEquipmentNotFoundError } from '#exceptions/boat_errors'
import MediaService from '#services/media_service'
import { MediaNotFoundError } from '#exceptions/media_errors'
import OrganizationService from '#services/organization_service'
import { CloudinaryFolders, CloudinaryService } from '#services/cloudinary_service'
import { createEnginePartValidator, updateEnginePartValidator } from '#validators/boat_engine_part'
import { storeBoatDocumentsValidator } from '#validators/media'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import BoatContextService from '#services/boat_context_service'
import { initialTabParam } from '#utils/inertia_tab'
import { contentDisposition } from '#shared/helpers/content_disposition'

@inject()
export default class BoatEnginePartsController {
  constructor(
    private boatContext: BoatContextService,
    private equipmentService: BoatEquipmentService,
    private mediaService: MediaService,
    private organizationService: OrganizationService,
    private cloudinaryService: CloudinaryService
  ) {}

  async show({ inertia, request, response, auth, params, bouncer }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return
    const { boat } = loaded

    const engineId = Number(params.engineId)
    const engine = boat.engines.find((e) => e.id === engineId)
    if (!engine) return response.redirect(`/boats/${boat.id}`)

    const partId = Number(params.partId)
    const part = await this.equipmentService.findEnginePart(engineId, partId)
    if (!part) return response.redirect(`/boats/${boat.id}/engines/${engineId}?tab=parts`)

    const canManage = await bouncer.with(BoatPolicy).allows('edit', boat)
    const media = await this.mediaService.listForEntity('boat_engine_part', partId)

    return inertia.render('boats/engine_part_show', {
      boat: { id: boat.id, name: boat.name },
      initialTab: initialTabParam(request),
      engine: {
        id: engine.id,
        kind: engine.kind,
        fuel: engine.fuel,
        strokeType: engine.strokeType,
        family: engine.family,
        brand: engine.brand,
        model: engine.model,
        serialNumber: engine.serialNumber,
      },
      part: {
        id: part.id,
        designation: part.designation,
        reference: part.reference,
        stock: part.stock,
        supplier: part.supplier,
        notes: part.notes,
        wearState: part.wearState,
        purchasePrice: part.purchasePrice ? Number.parseFloat(part.purchasePrice) : null,
        purchasedAt: part.purchasedAt ? part.purchasedAt.toISODate() : null,
        documents: media.filter((m) => m.kind === 'document').map(toMediaRow),
        photos: media.filter((m) => m.kind === 'photo').map(toMediaRow),
      },
      canManage,
    })
  }

  async store({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return
    const { user, boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)
    const payload = await request.validateUsing(createEnginePartValidator)
    try {
      await this.equipmentService.createEnginePart(user, boat, Number(params.engineId), payload)
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.enginePart.notFound'))
        response.redirect(`/boats/${boat.id}`)
        return
      }
      throw error
    }
    session.flash('success', i18n.t('flash.enginePart.created'))
    response.redirect(`/boats/${boat.id}/engines/${params.engineId}?tab=parts`)
  }

  async update({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return
    const { user, boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)
    const payload = await request.validateUsing(updateEnginePartValidator)
    try {
      await this.equipmentService.updateEnginePart(
        user,
        boat,
        Number(params.engineId),
        Number(params.partId),
        payload
      )
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.enginePart.notFound'))
        response.redirect(`/boats/${boat.id}/engines/${params.engineId}?tab=parts`)
        return
      }
      throw error
    }
    session.flash('success', i18n.t('flash.enginePart.updated'))
    response.redirect(`/boats/${boat.id}/engines/${params.engineId}/parts/${params.partId}`)
  }

  async destroy({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return
    const { user, boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)
    const org = await this.organizationService.findOrFail(boat.organizationId)
    try {
      await this.equipmentService.deleteEnginePart(
        user,
        boat,
        Number(params.engineId),
        Number(params.partId),
        org
      )
    } catch (error) {
      if (error instanceof BoatEquipmentNotFoundError) {
        session.flash('error', i18n.t('flash.enginePart.notFound'))
        response.redirect(`/boats/${boat.id}/engines/${params.engineId}?tab=parts`)
        return
      }
      throw error
    }
    session.flash('success', i18n.t('flash.enginePart.deleted'))
    response.redirect(`/boats/${boat.id}/engines/${params.engineId}?tab=parts`)
  }

  async storeDocument({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return
    const { boat, user } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)

    const engineId = Number(params.engineId)
    const partId = Number(params.partId)

    const engine = boat.engines.find((e) => e.id === engineId)
    if (!engine) return response.redirect(`/boats/${boat.id}`)

    const part = await this.equipmentService.findEnginePart(engineId, partId)
    if (!part) return response.redirect(`/boats/${boat.id}/engines/${engineId}?tab=parts`)

    const payload = await request.validateUsing(storeBoatDocumentsValidator)
    const org = await this.organizationService.findOrFail(boat.organizationId)

    const { uploaded, failed } = await this.mediaService.uploadMany(
      user,
      payload.files,
      {
        folder: CloudinaryFolders.boatEnginePartDocuments(org.slug, boat.id, engineId, partId),
        entityType: 'boat_engine_part',
        entityId: partId,
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
    response.redirect(`/boats/${boat.id}/engines/${engineId}/parts/${partId}?tab=documents`)
  }

  async destroyMedia({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return
    const { boat } = loaded
    await bouncer.with(BoatPolicy).authorize('edit', boat)

    const engineId = Number(params.engineId)
    const partId = Number(params.partId)
    const mediaId = Number(params.mediaId)

    const engine = boat.engines.find((e) => e.id === engineId)
    if (!engine) return response.redirect(`/boats/${boat.id}`)

    const part = await this.equipmentService.findEnginePart(engineId, partId)
    if (!part) return response.redirect(`/boats/${boat.id}/engines/${engineId}?tab=parts`)

    const media = await this.mediaService.getForEntity(mediaId, 'boat_engine_part', partId)
    if (!media) {
      return response.redirect(
        `/boats/${boat.id}/engines/${engineId}/parts/${partId}?tab=documents`
      )
    }

    const org = await this.organizationService.findOrFail(boat.organizationId)

    try {
      await this.mediaService.deleteForEntity(mediaId, 'boat_engine_part', partId, org)
    } catch (error) {
      if (error instanceof MediaNotFoundError) {
        return response.redirect(
          `/boats/${boat.id}/engines/${engineId}/parts/${partId}?tab=documents`
        )
      }
      throw error
    }

    session.flash('success', i18n.t('flash.media.deleted'))
    response.redirect(`/boats/${boat.id}/engines/${engineId}/parts/${partId}?tab=documents`)
  }

  async downloadMedia({ response, auth, params }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.boatContext.resolveBoat({ auth, response, params })
    if (!loaded) return

    const { boat } = loaded
    const engineId = Number(params.engineId)
    const partId = Number(params.partId)
    const mediaId = Number(params.mediaId)

    const engine = boat.engines.find((e) => e.id === engineId)
    if (!engine) return response.redirect(`/boats/${boat.id}`)

    const part = await this.equipmentService.findEnginePart(engineId, partId)
    if (!part) return response.redirect(`/boats/${boat.id}/engines/${engineId}?tab=parts`)

    const media = await this.mediaService.getForEntity(mediaId, 'boat_engine_part', partId)
    if (!media) {
      return response.redirect(
        `/boats/${boat.id}/engines/${engineId}/parts/${partId}?tab=documents`
      )
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
      contentDisposition(`${media.originalFilename}.${media.format}`)
    )
    return response.send(buffer)
  }
}
