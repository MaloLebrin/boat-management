import { BoatNotFoundError } from '#exceptions/boat_errors'
import Boat from '#models/boat'
import BoatPositionHistory from '#models/boat_position_history'
import type Organization from '#models/organization'
import { onlyTrashed } from '#models/mixins/soft_deletes'
import type User from '#models/user'
import BoatHullService from '#services/boat_hull_service'
import QuotaService from '#services/quota_service'
import { BOAT_TRASH_RETENTION_DAYS } from '#shared/constants/boat_trash'
import { assertBoatInUserOrg } from '#utils/boat_utils'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

/**
 * Corbeille des bateaux (#858). La suppression métier pose `deleted_at` :
 * l'historique reste en base. La purge physique (médias inclus) attend
 * {@link BOAT_TRASH_RETENTION_DAYS} jours, ou un « supprimer définitivement ».
 *
 * Un bateau vendu (#870) n'est pas en corbeille : son historique reste
 * lisible, hors quota. La corbeille le retire de partout.
 */
@inject()
export default class BoatTrashService {
  constructor(
    private hull: BoatHullService,
    private quotaService: QuotaService
  ) {}

  async findTrashedForUser(user: User, boatId: number): Promise<Boat | null> {
    if (user.organizationId === null || !Number.isInteger(boatId) || boatId <= 0) return null
    return onlyTrashed(
      Boat.query().where('id', boatId).where('organizationId', user.organizationId)
    ).first()
  }

  /**
   * Place le bateau en corbeille et libère sa place : un bateau invisible ne
   * doit pas bloquer un emplacement. La place n'est pas rendue à la
   * restauration (elle a pu être réattribuée).
   */
  async trash(user: User, boat: Boat) {
    assertBoatInUserOrg(user, boat)

    await db.transaction(async (trx) => {
      if (boat.spotId !== null) {
        await BoatPositionHistory.closeOpenOfKind(boat.id, 'berth', trx)
      }
      boat.useTransaction(trx)
      boat.spotId = null
      boat.deletedAt = DateTime.now()
      await boat.save()
    })
  }

  /**
   * Ramène le bateau dans la flotte. Hors statut `sold`, il recompte dans le
   * quota — même plafond qu'une création.
   */
  async restore(user: User, boat: Boat) {
    assertBoatInUserOrg(user, boat)
    if (boat.status !== 'sold') {
      await user.load('organization')
      await this.quotaService.assertCanAddBoat(user.organization)
    }
    boat.deletedAt = null
    await boat.save()
  }

  async forceDelete(user: User, boat: Boat, org: Organization) {
    assertBoatInUserOrg(user, boat)
    if (boat.deletedAt === null) throw new BoatNotFoundError()
    await this.hull.purgePhysically(boat, org)
  }

  /** Purge les bateaux en corbeille depuis plus de {@link BOAT_TRASH_RETENTION_DAYS} jours. */
  async purgeExpired(): Promise<number> {
    const cutoff = DateTime.now().minus({ days: BOAT_TRASH_RETENTION_DAYS })
    const boats = await onlyTrashed(Boat.query())
      .where('deletedAt', '<=', cutoff.toSQL()!)
      .preload('organization')

    for (const boat of boats) {
      await this.hull.purgePhysically(boat, boat.organization)
    }
    return boats.length
  }
}
