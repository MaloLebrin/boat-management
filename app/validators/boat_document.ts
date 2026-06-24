import { BOAT_DOCUMENT_TYPES } from '#shared/types/boat_document'
import vine from '@vinejs/vine'

function boatDocumentFields() {
  return {
    type: vine.enum(BOAT_DOCUMENT_TYPES),
    customTypeLabel: vine.string().trim().nullable().optional(),
    referenceNumber: vine.string().trim().nullable().optional(),
    issuedAt: vine.date().nullable().optional(),
    expiresAt: vine.date().nullable().optional(),
    issuer: vine.string().trim().nullable().optional(),
    notes: vine.string().trim().nullable().optional(),
    cost: vine.number().min(0).nullable().optional(),
  }
}

export const createBoatDocumentValidator = vine.create(vine.object(boatDocumentFields()))
export const updateBoatDocumentValidator = vine.create(vine.object(boatDocumentFields()))
