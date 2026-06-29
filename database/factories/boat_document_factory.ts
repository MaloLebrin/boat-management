import BoatDocument from '#models/boat_document'
import { BOAT_DOCUMENT_TYPES } from '#shared/types/boat_document'
import Factory from '@adonisjs/lucid/factories'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'

export const BoatDocumentFactory = Factory.define(
  BoatDocument,
  ({ faker }: FactoryContextContract) => ({
    type: faker.helpers.arrayElement([...BOAT_DOCUMENT_TYPES]),
    customTypeLabel: null,
    referenceNumber: null,
    issuedAt: null,
    expiresAt: null,
    issuer: null,
    notes: null,
    cost: null,
    mediaId: null,
  })
).build()
