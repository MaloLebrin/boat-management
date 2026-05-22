import { BoatEquipmentNotFoundError } from '#exceptions/boat_errors'
import type Boat from '#models/boat'
import BoatRig from '#models/boat_rig'
import type User from '#models/user'
import type { BoatRigPayload } from '#shared/types/boat'
import { assertBoatInUserOrg, toDateOrNull } from '#utils/boat_utils'
import { inject } from '@adonisjs/core'

export { BoatEquipmentNotFoundError }
export type { BoatRigPayload }

@inject()
export default class BoatRigService {
  async upsert(user: User, boat: Boat, payload: BoatRigPayload) {
    assertBoatInUserOrg(user, boat)

    let rig = await BoatRig.query().where('boatId', boat.id).first()

    if (rig) {
      rig.rigType = payload.rigType
      rig.manufacturedAt = toDateOrNull(payload.manufacturedAt)
      rig.mastCount = payload.mastCount ?? null
      rig.spreaders = payload.spreaders ?? null
      rig.notes = payload.notes ?? null
      await rig.save()
    } else {
      rig = await BoatRig.create({
        boatId: boat.id,
        rigType: payload.rigType,
        manufacturedAt: toDateOrNull(payload.manufacturedAt),
        mastCount: payload.mastCount ?? null,
        spreaders: payload.spreaders ?? null,
        notes: payload.notes ?? null,
      })
    }

    return rig
  }

  async delete(user: User, boat: Boat) {
    assertBoatInUserOrg(user, boat)

    await BoatRig.query().where('boatId', boat.id).delete()
  }
}
