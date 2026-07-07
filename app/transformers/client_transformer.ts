import type Client from '#models/client'
import type { ClientRow } from '#shared/types/client'

export function toClientRow(client: Client): ClientRow {
  return {
    id: client.id,
    firstName: client.firstName,
    lastName: client.lastName,
    fullName: client.fullName,
    email: client.email,
    phone: client.phone,
    address: client.address,
    navigationPermitNumber: client.navigationPermitNumber,
    navigationPermitType: client.navigationPermitType,
    status: client.status,
    notes: client.notes,
    gdprConsentAt: client.gdprConsentAt?.toISO() ?? null,
    anonymizedAt: client.anonymizedAt?.toISO() ?? null,
    createdAt: client.createdAt?.toISO() ?? null,
    updatedAt: client.updatedAt?.toISO() ?? null,
  }
}
