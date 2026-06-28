import { inject } from '@adonisjs/core'
import type { DateTime } from 'luxon'
import BoatPortStay from '#models/boat_port_stay'
import type Boat from '#models/boat'

@inject()
export default class BoatPortStayService {
  async listForBoat(boat: Boat, year?: number): Promise<BoatPortStay[]> {
    const query = BoatPortStay.query().where('boat_id', boat.id).orderBy('started_at', 'desc')
    if (year) {
      query.whereRaw('EXTRACT(YEAR FROM started_at) = ?', [year])
    }
    return query
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
      cost: data.cost !== null && data.cost !== undefined ? String(data.cost) : null,
      notes: data.notes ?? null,
    })
  }

  async update(
    boat: Boat,
    stayId: number,
    data: {
      portName: string
      startedAt: DateTime
      endedAt?: DateTime | null
      cost?: number | null
      notes?: string | null
    }
  ): Promise<void> {
    await BoatPortStay.query()
      .where('id', stayId)
      .where('boat_id', boat.id)
      .update({
        portName: data.portName,
        startedAt: data.startedAt.toSQLDate()!,
        endedAt: data.endedAt?.toSQLDate() ?? null,
        cost: data.cost !== null && data.cost !== undefined ? String(data.cost) : null,
        notes: data.notes ?? null,
      })
  }

  async delete(boat: Boat, stayId: number): Promise<void> {
    await BoatPortStay.query().where('id', stayId).where('boat_id', boat.id).delete()
  }
}
