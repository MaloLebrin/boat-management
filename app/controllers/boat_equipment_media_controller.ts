import BoatPolicy from '#policies/boat_policy'
import BoatService, { BoatNotFoundError } from '#services/boat_service'
import EquipmentMediaService from '#services/equipment_media_service'
import MediaService, { MediaNotFoundError } from '#services/media_service'
import OrganizationService from '#services/organization_service'
import type { EquipmentMediaSlug } from '#shared/types/equipment_media'
import { storeBoatPhotosValidator } from '#validators/media'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Photos for every equipment kind (engine, engine part, sail, rig, generic,
 * safety). The per-entity knowledge — entity type, Cloudinary folder,
 * ownership check, redirect target — lives in `EquipmentMediaService`.
 */
@inject()
export default class BoatEquipmentMediaController {
  constructor(
    private boatService: BoatService,
    private mediaService: MediaService,
    private organizationService: OrganizationService,
    private equipmentMediaService: EquipmentMediaService
  ) {}

  /**
   * The slug comes from which params the matched route declares, never from
   * user input. Order matters: `partId` is nested under `engineId`.
   */
  private inferSlug(params: Record<string, string>): EquipmentMediaSlug {
    if (params.partId !== undefined) return 'engine-part'
    if (params.engineId !== undefined) return 'engine'
    if (params.sailId !== undefined) return 'sail'
    if (params.genericId !== undefined) return 'generic'
    if (params.safetyId !== undefined) return 'safety'
    return 'rig'
  }

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

  /**
   * Runs the shared chain: authenticate → org-scoped boat → edit policy →
   * resolve + verify equipment ownership. Returns `null` once a redirect has
   * been issued, so callers must bail out.
   */
  private async authorize(ctx: HttpContext) {
    await ctx.auth.authenticate()
    const loaded = await this.loadBoat(ctx)
    if (!loaded) return null

    const { boat, user } = loaded
    await ctx.bouncer.with(BoatPolicy).authorize('edit', boat)

    const org = await this.organizationService.findOrFail(boat.organizationId)
    const resolution = await this.equipmentMediaService.resolve(
      this.inferSlug(ctx.params),
      boat,
      ctx.params,
      org.slug
    )

    if (!resolution.ok) {
      ctx.response.redirect(resolution.redirectTo)
      return null
    }

    return { user, org, resolved: resolution.resolved }
  }

  async store(ctx: HttpContext) {
    const authorized = await this.authorize(ctx)
    if (!authorized) return

    const { user, org, resolved } = authorized
    const payload = await ctx.request.validateUsing(storeBoatPhotosValidator)

    const { uploaded, failed } = await this.mediaService.uploadMany(
      user,
      payload.files,
      {
        folder: resolved.photoFolder,
        entityType: resolved.entityType,
        entityId: resolved.entityId,
        kind: 'photo',
        caption: payload.caption ?? null,
      },
      org
    )

    if (failed.length === 0) {
      ctx.session.flash(
        'success',
        ctx.i18n.t('flash.media.photosAdded', { count: String(uploaded.length) })
      )
    } else if (uploaded.length > 0) {
      ctx.session.flash(
        'success',
        ctx.i18n.t('flash.media.photosAddedPartial', {
          succeeded: String(uploaded.length),
          failed: String(failed.length),
        })
      )
    } else {
      ctx.session.flash('error', ctx.i18n.t('flash.media.photosAddFailed'))
    }
    ctx.response.redirect(resolved.photosUrl)
  }

  async destroy(ctx: HttpContext) {
    const authorized = await this.authorize(ctx)
    if (!authorized) return

    const { org, resolved } = authorized
    const mediaId = Number(ctx.params.mediaId)

    // Second IDOR layer: the media row must belong to this exact equipment.
    const media = await this.mediaService.getForEntity(
      mediaId,
      resolved.entityType,
      resolved.entityId
    )
    if (!media) {
      ctx.response.redirect(resolved.photosUrl)
      return
    }

    try {
      await this.mediaService.deleteForEntity(mediaId, resolved.entityType, resolved.entityId, org)
    } catch (error) {
      if (error instanceof MediaNotFoundError) {
        ctx.response.redirect(resolved.photosUrl)
        return
      }
      throw error
    }

    ctx.session.flash('success', ctx.i18n.t('flash.media.deleted'))
    ctx.response.redirect(resolved.photosUrl)
  }
}
