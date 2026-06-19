import { BoatIncidentNotFoundError, BoatIncidentValidationError } from '#exceptions/incident_errors'
import BoatIncident from '#models/boat_incident'
import type Boat from '#models/boat'
import type User from '#models/user'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import type { CreateIncidentPayload, UpdateIncidentPayload } from '#shared/types/incident'
import { toDateTime } from '#shared/helpers/maintenance'

function assertBoatScope(user: User, boat: Boat) {
  if (user.organizationId === null || user.organizationId !== boat.organizationId) {
    throw new BoatIncidentNotFoundError()
  }
}

@inject()
export default class BoatIncidentService {
  async listForBoat(user: User, boat: Boat) {
    assertBoatScope(user, boat)

    return await BoatIncident.query()
      .select([
        'id',
        'boatId',
        'organizationId',
        'occurredAt',
        'type',
        'location',
        'description',
        'insuranceClaimed',
        'insuranceClaimRef',
        'status',
        'closedAt',
        'createdAt',
        'updatedAt',
      ])
      .where('boatId', boat.id)
      .orderBy('occurredAt', 'desc')
      .orderBy('id', 'desc')
  }

  async createForBoat(user: User, boat: Boat, payload: CreateIncidentPayload) {
    assertBoatScope(user, boat)

    const description = payload.description.trim()
    if (!description) {
      throw new BoatIncidentValidationError('description is required', 'descriptionRequired')
    }

    return await BoatIncident.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      occurredAt: toDateTime(payload.occurredAt).plus({ minutes: payload.tzOffsetMinutes ?? 0 }),
      type: payload.type,
      location: payload.location?.trim() || null,
      description,
      insuranceClaimed: payload.insuranceClaimed ?? false,
      insuranceClaimRef: payload.insuranceClaimRef?.trim() || null,
      status: 'open',
    })
  }

  async updateForBoat(user: User, boat: Boat, incidentId: number, payload: UpdateIncidentPayload) {
    assertBoatScope(user, boat)

    const incident = await BoatIncident.query()
      .where('id', incidentId)
      .where('boatId', boat.id)
      .first()

    if (!incident) throw new BoatIncidentNotFoundError()

    if (payload.description !== undefined) {
      const description = payload.description.trim()
      if (!description) {
        throw new BoatIncidentValidationError('description is required', 'descriptionRequired')
      }
      incident.description = description
    }

    if (payload.occurredAt !== undefined) {
      incident.occurredAt = toDateTime(payload.occurredAt).plus({
        minutes: payload.tzOffsetMinutes ?? 0,
      })
    }
    if (payload.type !== undefined) incident.type = payload.type
    if (payload.location !== undefined) incident.location = payload.location?.trim() || null
    if (payload.insuranceClaimed !== undefined) incident.insuranceClaimed = payload.insuranceClaimed
    if (payload.insuranceClaimRef !== undefined) {
      incident.insuranceClaimRef = payload.insuranceClaimRef?.trim() || null
    }
    if (payload.status !== undefined) {
      incident.status = payload.status
      if (payload.status === 'closed' && !incident.closedAt) {
        incident.closedAt = DateTime.now()
      } else if (payload.status !== 'closed') {
        incident.closedAt = null
      }
    }

    await incident.save()
    return incident
  }

  async deleteForBoat(user: User, boat: Boat, incidentId: number) {
    assertBoatScope(user, boat)

    const incident = await BoatIncident.query()
      .where('id', incidentId)
      .where('boatId', boat.id)
      .first()

    if (!incident) throw new BoatIncidentNotFoundError()
    await incident.delete()
  }
}
