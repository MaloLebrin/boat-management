import BoatPolicy from '#policies/boat_policy'
import AuditLogService from '#services/audit_log_service'
import BoatContextService from '#services/boat_context_service'
import BoatTrashService from '#services/boat_trash_service'
import OrganizationService from '#services/organization_service'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Corbeille des bateaux (#858) : mise à la corbeille, restauration, purge
 * immédiate. Le contrôleur des bateaux garde la liste et la fiche.
 */
@inject()
export default class BoatTrashController {
  constructor(
    private boatContext: BoatContextService,
    private trash: BoatTrashService,
    private auditLogService: AuditLogService,
    private organizationService: OrganizationService
  ) {}

  async destroy({ params, auth, response, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const resolved = await this.boatContext.resolveBoat({ auth, response, params }, 'id')
    if (!resolved) return
    const { user, boat } = resolved

    await bouncer.with(BoatPolicy).authorize('delete', boat)

    const boatName = boat.name
    const boatId = boat.id
    await this.trash.trash(user, boat)

    await this.auditLogService.log({
      organizationId: user.organizationId!,
      userId: user.id,
      action: 'boat.delete',
      entityType: 'boat',
      entityId: boatId,
      metadata: { name: boatName },
    })

    session.flash('success', i18n.t('flash.boat.trashed', { name: boatName }))
    session.flash('successAction', `/boats/${boatId}/restore`)
    response.redirect('/boats')
  }

  async restore({ params, auth, response, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    const boat = await this.trash.findTrashedForUser(user, Number(params.id))
    if (!boat) return response.redirect('/boats')

    await bouncer.with(BoatPolicy).authorize('delete', boat)
    await this.trash.restore(user, boat)

    await this.auditLogService.log({
      organizationId: user.organizationId!,
      userId: user.id,
      action: 'boat.restore',
      entityType: 'boat',
      entityId: boat.id,
      metadata: { name: boat.name },
    })

    session.flash('success', i18n.t('flash.boat.restored', { name: boat.name }))
    response.redirect(`/boats/${boat.id}`)
  }

  async forceDestroy({ params, auth, response, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const user = auth.getUserOrFail()
    const boat = await this.trash.findTrashedForUser(user, Number(params.id))
    if (!boat) return response.redirect('/boats?trashed=1')

    await bouncer.with(BoatPolicy).authorize('delete', boat)

    const org = await this.organizationService.findOrFail(boat.organizationId)
    const boatName = boat.name
    const boatId = boat.id
    await this.trash.forceDelete(user, boat, org)

    await this.auditLogService.log({
      organizationId: user.organizationId!,
      userId: user.id,
      action: 'boat.force_delete',
      entityType: 'boat',
      entityId: boatId,
      metadata: { name: boatName },
    })

    session.flash('success', i18n.t('flash.boat.purged', { name: boatName }))
    response.redirect('/boats?trashed=1')
  }
}
