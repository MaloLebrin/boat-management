import type { ApiRequest } from '@japa/api-client'
import { BoatInstrumentSourceFactory } from '#database/factories/boat_instrument_source_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import type User from '#models/user'

/** Bateau de l'organisation de `user`, avec ou sans source Signal K. */
export async function boatWithSource(user: User, withSource = true) {
  const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
  const source = withSource
    ? await BoatInstrumentSourceFactory.merge({
        boatId: boat.id,
        organizationId: user.organizationId!,
        baseUrl: 'https://signalk.example:3443',
      }).create()
    : null
  return { boat, source }
}

/** Recharge partielle de la prop différée `instruments`, comme le fait le client Inertia. */
export function asInstrumentsReload(request: ApiRequest): ApiRequest {
  return request
    .withInertia()
    .header('X-Inertia-Partial-Component', 'boats/show')
    .header('X-Inertia-Partial-Data', 'instruments')
}
