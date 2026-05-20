import Boat from '#models/boat'
import Mouillage from '#models/mouillage'
import Pontoon from '#models/pontoon'
import Port from '#models/port'
import Spot from '#models/spot'
import type User from '#models/user'

export class PortNotFoundError extends Error {
  name = 'PortNotFoundError'
}

export class PortHasBoatsError extends Error {
  name = 'PortHasBoatsError'
}

export class PontoonHasBoatsError extends Error {
  name = 'PontoonHasBoatsError'
}

export class MouillageHasBoatsError extends Error {
  name = 'MouillageHasBoatsError'
}

export type PortPayload = {
  name: string
  city?: string | null
  country?: string | null
  address?: string | null
  notes?: string | null
}

function assertPortInUserOrg(user: User, port: Port) {
  if (user.organizationId === null || user.organizationId !== port.organizationId) {
    throw new PortNotFoundError()
  }
}

export default class PortService {
  async listForUser(user: User) {
    if (user.organizationId === null) return []

    const ports = await Port.query()
      .where('organizationId', user.organizationId)
      .withCount('pontoons')
      .withCount('mouillages')
      .orderBy('name', 'asc')

    const portIds = ports.map((p) => p.id)
    const boatCounts: Record<number, number> = {}

    if (portIds.length > 0) {
      // Via pontoons -> spots -> boats
      const pontoonRows = await Boat.query()
        .join('spots', 'boats.spot_id', 'spots.id')
        .join('pontoons', 'spots.pontoon_id', 'pontoons.id')
        .whereIn('pontoons.port_id', portIds)
        .groupBy('pontoons.port_id')
        .count('boats.id as count')
        .select('pontoons.port_id as portId')

      for (const row of pontoonRows) {
        const r = row as unknown as { portId: number; count: string }
        boatCounts[r.portId] = (boatCounts[r.portId] ?? 0) + Number(r.count)
      }

      // Via mouillages -> spots -> boats
      const mouillageRows = await Boat.query()
        .join('spots', 'boats.spot_id', 'spots.id')
        .join('mouillages', 'spots.mouillage_id', 'mouillages.id')
        .whereIn('mouillages.port_id', portIds)
        .groupBy('mouillages.port_id')
        .count('boats.id as count')
        .select('mouillages.port_id as portId')

      for (const row of mouillageRows) {
        const r = row as unknown as { portId: number; count: string }
        boatCounts[r.portId] = (boatCounts[r.portId] ?? 0) + Number(r.count)
      }
    }

    return ports.map((p) => ({
      id: p.id,
      name: p.name,
      city: p.city,
      country: p.country,
      address: p.address,
      notes: p.notes,
      pontoonCount: Number(p.$extras['pontoons_count'] ?? 0),
      mouillageCount: Number(p.$extras['mouillages_count'] ?? 0),
      boatCount: boatCounts[p.id] ?? 0,
    }))
  }

  async getWithPontoonsAndMouillagesOrFail(user: User, portId: number) {
    if (user.organizationId === null) throw new PortNotFoundError()

    const port = await Port.query()
      .where('id', portId)
      .where('organizationId', user.organizationId)
      .preload('pontoons', (q) => q.orderBy('name', 'asc'))
      .preload('mouillages', (q) => q.orderBy('name', 'asc'))
      .first()

    if (!port) throw new PortNotFoundError()

    const pontoonIds = port.pontoons.map((pt) => pt.id)
    const mouillageIds = port.mouillages.map((m) => m.id)

    // Fetch all spots for this port
    const allSpots = [
      ...(pontoonIds.length > 0
        ? await Spot.query().whereIn('pontoonId', pontoonIds).orderBy('name')
        : []),
      ...(mouillageIds.length > 0
        ? await Spot.query().whereIn('mouillageId', mouillageIds).orderBy('name')
        : []),
    ]

    const spotIds = allSpots.map((s) => s.id)
    const spotBoats =
      spotIds.length > 0
        ? await Boat.query().whereIn('spotId', spotIds).select('id', 'name', 'spot_id')
        : []

    const boatBySpot: Record<number, { id: number; name: string } | undefined> = {}
    for (const b of spotBoats) {
      if (b.spotId !== null) {
        boatBySpot[b.spotId] = { id: b.id, name: b.name }
      }
    }

    return {
      id: port.id,
      name: port.name,
      city: port.city,
      country: port.country,
      address: port.address,
      notes: port.notes,
      pontoons: port.pontoons.map((pt) => ({
        id: pt.id,
        name: pt.name,
        description: pt.description,
        positionX: pt.positionX,
        positionY: pt.positionY,
        spots: allSpots
          .filter((s) => s.pontoonId === pt.id)
          .map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            boat: boatBySpot[s.id] ?? null,
          })),
      })),
      mouillages: port.mouillages.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        positionX: m.positionX,
        positionY: m.positionY,
        spots: allSpots
          .filter((s) => s.mouillageId === m.id)
          .map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            boat: boatBySpot[s.id] ?? null,
          })),
      })),
    }
  }

  async createForUser(user: User, payload: PortPayload) {
    if (user.organizationId === null) {
      throw new Error('User must belong to an organization to create ports')
    }

    return await Port.create({
      organizationId: user.organizationId,
      name: payload.name,
      city: payload.city ?? null,
      country: payload.country ?? null,
      address: payload.address ?? null,
      notes: payload.notes ?? null,
    })
  }

  async updateForUser(user: User, port: Port, payload: PortPayload) {
    assertPortInUserOrg(user, port)

    port.name = payload.name
    port.city = payload.city ?? null
    port.country = payload.country ?? null
    port.address = payload.address ?? null
    port.notes = payload.notes ?? null

    await port.save()
    return port
  }

  async deleteForUser(user: User, port: Port) {
    assertPortInUserOrg(user, port)

    const pontoons = await Pontoon.query().where('portId', port.id).select('id')
    const pontoonIds = pontoons.map((p) => p.id)

    const mouillages = await Mouillage.query().where('portId', port.id).select('id')
    const mouillageIds = mouillages.map((m) => m.id)

    // Fetch all spots associated with this port via pontoons or mouillages
    const spotIds: number[] = []
    if (pontoonIds.length > 0) {
      const pontoonSpots = await Spot.query().whereIn('pontoonId', pontoonIds).select('id')
      spotIds.push(...pontoonSpots.map((s) => s.id))
    }
    if (mouillageIds.length > 0) {
      const mouillageSpots = await Spot.query().whereIn('mouillageId', mouillageIds).select('id')
      spotIds.push(...mouillageSpots.map((s) => s.id))
    }

    if (spotIds.length > 0) {
      const result = await Boat.query().whereIn('spotId', spotIds).count('id as count').first()

      if (Number(result?.$extras['count'] ?? 0) > 0) throw new PortHasBoatsError()
    }

    await port.delete()
  }
}
