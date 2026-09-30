import { TrashedBoatNameHeldError, TrashedBoatRegistrationHeldError } from '#exceptions/boat_errors'
import Boat from '#models/boat'
import { onlyTrashed } from '#models/mixins/soft_deletes'

/**
 * Un bateau en corbeille ne compte plus dans le quota, mais il réserve son
 * nom et son immatriculation jusqu'à la purge (#858). Les noms de la flotte
 * active ne sont pas uniques : seule la corbeille bloque.
 */
export async function assertBoatIdentityNotHeldByTrash(input: {
  organizationId: number
  name: string
  registrationNumber: string | null
  exceptBoatId?: number
}) {
  const name = input.name.trim()
  const registration = input.registrationNumber?.trim() || null

  const trashed = onlyTrashed(Boat.query().where('organizationId', input.organizationId))
  if (input.exceptBoatId !== undefined) trashed.whereNot('id', input.exceptBoatId)

  const [byName, byRegistration] = await Promise.all([
    trashed.clone().whereRaw('lower(name) = ?', [name.toLowerCase()]).first(),
    registration
      ? trashed.clone().where('registrationNumber', registration).first()
      : Promise.resolve(null),
  ])

  if (byName) throw new TrashedBoatNameHeldError()
  if (byRegistration) throw new TrashedBoatRegistrationHeldError()
}
