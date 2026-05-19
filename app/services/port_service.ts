import Boat from '#models/boat'
import Pontoon from '#models/pontoon'
import Port from '#models/port'
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
      .orderBy('name', 'asc')

    const portIds = ports.map((p) => p.id)
    const boatCounts: Record<number, number> = {}

    if (portIds.length > 0) {
      const rows = await Boat.query()
        .join('pontoons', 'boats.pontoon_id', 'pontoons.id')
        .whereIn('pontoons.port_id', portIds)
        .groupBy('pontoons.port_id')
        .count('boats.id as count')
        .select('pontoons.port_id as portId')

      for (const row of rows) {
        const r = row as unknown as { portId: number; count: string }
        boatCounts[r.portId] = Number(r.count)
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
      boatCount: boatCounts[p.id] ?? 0,
    }))
  }

  async getWithPontoonsOrFail(user: User, portId: number) {
    if (user.organizationId === null) throw new PortNotFoundError()

    const port = await Port.query()
      .where('id', portId)
      .where('organizationId', user.organizationId)
      .preload('pontoons', (q) => q.orderBy('name', 'asc'))
      .first()

    if (!port) throw new PortNotFoundError()

    const pontoonIds = port.pontoons.map((pt) => pt.id)
    const boats =
      pontoonIds.length > 0
        ? await Boat.query()
            .whereIn('pontoonId', pontoonIds)
            .select('id', 'name', 'pontoon_id', 'spot_identifier')
        : []

    const boatsByPontoon: Record<number, Array<{ id: number; name: string; spotIdentifier: string | null }>> = {}
    for (const b of boats) {
      if (b.pontoonId !== null) {
        if (!boatsByPontoon[b.pontoonId]) boatsByPontoon[b.pontoonId] = []
        boatsByPontoon[b.pontoonId].push({ id: b.id, name: b.name, spotIdentifier: b.spotIdentifier })
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
        boats: boatsByPontoon[pt.id] ?? [],
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

    if (pontoonIds.length > 0) {
      const result = await Boat.query()
        .whereIn('pontoonId', pontoonIds)
        .count('id as count')
        .first()

      if (Number(result?.$extras['count'] ?? 0) > 0) throw new PortHasBoatsError()
    }

    await port.delete()
  }
}
