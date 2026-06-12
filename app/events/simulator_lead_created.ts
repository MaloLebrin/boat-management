import type SimulatorLead from '#models/simulator_lead'
import { BaseEvent } from '@adonisjs/core/events'

export default class SimulatorLeadCreated extends BaseEvent {
  constructor(public readonly lead: SimulatorLead) {
    super()
  }
}
