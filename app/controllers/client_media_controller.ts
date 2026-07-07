import ClientPolicy from '#policies/client_policy'
import ClientService, { ClientNotFoundError } from '#services/client_service'
import MediaService, { MediaNotFoundError } from '#services/media_service'
import QuotaService from '#services/quota_service'
import { QuotaExceededError } from '#exceptions/quota_errors'
import { CloudinaryFolders, CloudinaryService } from '#services/cloudinary_service'
import { storeBoatDocumentValidator } from '#validators/media'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type Client from '#models/client'
import type Organization from '#models/organization'
import type User from '#models/user'

function buildContentDisposition(filename: string, format: string): string {
  const full = `${filename}.${format}`
  // Strip control characters (CR, LF, NUL, etc.) and quotes to prevent header splitting
  // eslint-disable-next-line no-control-regex
  const ascii = full.replace(/[\x00-\x1f\x7f"\\]/g, '_')
  const encoded = encodeURIComponent(full)
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`
}

@inject()
export default class ClientMediaController {
  constructor(
    private clientService: ClientService,
    private mediaService: MediaService,
    private cloudinaryService: CloudinaryService,
    private quotaService: QuotaService
  ) {}

  /**
   * Loads the org (asserting the Enterprise gate) and the org-scoped client, or
   * flashes + redirects and returns null. Mirrors the guards of ClientsController.
   */
  private async loadClient(
    ctx: Pick<HttpContext, 'auth' | 'session' | 'response' | 'i18n' | 'params'>
  ): Promise<{ user: User; org: Organization; client: Client } | null> {
    const user = ctx.auth.getUserOrFail()
    await user.load('organization')

    try {
      this.quotaService.assertCanManageClients(user.organization)
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        ctx.session.flash('error', ctx.i18n.t('flash.quota.clientsExceeded'))
        ctx.response.redirect('/')
        return null
      }
      throw error
    }

    const org = user.organization
    try {
      const client = await this.clientService.getForOrganizationOrFail(org, Number(ctx.params.id))
      return { user, org, client }
    } catch (error) {
      if (error instanceof ClientNotFoundError) {
        ctx.session.flash('error', ctx.i18n.t('flash.clients.notFound'))
        ctx.response.redirect('/clients')
        return null
      }
      throw error
    }
  }

  async storeDocument({ request, response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadClient({ auth, session, response, i18n, params })
    if (!loaded) return

    const { user, org, client } = loaded
    await bouncer.with(ClientPolicy).authorize('update')

    const payload = await request.validateUsing(storeBoatDocumentValidator)

    await this.mediaService.upload(
      user,
      payload.file,
      {
        folder: CloudinaryFolders.clientDocuments(org.slug, client.id),
        entityType: 'client',
        entityId: client.id,
        kind: 'document',
        caption: payload.caption ?? null,
      },
      org
    )

    session.flash('success', i18n.t('flash.clients.documentAdded'))
    response.redirect(`/clients/${client.id}`)
  }

  async destroy({ response, auth, params, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadClient({ auth, session, response, i18n, params })
    if (!loaded) return

    const { org, client } = loaded
    await bouncer.with(ClientPolicy).authorize('update')

    try {
      await this.mediaService.deleteForEntity(Number(params.mediaId), 'client', client.id, org)
    } catch (error) {
      if (error instanceof MediaNotFoundError) {
        response.redirect(`/clients/${client.id}`)
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.clients.documentDeleted'))
    response.redirect(`/clients/${client.id}`)
  }

  async downloadMedia({ response, auth, params, session, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadClient({ auth, session, response, i18n, params })
    if (!loaded) return

    const { client } = loaded
    const media = await this.mediaService.getForEntity(Number(params.mediaId), 'client', client.id)

    if (!media) {
      response.redirect(`/clients/${client.id}`)
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
