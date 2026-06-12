import emitter from '@adonisjs/core/services/emitter'
import SimulatorLeadCreated from '#events/simulator_lead_created'
import OrganizationMemberJoined from '#events/organization_member_joined'

emitter.listen(SimulatorLeadCreated, [() => import('#listeners/on_simulator_lead_created')])
emitter.listen(OrganizationMemberJoined, [() => import('#listeners/on_organization_member_joined')])
