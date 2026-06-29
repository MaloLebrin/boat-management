import BoatDocument from '#models/boat_document'
import Organization from '#models/organization'
import type Boat from '#models/boat'
import type User from '#models/user'
import { BoatDocumentNotFoundError } from '#exceptions/boat_document_errors'
import MediaService from '#services/media_service'
import type {
  BoatDocumentRow,
  BoatDocumentStatus,
  CreateBoatDocumentPayload,
  UpdateBoatDocumentPayload,
  ReminderDocumentItem,
} from '#shared/types/boat_document'
import { BOAT_DOCUMENT_EXPIRY_WARNING_DAYS } from '#shared/constants/boats/boat_document_constants'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'

@inject()
export default class BoatDocumentService {
  constructor(private mediaService: MediaService) {}
  private computeStatus(expiresAt: DateTime | null): BoatDocumentStatus {
    if (!expiresAt) return 'valid'
    const daysUntil = expiresAt.diff(DateTime.now(), 'days').days
    if (daysUntil < 0) return 'expired'
    if (daysUntil < BOAT_DOCUMENT_EXPIRY_WARNING_DAYS) return 'expiring_soon'
    return 'valid'
  }

  private toRow(doc: BoatDocument): BoatDocumentRow {
    const media = doc.$preloaded.media ? doc.media : null
    return {
      id: doc.id,
      boatId: doc.boatId,
      type: doc.type,
      customTypeLabel: doc.customTypeLabel,
      referenceNumber: doc.referenceNumber,
      issuedAt: doc.issuedAt?.toISODate() ?? null,
      expiresAt: doc.expiresAt?.toISODate() ?? null,
      issuer: doc.issuer,
      notes: doc.notes,
      cost: doc.cost !== null ? Number.parseFloat(doc.cost) : null,
      mediaId: doc.mediaId,
      mediaSecureUrl: media?.secureUrl ?? null,
      mediaFilename: media?.originalFilename ?? null,
      status: this.computeStatus(doc.expiresAt),
      createdAt: doc.createdAt.toISO()!,
    }
  }

  async listForBoat(_user: User, boat: Boat): Promise<BoatDocumentRow[]> {
    const docs = await BoatDocument.query()
      .where('boatId', boat.id)
      .preload('media')
      .orderBy('createdAt', 'desc')
    return docs.map((d) => this.toRow(d))
  }

  private toDateTime(value: Date | string | DateTime | null | undefined): DateTime | null {
    if (!value) return null
    if (value instanceof DateTime) return value
    if (value instanceof Date) return DateTime.fromJSDate(value)
    return DateTime.fromISO(String(value))
  }

  async create(
    _user: User,
    boat: Boat,
    payload: CreateBoatDocumentPayload
  ): Promise<BoatDocumentRow> {
    const doc = await BoatDocument.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      type: payload.type,
      customTypeLabel: payload.customTypeLabel ?? null,
      referenceNumber: payload.referenceNumber ?? null,
      issuedAt: this.toDateTime(payload.issuedAt),
      expiresAt: this.toDateTime(payload.expiresAt),
      issuer: payload.issuer ?? null,
      notes: payload.notes ?? null,
      cost: payload.cost !== null && payload.cost !== undefined ? String(payload.cost) : null,
    })
    return this.toRow(doc)
  }

  async update(
    _user: User,
    boat: Boat,
    documentId: number,
    payload: UpdateBoatDocumentPayload
  ): Promise<BoatDocumentRow> {
    const doc = await BoatDocument.query()
      .where('id', documentId)
      .where('boatId', boat.id)
      .preload('media')
      .first()
    if (!doc) throw new BoatDocumentNotFoundError(documentId)

    doc.merge({
      type: payload.type,
      customTypeLabel: payload.customTypeLabel ?? null,
      referenceNumber: payload.referenceNumber ?? null,
      issuedAt: this.toDateTime(payload.issuedAt),
      expiresAt: this.toDateTime(payload.expiresAt),
      issuer: payload.issuer ?? null,
      notes: payload.notes ?? null,
      cost: payload.cost !== null && payload.cost !== undefined ? String(payload.cost) : null,
    })
    await doc.save()
    return this.toRow(doc)
  }

  async delete(_user: User, boat: Boat, documentId: number): Promise<void> {
    const doc = await BoatDocument.query().where('id', documentId).where('boatId', boat.id).first()
    if (!doc) throw new BoatDocumentNotFoundError(documentId)
    if (doc.mediaId !== null) {
      const org = await Organization.findOrFail(doc.organizationId)
      await this.mediaService.deleteById(doc.mediaId, org)
    }
    await doc.delete()
  }

  async getExpiringDocuments(fromDaysAhead: number, toDaysAhead: number): Promise<BoatDocument[]> {
    const now = DateTime.now()
    const from = now.plus({ days: fromDaysAhead })
    const limit = now.plus({ days: toDaysAhead })
    return BoatDocument.query()
      .whereNotNull('expires_at')
      .where('expires_at', '>=', from.toISODate()!)
      .where('expires_at', '<=', limit.toISODate()!)
      .preload('boat')
  }

  toReminderItem(doc: BoatDocument): ReminderDocumentItem {
    if (!doc.expiresAt) throw new Error(`Document ${doc.id} has no expiry date`)
    const daysUntilExpiry = Math.ceil(doc.expiresAt.diff(DateTime.now(), 'days').days)
    return {
      id: doc.id,
      boatName: doc.boat.name,
      documentType: doc.type,
      customTypeLabel: doc.customTypeLabel,
      expiresAt: doc.expiresAt.toISODate()!,
      daysUntilExpiry,
    }
  }
}
