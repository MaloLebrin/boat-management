import type { DateTime } from 'luxon'

export const BOAT_DOCUMENT_TYPES = [
  'francisation',
  'insurance',
  'navigation_permit',
  'radio_license',
  'safety_inspection',
  'tonnage',
  'ce_certificate',
  'crew_role',
  'other',
] as const

export type BoatDocumentType = (typeof BOAT_DOCUMENT_TYPES)[number]

export type BoatDocumentStatus = 'valid' | 'expiring_soon' | 'expired'

export interface BoatDocumentRow {
  id: number
  boatId: number
  type: BoatDocumentType
  customTypeLabel: string | null
  referenceNumber: string | null
  issuedAt: string | null
  expiresAt: string | null
  issuer: string | null
  notes: string | null
  mediaId: number | null
  mediaSecureUrl: string | null
  mediaFilename: string | null
  status: BoatDocumentStatus
  createdAt: string
}

export interface CreateBoatDocumentPayload {
  type: BoatDocumentType
  customTypeLabel?: string | null
  referenceNumber?: string | null
  issuedAt?: Date | string | DateTime | null
  expiresAt?: Date | string | DateTime | null
  issuer?: string | null
  notes?: string | null
}

export type UpdateBoatDocumentPayload = CreateBoatDocumentPayload

export interface ReminderDocumentItem {
  id: number
  boatName: string
  documentType: BoatDocumentType
  customTypeLabel: string | null
  expiresAt: string
  daysUntilExpiry: number
}
