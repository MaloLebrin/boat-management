import Boat from '#models/boat'
import Mouillage from '#models/mouillage'
import Pontoon from '#models/pontoon'
import Port from '#models/port'
import Spot from '#models/spot'
import type User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import { PortHasBoatsError, PortNotFoundError } from '#exceptions/port_errors'
import { UserNotInOrganizationError } from '#exceptions/organization_errors'
import type { PortAggRow, PortPayload } from '#shared/types/port'
import { inject } from '@adonisjs/core'

function assertPortInUserOrg(user: User, port: Port) {
  if (user.organizationId === null || user.organizationId !== port.organizationId) {
    throw new PortNotFoundError()
  }
}

@inject()
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
    const spotCounts: Record<number, number> = {}

    if (portIds.length > 0) {
      // Boats via pontoon spots
      const pontoonBoatRows: PortAggRow[] = await db
        .from('boats')
        .join('spots', 'boats.spot_id', 'spots.id')
        .join('pontoons', 'spots.pontoon_id', 'pontoons.id')
        .whereIn('pontoons.port_id', portIds)
        .groupBy('pontoons.port_id')
        .count('boats.id as count')
        .select('pontoons.port_id as port_id')

      for (const r of pontoonBoatRows) {
        boatCounts[r.port_id] = (boatCounts[r.port_id] ?? 0) + Number(r.count)
      }

      // Boats via mouillage spots
      const mouillageBoatRows: PortAggRow[] = await db
        .from('boats')
        .join('spots', 'boats.spot_id', 'spots.id')
        .join('mouillages', 'spots.mouillage_id', 'mouillages.id')
        .whereIn('mouillages.port_id', portIds)
        .groupBy('mouillages.port_id')
        .count('boats.id as count')
        .select('mouillages.port_id as port_id')

      for (const r of mouillageBoatRows) {
        boatCounts[r.port_id] = (boatCounts[r.port_id] ?? 0) + Number(r.count)
      }

      // Total spots via pontoons
      const pontoonSpotRows: PortAggRow[] = await db
        .from('spots')
        .join('pontoons', 'spots.pontoon_id', 'pontoons.id')
        .whereIn('pontoons.port_id', portIds)
        .groupBy('pontoons.port_id')
        .count('spots.id as count')
        .select('pontoons.port_id as port_id')

      for (const r of pontoonSpotRows) {
        spotCounts[r.port_id] = (spotCounts[r.port_id] ?? 0) + Number(r.count)
      }

      // Total spots via mouillages
      const mouillageSpotRows: PortAggRow[] = await db
        .from('spots')
        .join('mouillages', 'spots.mouillage_id', 'mouillages.id')
        .whereIn('mouillages.port_id', portIds)
        .groupBy('mouillages.port_id')
        .count('spots.id as count')
        .select('mouillages.port_id as port_id')

      for (const r of mouillageSpotRows) {
        spotCounts[r.port_id] = (spotCounts[r.port_id] ?? 0) + Number(r.count)
      }
    }

    return ports.map((p) => {
      const totalSpots = spotCounts[p.id] ?? 0
      const boatCount = boatCounts[p.id] ?? 0
      return {
        id: p.id,
        name: p.name,
        city: p.city,
        country: p.country,
        address: p.address,
        notes: p.notes,
        pontoonCount: Number(p.$extras['pontoons_count'] ?? 0),
        mouillageCount: Number(p.$extras['mouillages_count'] ?? 0),
        boatCount,
        totalSpots,
        freeSpots: Math.max(0, totalSpots - boatCount),
      }
    })
  }

  /**
   * Gets a port for the user's organization or throws PortNotFoundError.
   */
  async getForUserOrFail(user: User, portId: number): Promise<Port> {
    if (user.organizationId === null) throw new PortNotFoundError()

    const port = await Port.query()
      .where('id', portId)
      .where('organizationId', user.organizationId)
      .first()

    if (!port) throw new PortNotFoundError()

    return port
  }

  /**
   * Lists all ports for the user's organization with full preloads for spots.
   * Used in boat create/edit forms.
   */
  async listWithSpotsForOrg(user: User): Promise<Port[]> {
    if (user.organizationId === null) return []

    return await Port.query()
      .where('organizationId', user.organizationId)
      .preload('pontoons', (q) =>
        q.orderBy('name', 'asc').preload('spots', (sq) => sq.orderBy('name', 'asc'))
      )
      .preload('mouillages', (q) =>
        q.orderBy('name', 'asc').preload('spots', (sq) => sq.orderBy('name', 'asc'))
      )
      .orderBy('name', 'asc')
  }

  async listNamesForOrg(user: User): Promise<{ id: number; name: string }[]> {
    if (user.organizationId === null) return []

    const ports = await Port.query()
      .where('organizationId', user.organizationId)
      .select('id', 'name')
      .orderBy('name', 'asc')

    return ports.map((p) => ({ id: p.id, name: p.name }))
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
      throw new UserNotInOrganizationError()
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
