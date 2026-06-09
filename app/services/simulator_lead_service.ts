import SimulatorLead from '#models/simulator_lead'
import type { SimulatorLeadPayload } from '#shared/types/simulator'

export default class SimulatorLeadService {
  async create(payload: SimulatorLeadPayload): Promise<SimulatorLead> {
    return SimulatorLead.updateOrCreate(
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
  }
}
