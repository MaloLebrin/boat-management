import SimulatorLead from '#models/simulator_lead'
import EmailQueueService from '#services/email_queue_service'
import type { SimulatorLeadPayload } from '#shared/types/simulator'
import { inject } from '@adonisjs/core'

@inject()
export default class SimulatorLeadService {
  constructor(private emailQueueService: EmailQueueService) {}

  async create(payload: SimulatorLeadPayload): Promise<SimulatorLead> {
    const lead = await SimulatorLead.updateOrCreate(
      { email: payload.email },
      {
        boatType: payload.boatType,
        lengthM: payload.lengthM,
        hullWear: payload.hullWear ?? null,
        engineWear: payload.engineWear ?? null,
        safetyWear: payload.safetyWear ?? null,
        riggingWear: payload.riggingWear ?? null,
        totalMin: payload.totalMin,
        totalMax: payload.totalMax,
        locale: payload.locale ?? 'fr',
      }
    )

    await this.emailQueueService.sendSimulatorReport(lead)

    return lead
  }
}
