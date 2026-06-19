import BoatDocument from '#models/boat_document'
import type Boat from '#models/boat'
import type User from '#models/user'
import { BoatDocumentNotFoundError } from '#exceptions/boat_document_errors'
import type {
  BoatDocumentRow,
  BoatDocumentStatus,
  CreateBoatDocumentPayload,
  UpdateBoatDocumentPayload,
  ReminderDocumentItem,
} from '#shared/types/boat_document'
import { DateTime } from 'luxon'

export default class BoatDocumentService {
  private computeStatus(expiresAt: DateTime | null): BoatDocumentStatus {
    if (!expiresAt) return 'valid'
    const daysUntil = expiresAt.diff(DateTime.now(), 'days').days
    if (daysUntil < 0) return 'expired'
    if (daysUntil < 30) return 'expiring_soon'
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
    })
    await doc.save()
    return this.toRow(doc)
  }

  async delete(_user: User, boat: Boat, documentId: number): Promise<void> {
    const doc = await BoatDocument.query().where('id', documentId).where('boatId', boat.id).first()
    if (!doc) throw new BoatDocumentNotFoundError(documentId)
    await doc.delete()
  }

  async getExpiringDocuments(
    daysAhead: number
  ): Promise<(BoatDocument & { boat: { id: number; name: string; organizationId: number } })[]> {
    const now = DateTime.now()
    const limit = now.plus({ days: daysAhead })
    return BoatDocument.query()
      .whereNotNull('expires_at')
      .where('expires_at', '>', now.toISODate()!)
      .where('expires_at', '<=', limit.toISODate()!)
      .preload('boat')
  }

  toReminderItem(doc: BoatDocument): ReminderDocumentItem {
    const daysUntilExpiry = Math.ceil(doc.expiresAt!.diff(DateTime.now(), 'days').days)
    return {
      id: doc.id,
      boatName: doc.boat.name,
      documentType: doc.type,
      customTypeLabel: doc.customTypeLabel,
      expiresAt: doc.expiresAt!.toISODate()!,
      daysUntilExpiry,
    }
  }
}
