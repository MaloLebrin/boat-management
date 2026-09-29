import {
  BoatInspectionNoClientEmailError,
  BoatInspectionNotSignedError,
  BoatInspectionValidationError,
} from '#exceptions/inspection_errors'
import Boat from '#models/boat'
import BoatEquipmentAction from '#models/boat_equipment_action'
import BoatInspection from '#models/boat_inspection'
import BoatInspectionItem from '#models/boat_inspection_item'
import BoatInspectionSignature from '#models/boat_inspection_signature'
import type BoatReservation from '#models/boat_reservation'
import Client from '#models/client'
import Media from '#models/media'
import type Organization from '#models/organization'
import type User from '#models/user'
import { CloudinaryFolders, CloudinaryService } from '#services/cloudinary_service'
import EmailQueueService from '#services/email_queue_service'
import InspectionPdfService from '#services/inspection_pdf_service'
import MediaService from '#services/media_service'
import { assertInspectionUnlocked } from '#services/boat_inspection_service'
import {
  INSPECTION_PDF_MAX_PHOTOS,
  SIGNATURE_DATA_URL_PREFIX,
} from '#shared/constants/inspection_signature'
import { inspectionCategoryForBoat } from '#shared/helpers/inspection_checklist'
import type {
  InspectionItemState,
  InspectionKind,
  InspectionPdfData,
  InspectionSignatureInput,
  InspectionSignatureRole,
  SignInspectionPayload,
} from '#shared/types/inspection'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { I18n } from '@adonisjs/i18n'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

/** Les huit octets qui ouvrent tout fichier PNG. */
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/**
 * Décode le tracé envoyé par le pad : une URL `data:` PNG, rien d'autre. Le
 * validateur borne déjà la taille ; ici on vérifie que les octets sont bien
 * un PNG — c'est eux que le PDF embarque.
 */
export function decodeSignature(dataUrl: string): Buffer {
  if (!dataUrl.startsWith(SIGNATURE_DATA_URL_PREFIX)) {
    throw new BoatInspectionValidationError('signature is not a PNG', 'signatureInvalid')
  }
  const image = Buffer.from(dataUrl.slice(SIGNATURE_DATA_URL_PREFIX.length), 'base64')
  if (image.length <= PNG_MAGIC.length || !image.subarray(0, 8).equals(PNG_MAGIC)) {
    throw new BoatInspectionValidationError('signature is not a PNG', 'signatureInvalid')
  }
  return image
}

/**
 * Document d'état des lieux (#889) : PDF, signature des deux parties et envoi
 * au client.
 *
 * La signature **fige** l'inspection (`locked_at`) et archive le PDF produit à
 * cet instant (`pdf_media_id`) : c'est ce fichier-là, et non une version
 * recalculée, qu'on télécharge et qu'on envoie ensuite. Avant signature, le
 * PDF est un brouillon produit à la demande.
 *
 * Les contrôles de périmètre (organisation, réservation) sont faits en amont
 * par `BoatInspectionService.findForReservation`.
 */
@inject()
export default class InspectionDocumentService {
  constructor(
    private pdfService: InspectionPdfService,
    private mediaService: MediaService,
    private cloudinary: CloudinaryService,
    private emailQueue: EmailQueueService
  ) {}

  /** PDF à servir : l'archive signée si elle existe, sinon un rendu à la volée. */
  async pdfFor(
    inspection: BoatInspection,
    reservation: BoatReservation,
    org: Organization,
    i18n: I18n
  ): Promise<{ buffer: Buffer; filename: string }> {
    const archived = await this.#archivedPdf(inspection, reservation)
    if (archived) return archived

    const data = await this.#pdfData(inspection, reservation)
    return this.pdfService.generate(data, org, i18n)
  }

  /**
   * Signe l'état des lieux : les deux tracés, puis le PDF signé archivé, puis
   * le verrou. Le PDF est produit **avant** l'écriture en base — un envoi
   * Cloudinary en échec laisse l'inspection modifiable, on peut réessayer.
   */
  async sign(
    user: User,
    inspection: BoatInspection,
    reservation: BoatReservation,
    payload: SignInspectionPayload,
    org: Organization,
    i18n: I18n
  ): Promise<BoatInspection> {
    assertInspectionUnlocked(inspection)

    const signedAt = DateTime.utc()
    const signatures: InspectionSignatureInput[] = [
      {
        role: 'client',
        signerName: payload.clientName.trim(),
        image: decodeSignature(payload.clientSignature),
      },
      {
        role: 'staff',
        signerName: user.fullName?.trim() || user.email,
        image: decodeSignature(payload.staffSignature),
      },
    ]

    const data = await this.#pdfData(inspection, reservation)
    data.lockedAt = signedAt.toISO()!
    data.signatures = signatures.map((signature) => ({
      ...signature,
      signedAt: signedAt.toISO()!,
    }))
    const { buffer, filename } = await this.pdfService.generate(data, org, i18n)

    const media = await this.mediaService.storeGeneratedDocument(
      user,
      buffer,
      filename,
      {
        folder: CloudinaryFolders.inspectionSignedPdf(
          org.slug,
          reservation.boatId,
          reservation.id,
          inspection.kind
        ),
        entityType: 'inspection',
        entityId: inspection.id,
      },
      org
    )

    try {
      await db.transaction(async (trx) => {
        // Deux signatures simultanées : la seconde voit le verrou de la première.
        const locked = await BoatInspection.query({ client: trx })
          .where('id', inspection.id)
          .forUpdate()
          .firstOrFail()
        assertInspectionUnlocked(locked)

        await BoatInspectionSignature.createMany(
          signatures.map((signature) => ({
            boatInspectionId: inspection.id,
            role: signature.role,
            signerName: signature.signerName,
            image: Buffer.from(signature.image),
            signedAt,
          })),
          { client: trx }
        )

        locked.useTransaction(trx)
        locked.lockedAt = signedAt
        locked.lockedById = user.id
        locked.pdfMediaId = media.id
        await locked.save()
      })
    } catch (error) {
      // Le PDF archivé n'a plus de raison d'être : on le retire, quota compris.
      await this.mediaService
        .deleteForEntity(media.id, 'inspection', inspection.id, org)
        .catch((cleanupError) =>
          logger.warn({ err: cleanupError, mediaId: media.id }, 'orphan inspection PDF left behind')
        )
      throw error
    }

    await inspection.refresh()
    return inspection
  }

  /**
   * Met l'envoi du PDF signé en file. Seul un état des lieux signé part chez
   * le client : un brouillon n'engage personne.
   */
  async send(
    inspection: BoatInspection,
    reservation: BoatReservation,
    locale: string
  ): Promise<string> {
    if (!inspection.lockedAt) throw new BoatInspectionNotSignedError()

    const to = await this.#clientEmail(reservation)
    await this.emailQueue.sendInspection({
      inspectionId: inspection.id,
      organizationId: reservation.organizationId,
      to,
      locale,
    })

    inspection.sentAt = DateTime.utc()
    await inspection.save()
    return to
  }

  async #clientEmail(reservation: BoatReservation): Promise<string> {
    if (reservation.clientEmail) return reservation.clientEmail
    if (reservation.clientId) {
      const client = await Client.query()
        .where('id', reservation.clientId)
        .where('organizationId', reservation.organizationId)
        .select('email')
        .first()
      if (client?.email) return client.email
    }
    throw new BoatInspectionNoClientEmailError()
  }

  async #archivedPdf(
    inspection: BoatInspection,
    reservation: BoatReservation
  ): Promise<{ buffer: Buffer; filename: string } | null> {
    if (!inspection.pdfMediaId) return null
    const media = await Media.query()
      .where('id', inspection.pdfMediaId)
      .where('entityType', 'inspection')
      .where('entityId', inspection.id)
      .first()
    if (!media) return null

    try {
      const { buffer } = await this.cloudinary.downloadAsBuffer(
        media.cloudinaryPublicId,
        'raw',
        media.format
      )
      return { buffer, filename: `etat-des-lieux-${reservation.id}-${inspection.kind}.pdf` }
    } catch (error) {
      // Archive injoignable : le rendu à la volée, tiré des données figées,
      // reste fidèle — mieux que pas de document du tout.
      logger.warn(
        { err: error, inspectionId: inspection.id },
        'archived inspection PDF unavailable'
      )
      return null
    }
  }

  /** Rassemble tout ce qu'imprime l'état des lieux — voir `InspectionPdfData`. */
  async #pdfData(
    inspection: BoatInspection,
    reservation: BoatReservation
  ): Promise<InspectionPdfData> {
    const [boat, items, photos, defects, signatures, counterpart] = await Promise.all([
      Boat.query()
        .where('id', reservation.boatId)
        .select('id', 'name', 'category', 'type', 'propulsionType')
        .firstOrFail(),
      this.#items(inspection.id),
      Media.query()
        .where('entityType', 'inspection')
        .where('entityId', inspection.id)
        .where('kind', 'photo')
        .orderBy('position', 'asc')
        .select('cloudinaryPublicId'),
      BoatEquipmentAction.query()
        .where('inspectionId', inspection.id)
        .orderBy('createdAt', 'asc')
        .select('label', 'notes'),
      BoatInspectionSignature.query().where('boatInspectionId', inspection.id),
      inspection.kind === 'checkin'
        ? BoatInspection.query()
            .where('reservationId', reservation.id)
            .where('kind', 'checkout' satisfies InspectionKind)
            .first()
        : Promise.resolve(null),
    ])

    const thumbnails = await Promise.all(
      photos
        .slice(0, INSPECTION_PDF_MAX_PHOTOS)
        .map((photo) => this.cloudinary.fetchThumbnail(photo.cloudinaryPublicId))
    )

    return {
      inspectionId: inspection.id,
      kind: inspection.kind as InspectionKind,
      performedAt: inspection.performedAt.toISO()!,
      fuelLevel: inspection.fuelLevel,
      engineHours: inspection.engineHours,
      notes: inspection.notes,
      lockedAt: inspection.lockedAt?.toISO() ?? null,
      boat: { name: boat.name, category: inspectionCategoryForBoat(boat) },
      reservation: {
        id: reservation.id,
        startsAt: reservation.startsAt.toISO()!,
        endsAt: reservation.endsAt.toISO()!,
      },
      client: {
        name: reservation.clientName,
        email: reservation.clientEmail,
        phone: reservation.clientPhone,
      },
      items,
      photos: thumbnails.filter((thumbnail): thumbnail is Buffer => thumbnail !== null),
      photoCount: photos.length,
      defects: defects.map((defect) => ({ label: defect.label, notes: defect.notes })),
      counterpart: counterpart
        ? {
            performedAt: counterpart.performedAt.toISO()!,
            fuelLevel: counterpart.fuelLevel,
            engineHours: counterpart.engineHours,
            items: await this.#items(counterpart.id),
          }
        : null,
      signatures: signatures.map((signature) => ({
        role: signature.role as InspectionSignatureRole,
        signerName: signature.signerName,
        signedAt: signature.signedAt.toISO()!,
        image: signature.image,
      })),
    }
  }

  async #items(inspectionId: number) {
    const rows = await BoatInspectionItem.query()
      .where('boatInspectionId', inspectionId)
      .select('itemKey', 'state', 'note')
    return rows.map((row) => ({
      itemKey: row.itemKey,
      state: row.state as InspectionItemState,
      note: row.note,
    }))
  }
}
