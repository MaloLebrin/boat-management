import { inject } from '@adonisjs/core'
import type { DateTime } from 'luxon'
import BoatPortStay from '#models/boat_port_stay'
import type Boat from '#models/boat'

@inject()
export default class BoatPortStayService {
  async listForBoat(boat: Boat): Promise<BoatPortStay[]> {
    return BoatPortStay.query().where('boat_id', boat.id).orderBy('started_at', 'desc')
  }

  async create(
    boat: Boat,
    data: {
      portName: string
      startedAt: DateTime
      endedAt?: DateTime | null
      cost?: number | null
      notes?: string | null
    }
  ): Promise<BoatPortStay> {
    return BoatPortStay.create({
      boatId: boat.id,
      portName: data.portName,
      startedAt: data.startedAt,
      endedAt: data.endedAt ?? null,
      cost: data.cost != null ? String(data.cost) : null,
      notes: data.notes ?? null,
    })
  }

  async delete(boat: Boat, stayId: number): Promise<void> {
    await BoatPortStay.query().where('id', stayId).where('boat_id', boat.id).delete()
  }
}
