import { BoatStatusUnchangedError } from '#exceptions/boat_errors'
import type Boat from '#models/boat'
import BoatStatusChange from '#models/boat_status_change'
import type User from '#models/user'
import QuotaService from '#services/quota_service'
import type { ChangeBoatStatusPayload } from '#shared/types/boat_status'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

const HISTORY_LIMIT = 20

/**
 * Changement de statut d'un bateau (#870) : met à jour le bateau et écrit une
 * ligne d'historique dans la même transaction. Audit et notifications restent
 * au contrôleur, comme pour les autres gestes tracés.
 */
@inject()
export default class BoatStatusService {
  constructor(private quotaService: QuotaService) {}

  async change(user: User, boat: Boat, payload: ChangeBoatStatusPayload) {
    if (payload.status === boat.status) throw new BoatStatusUnchangedError()

    // Un bateau vendu ne compte plus dans le quota : le remettre en flotte,
    // c'est en ajouter un — même plafond qu'à la création.
    if (boat.status === 'sold') {
      await user.load('organization')
      await this.quotaService.assertCanAddBoat(user.organization)
    }

    const fromStatus = boat.status
    const reason = payload.reason?.trim() || null

    return db.transaction(async (trx) => {
      const change = await BoatStatusChange.create(
        {
          boatId: boat.id,
          organizationId: boat.organizationId,
          fromStatus,
          toStatus: payload.status,
          reason,
          userId: user.id,
        },
        { client: trx }
      )

      boat.useTransaction(trx)
      boat.status = payload.status
      boat.statusReason = reason
      boat.statusChangedAt = DateTime.now()
      await boat.save()

      return change
    })
  }

  async listHistory(boat: Boat): Promise<BoatStatusChange[]> {
    return BoatStatusChange.query()
      .where('boatId', boat.id)
      .preload('user', (q) => q.select(['id', 'fullName', 'email']))
      .orderBy('createdAt', 'desc')
      .orderBy('id', 'desc')
      .limit(HISTORY_LIMIT)
  }
}
