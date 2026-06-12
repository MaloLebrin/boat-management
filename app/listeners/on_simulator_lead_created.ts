import SendSimulatorNurturingJob from '#jobs/send_simulator_nurturing_job'
import SendSimulatorReportJob from '#jobs/send_simulator_report_job'
import type SimulatorLeadCreated from '#events/simulator_lead_created'

export default class OnSimulatorLeadCreated {
  async handle(event: SimulatorLeadCreated) {
    await SendSimulatorReportJob.dispatch({ leadId: event.lead.id })
    await SendSimulatorNurturingJob.dispatch({ leadId: event.lead.id })
  }
}
