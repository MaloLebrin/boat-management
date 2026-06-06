import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import Boat from '#models/boat'
import BoatPolicy from '#policies/boat_policy'
import {
  SIMULATOR_BOAT_TYPES,
  type SimulatorBoatInput,
  type SimulatorBoatType,
} from '../../shared/types/simulator.js'

@inject()
export default class BoatSimulatorController {
  async show({ params, inertia, bouncer, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const boat = await Boat.query()
      .where('id', params.id)
      .where('organizationId', user.organizationId!)
      .preload('engines')
      .firstOrFail()

    await bouncer.with(BoatPolicy).authorize('view', boat)

    const boatType = SIMULATOR_BOAT_TYPES.includes(boat.type as SimulatorBoatType)
      ? (boat.type as SimulatorBoatType)
      : undefined

    const partial: Partial<SimulatorBoatInput> = {
      boatType,
      lengthM: boat.lengthM ?? undefined,
      yearBuilt: boat.yearBuilt ?? undefined,
      navigationCategory: (boat.navigationCategory as 'A' | 'B' | 'C' | 'D') ?? undefined,
      hasDedicatedEngine: boat.engines.length > 0,
    }

    return inertia.render('boats/simulator', {
      boat: { id: boat.id, name: boat.name },
      partial,
    })
  }
}
