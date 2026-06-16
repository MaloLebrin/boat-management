import emitter from '@adonisjs/core/services/emitter'
import SimulatorLeadCreated from '#events/simulator_lead_created'
import OrganizationMemberJoined from '#events/organization_member_joined'
import OrganizationPlanDowngraded from '#events/organization_plan_downgraded'
import StorageThresholdCrossed from '#events/storage_threshold_crossed'

emitter.listen(SimulatorLeadCreated, [() => import('#listeners/on_simulator_lead_created')])
emitter.listen(OrganizationMemberJoined, [() => import('#listeners/on_organization_member_joined')])
emitter.listen(OrganizationPlanDowngraded, [
  () => import('#listeners/on_organization_plan_downgraded'),
])
emitter.listen(StorageThresholdCrossed, [
  () => import('#listeners/send_storage_quota_notification'),
])
