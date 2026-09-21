import { BoatIncidentNotFoundError } from '#exceptions/incident_errors'
import { MediaNotFoundError } from '#exceptions/media_errors'
import IncidentPolicy from '#policies/incident_policy'
import BoatContextService from '#services/boat_context_service'
import BoatIncidentService from '#services/boat_incident_service'
import { CloudinaryFolders } from '#services/cloudinary_service'
import MediaService from '#services/media_service'
import OrganizationService from '#services/organization_service'
import { storeBoatPhotosValidator } from '#validators/media'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Photos d'un incident (#814). Distinct de `BoatEquipmentMediaController` :
 * l'autorisation passe par `IncidentPolicy.edit`, pas `BoatPolicy.edit`, et
 * l'incident n'est pas un équipement. Deux gardes IDOR, comme pour les
 * équipements : l'incident doit être du bateau (scopé à l'organisation), et
 * le média doit être de cet incident précis.
 */
@inject()
export default class BoatIncidentMediaController {
  constructor(
    private boatContext: BoatContextService,
    private incidentService: BoatIncidentService,
    private mediaService: MediaService,
    private organizationService: OrganizationService
  ) {}

  /** Renvoie `null` une fois la redirection émise : l'appelant s'arrête là. */
  private async authorize(ctx: HttpContext) {
    await ctx.auth.authenticate()
    const loaded = await this.boatContext.resolveBoat(ctx)
    if (!loaded) return null

    const { boat, user } = loaded
    await ctx.bouncer.with(IncidentPolicy).authorize('edit', boat)

    let incidentId: number
    try {
      const incident = await this.incidentService.findForBoat(
        user,
        boat,
        Number(ctx.params.incidentId)
      )
      incidentId = incident.id
    } catch (error) {
      if (error instanceof BoatIncidentNotFoundError) {
        ctx.response.redirect(`/boats/${boat.id}?tab=incidents`)
        return null
      }
      throw error
    }

    const org = await this.organizationService.findOrFail(boat.organizationId)
    return {
      user,
      org,
      incidentId,
      photoFolder: CloudinaryFolders.boatIncidentPhotos(org.slug, boat.id, incidentId),
      photosUrl: `/boats/${boat.id}/incidents/${incidentId}`,
    }
  }

  async store(ctx: HttpContext) {
    const authorized = await this.authorize(ctx)
    if (!authorized) return

    const { user, org, incidentId, photoFolder, photosUrl } = authorized
    const payload = await ctx.request.validateUsing(storeBoatPhotosValidator)

    const { uploaded, failed } = await this.mediaService.uploadMany(
      user,
      payload.files,
      {
        folder: photoFolder,
        entityType: 'boat_incident',
        entityId: incidentId,
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
    ctx.response.redirect(photosUrl)
  }

  async destroy(ctx: HttpContext) {
    const authorized = await this.authorize(ctx)
    if (!authorized) return

    const { org, incidentId, photosUrl } = authorized
    const mediaId = Number(ctx.params.mediaId)

    // Seconde garde IDOR : la ligne média doit appartenir à cet incident précis.
    const media = await this.mediaService.getForEntity(mediaId, 'boat_incident', incidentId)
    if (!media) {
      ctx.response.redirect(photosUrl)
      return
    }

    try {
      await this.mediaService.deleteForEntity(mediaId, 'boat_incident', incidentId, org)
    } catch (error) {
      if (error instanceof MediaNotFoundError) {
        ctx.response.redirect(photosUrl)
        return
      }
      throw error
    }

    ctx.session.flash('success', ctx.i18n.t('flash.media.deleted'))
    ctx.response.redirect(photosUrl)
  }
}
