import {
  NavigationLogEntryNotEditableError,
  NavigationLogEntryNotFoundError,
  NavigationLogNotFoundError,
  NavigationLogValidationError,
} from '#exceptions/navigation_log_errors'
import NavigationLog from '#models/navigation_log'
import NavigationLogEntry from '#models/navigation_log_entry'
import type Boat from '#models/boat'
import type {
  CreateNavigationLogEntryPayload,
  UpdateNavigationLogEntryPayload,
} from '#shared/types/navigation_log'
import { toUtcFromLocalInput } from '#shared/helpers/date'

export {
  NavigationLogEntryNotEditableError,
  NavigationLogEntryNotFoundError,
  NavigationLogNotFoundError,
}
export type { CreateNavigationLogEntryPayload, UpdateNavigationLogEntryPayload }

export interface NavigationLogEntryOptions {
  /**
   * Les points ne sont éditables que sur une sortie en cours ; un admin
   * (capability navigation_logs.delete) peut corriger après clôture — cas réel :
   * dernier point à rectifier avec la position du port depuis la terre ferme.
   */
  allowCompleted?: boolean
}

function toDecimalString(value: number | null | undefined): string | null {
  return value !== null && value !== undefined ? String(value) : null
}

export default class NavigationLogEntryService {
  async listForLog(log: NavigationLog) {
    return await NavigationLogEntry.query()
      .where('navigationLogId', log.id)
      .orderBy('recordedAt', 'asc')
      .orderBy('id', 'asc')
  }

  async createForLog(
    boat: Boat,
    logId: number,
    payload: CreateNavigationLogEntryPayload,
    options: NavigationLogEntryOptions = {}
  ) {
    const log = await this.getEditableLog(boat, logId, options)

    this.assertCoordinatesPaired(payload.latitude, payload.longitude)

    return await NavigationLogEntry.create({
      navigationLogId: log.id,
      organizationId: log.organizationId,
      recordedAt: toUtcFromLocalInput(payload.recordedAt, payload.tzOffsetMinutes),
      latitude: toDecimalString(payload.latitude),
      longitude: toDecimalString(payload.longitude),
      gpsAccuracyM: toDecimalString(payload.gpsAccuracyM),
      cogDeg: payload.cogDeg ?? null,
      sogKn: toDecimalString(payload.sogKn),
      sailConfig: payload.sailConfig?.trim() || null,
      note: payload.note?.trim() || null,
    })
  }

  async updateForLog(
    boat: Boat,
    logId: number,
    entryId: number,
    payload: UpdateNavigationLogEntryPayload,
    options: NavigationLogEntryOptions = {}
  ) {
    const log = await this.getEditableLog(boat, logId, options)
    const entry = await this.getEntryOrFail(log, entryId)

    // Champ absent (undefined) = préservé ; null explicite = vidé. Voir #180.
    const latitude = payload.latitude !== undefined ? payload.latitude : undefined
    const longitude = payload.longitude !== undefined ? payload.longitude : undefined
    this.assertCoordinatesPaired(
      latitude !== undefined ? latitude : entry.latitude,
      longitude !== undefined ? longitude : entry.longitude
    )

    if (payload.recordedAt !== undefined) {
      entry.recordedAt = toUtcFromLocalInput(payload.recordedAt, payload.tzOffsetMinutes)
    }
    if (payload.latitude !== undefined) entry.latitude = toDecimalString(payload.latitude)
    if (payload.longitude !== undefined) entry.longitude = toDecimalString(payload.longitude)
    if (payload.gpsAccuracyM !== undefined) {
      entry.gpsAccuracyM = toDecimalString(payload.gpsAccuracyM)
    }
    if (payload.cogDeg !== undefined) entry.cogDeg = payload.cogDeg
    if (payload.sogKn !== undefined) entry.sogKn = toDecimalString(payload.sogKn)
    if (payload.sailConfig !== undefined) entry.sailConfig = payload.sailConfig?.trim() || null
    if (payload.note !== undefined) entry.note = payload.note?.trim() || null

    await entry.save()
    return entry
  }

  async deleteForLog(
    boat: Boat,
    logId: number,
    entryId: number,
    options: NavigationLogEntryOptions = {}
  ) {
    const log = await this.getEditableLog(boat, logId, options)
    const entry = await this.getEntryOrFail(log, entryId)
    await entry.delete()
  }

  /**
   * Charge la sortie en vérifiant son appartenance au bateau (un point ne peut
   * jamais viser la sortie d'un autre bateau) et son statut éditable.
   */
  private async getEditableLog(boat: Boat, logId: number, options: NavigationLogEntryOptions) {
    const log = await NavigationLog.query().where('id', logId).where('boatId', boat.id).first()
    if (!log) throw new NavigationLogNotFoundError()

    if (log.status !== 'in_progress' && !options.allowCompleted) {
      throw new NavigationLogEntryNotEditableError()
    }

    return log
  }

  private async getEntryOrFail(log: NavigationLog, entryId: number) {
    const entry = await NavigationLogEntry.query()
      .where('id', entryId)
      .where('navigationLogId', log.id)
      .first()
    if (!entry) throw new NavigationLogEntryNotFoundError()
    return entry
  }

  /** Une coordonnée seule est inexploitable : lat/lng vont ensemble ou pas du tout. */
  private assertCoordinatesPaired(
    latitude: number | string | null | undefined,
    longitude: number | string | null | undefined
  ) {
    const hasLat = latitude !== null && latitude !== undefined
    const hasLng = longitude !== null && longitude !== undefined
    if (hasLat !== hasLng) {
      throw new NavigationLogValidationError(
        'Latitude and longitude must be provided together',
        'coordinatesUnpaired'
      )
    }
  }
}
