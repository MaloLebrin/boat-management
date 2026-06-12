import type SimulatorLead from '#models/simulator_lead'
import type SimulatorShare from '#models/simulator_share'

export function toSimulatorLeadForFront(lead: SimulatorLead) {
  return {
    id: lead.id,
    email: lead.email,
    boatType: lead.boatType,
    lengthM: lead.lengthM,
    hullWear: lead.hullWear,
    engineWear: lead.engineWear,
    safetyWear: lead.safetyWear,
    riggingWear: lead.riggingWear,
    winteringZone: lead.winteringZone,
    totalMin: lead.totalMin,
    totalMax: lead.totalMax,
    locale: lead.locale,
    createdAt: lead.createdAt.toISO(),
  }
}

export function toSimulatorShareForFront(share: SimulatorShare) {
  return {
    id: share.id,
    token: share.token,
    input: share.input,
    breakdown: share.breakdown,
    locale: share.locale,
    createdAt: share.createdAt.toISO(),
  }
}
