import Boat from '#models/boat'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

/**
 * Pose `organizationId` depuis le bateau quand l'appelant ne l'a pas fait.
 *
 * Filet des fabriques, seeders et `Model.create()` (#855). Les services
 * renseignent la colonne eux-mêmes : le hook sort tout de suite. `createMany`
 * ne passe pas par ici — l'import CSV copie l'organisation explicitement.
 */
export async function assignOrganizationFromBoat(row: {
  organizationId?: number | null
  boatId: number
  $trx?: TransactionClientContract
}): Promise<void> {
  if (row.organizationId) return

  const boat = await Boat.query({ client: row.$trx })
    .where('id', row.boatId)
    .select('id', 'organizationId')
    .first()

  if (boat) row.organizationId = boat.organizationId
}
