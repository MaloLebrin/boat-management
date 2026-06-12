import { randomBytes } from 'node:crypto'
import { inject } from '@adonisjs/core'
import SimulatorShare from '#models/simulator_share'
import type { SimulatorBoatInput, SimulatorCostBreakdown } from '#shared/types/simulator'

@inject()
export default class SimulatorShareService {
  constructor() {}

  /**
   * Creates a new simulator share with a unique token.
   */
  async create(
    input: SimulatorBoatInput,
    breakdown: SimulatorCostBreakdown,
    locale: string
  ): Promise<SimulatorShare> {
    const token = randomBytes(6).toString('hex')
    return SimulatorShare.create({
      token,
      input,
      breakdown,
      locale,
    })
  }

  /**
   * Finds a simulator share by its token.
   */
  async findByToken(token: string): Promise<SimulatorShare | null> {
    return SimulatorShare.findBy('token', token)
  }
}
