import BoatStatusChanged from '#events/boat_status_changed'
import { BoatStatusUnchangedError } from '#exceptions/boat_errors'
import BoatPolicy from '#policies/boat_policy'
import AuditLogService from '#services/audit_log_service'
import BoatContextService from '#services/boat_context_service'
import BoatStatusService from '#services/boat_status_service'
import { changeBoatStatusValidator } from '#validators/boat_status'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Changement de statut d'un bateau (#870) — modale « Changer le statut » de la
 * fiche. Même droit que la modification du bateau (`boats.edit`).
 */
@inject()
export default class BoatStatusController {
  constructor(
    private boatContext: BoatContextService,
    private statusService: BoatStatusService,
    private auditLogService: AuditLogService
  ) {}

  async update({ request, params, auth, response, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const resolved = await this.boatContext.resolveBoat({ auth, response, params }, 'id')
    if (!resolved) return
    const { user, boat } = resolved

    await bouncer.with(BoatPolicy).authorize('edit', boat)

    const payload = await request.validateUsing(changeBoatStatusValidator)

    let change
    try {
      change = await this.statusService.change(user, boat, payload)
    } catch (error) {
      if (error instanceof BoatStatusUnchangedError) {
        session.flash('error', i18n.t('flash.boat.statusUnchanged'))
        return response.redirect().back()
      }
      throw error
    }

    await this.auditLogService.log({
      organizationId: boat.organizationId,
      userId: user.id,
      action: 'boat.status_change',
      entityType: 'boat',
      entityId: boat.id,
      metadata: {
        name: boat.name,
        fromStatus: change.fromStatus,
        toStatus: change.toStatus,
        reason: change.reason,
      },
    })

    await BoatStatusChanged.dispatch(
      boat.organizationId,
      { id: boat.id, name: boat.name },
      change.fromStatus,
      change.toStatus,
      change.reason,
      { id: user.id, name: user.fullName || user.email }
    )

    session.flash('success', i18n.t('flash.boat.statusChanged'))
    return response.redirect().back()
  }
}
