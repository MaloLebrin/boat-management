import Boat from '#models/boat'
import MarinaStay from '#models/marina_stay'
import MooringContract from '#models/mooring_contract'
import Spot from '#models/spot'
import type Mouillage from '#models/mouillage'
import type Pontoon from '#models/pontoon'
import type Port from '#models/port'
import type User from '#models/user'
import type { SpotPayload } from '#shared/types/spot'
import { SpotHasBoatError, SpotNotFoundError } from '#exceptions/port_errors'
import { SpotHasActiveBookingError } from '#exceptions/marina_errors'
import { MARINA_STAY_ACTIVE_STATUSES } from '#shared/constants/marina'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'

@inject()
export default class SpotService {
  /**
   * Gets a spot for the user's organization or throws SpotNotFoundError.
   */
  async getForUserOrFail(user: User, spotId: number): Promise<Spot> {
    if (user.organizationId === null) throw new SpotNotFoundError()

    const spot = await Spot.query()
      .where('id', spotId)
      .where('organizationId', user.organizationId)
      .first()

    if (!spot) throw new SpotNotFoundError()

    return spot
  }

  /**
   * Les places d'un port, pontons et mouillages confondus (#891). Une place
   * n'a pas de `port_id` : elle se rattache par son ponton ou son mouillage.
   */
  async listForPort(portId: number): Promise<Spot[]> {
    return await Spot.query()
      .where((q) =>
        q
          .whereIn('pontoonId', (sub) => sub.from('pontoons').select('id').where('port_id', portId))
          .orWhereIn('mouillageId', (sub) =>
            sub.from('mouillages').select('id').where('port_id', portId)
          )
      )
      .orderBy('name', 'asc')
  }

  /** Une place de ce port, ou `null` — jamais une place d'un autre port. */
  async findInPort(portId: number, spotId: number): Promise<Spot | null> {
    return await Spot.query()
      .where('id', spotId)
      .where((q) =>
        q
          .whereIn('pontoonId', (sub) => sub.from('pontoons').select('id').where('port_id', portId))
          .orWhereIn('mouillageId', (sub) =>
            sub.from('mouillages').select('id').where('port_id', portId)
          )
      )
      .first()
  }

  async createForPontoon(pontoon: Pontoon, port: Port, payload: SpotPayload) {
    return await Spot.create({
      organizationId: port.organizationId,
      pontoonId: pontoon.id,
      mouillageId: null,
      ...this.#attributes(payload),
    })
  }

  async createForMouillage(mouillage: Mouillage, port: Port, payload: SpotPayload) {
    return await Spot.create({
      organizationId: port.organizationId,
      mouillageId: mouillage.id,
      pontoonId: null,
      ...this.#attributes(payload),
    })
  }

  async update(spot: Spot, payload: SpotPayload) {
    spot.merge(this.#attributes(payload, spot))
    await spot.save()
    return spot
  }

  /**
   * Champs éditables d'une place. Un champ d'exploitation absent du corps
   * (ancien client, formulaire réduit) garde sa valeur — seuls `name` et
   * `description` sont toujours réécrits.
   */
  #attributes(payload: SpotPayload, current?: Spot) {
    const pick = <T>(value: T | null | undefined, previous: T | null | undefined): T | null =>
      value === undefined ? (previous ?? null) : value

    return {
      name: payload.name,
      description: payload.description ?? null,
      lengthM: pick(payload.lengthM, current?.lengthM),
      beamM: pick(payload.beamM, current?.beamM),
      draftM: pick(payload.draftM, current?.draftM),
      kind: payload.kind ?? current?.kind ?? 'annual',
      status: payload.status ?? current?.status ?? 'available',
      dailyRate: pick(payload.dailyRate, current?.dailyRate),
      monthlyRate: pick(payload.monthlyRate, current?.monthlyRate),
      annualRate: pick(payload.annualRate, current?.annualRate),
      notes: pick(payload.notes, current?.notes),
    }
  }

  /**
   * Refuse de supprimer une place occupée (#720), comme `PontoonService.deleteForPort`
   * refuse un ponton occupé : la clé `boats.spot_id` est `ON DELETE SET NULL`,
   * la laisser faire démarrerait le bateau sans le dire et laisserait son
   * séjour à quai ouvert sur une place disparue.
   */
  async delete(spot: Spot) {
    await db.transaction(async (trx) => {
      const occupant = await Boat.query()
        .useTransaction(trx)
        .where('spotId', spot.id)
        .select('id', 'name')
        .first()

      if (occupant) throw new SpotHasBoatError(occupant.name)

      // Une escale attendue ou en cours, un contrat actif : la place est
      // promise à quelqu'un (#891). La cascade effacerait la réservation sans
      // prévenir — l'historique (escales closes, contrats résiliés) suit, lui.
      const activeStay = await MarinaStay.query()
        .useTransaction(trx)
        .where('spotId', spot.id)
        .whereIn('status', [...MARINA_STAY_ACTIVE_STATUSES])
        .select('id')
        .first()
      const activeContract = await MooringContract.query()
        .useTransaction(trx)
        .where('spotId', spot.id)
        .where('status', 'active')
        .select('id')
        .first()
      if (activeStay || activeContract) throw new SpotHasActiveBookingError()

      await spot.useTransaction(trx).delete()
    })
  }
}
