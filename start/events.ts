import emitter from '@adonisjs/core/services/emitter'
import SimulatorLeadCreated from '#events/simulator_lead_created'
import OrganizationMemberJoined from '#events/organization_member_joined'
import OrganizationMemberRemoved from '#events/organization_member_removed'
import OrganizationMemberRoleChanged from '#events/organization_member_role_changed'
import OrganizationInvitationAccepted from '#events/organization_invitation_accepted'
import OrganizationPlanDowngraded from '#events/organization_plan_downgraded'
import OrganizationPlanUpgraded from '#events/organization_plan_upgraded'
import OrganizationModuleDeactivated from '#events/organization_module_deactivated'
import StorageThresholdCrossed from '#events/storage_threshold_crossed'
import AiTokenThresholdCrossed from '#events/ai_token_threshold_crossed'

emitter.listen(SimulatorLeadCreated, [() => import('#listeners/on_simulator_lead_created')])
emitter.listen(OrganizationMemberJoined, [() => import('#listeners/on_organization_member_joined')])
emitter.listen(OrganizationMemberRemoved, [
  () => import('#listeners/on_organization_member_removed'),
])
emitter.listen(OrganizationMemberRoleChanged, [
  () => import('#listeners/on_organization_member_role_changed'),
])
emitter.listen(OrganizationInvitationAccepted, [
  () => import('#listeners/on_organization_invitation_accepted'),
])
emitter.listen(OrganizationPlanDowngraded, [
  () => import('#listeners/on_organization_plan_downgraded'),
])
emitter.listen(OrganizationPlanUpgraded, [() => import('#listeners/on_organization_plan_upgraded')])
emitter.listen(OrganizationModuleDeactivated, [
  () => import('#listeners/on_organization_module_deactivated'),
])
emitter.listen(StorageThresholdCrossed, [
  () => import('#listeners/send_storage_quota_notification'),
])
emitter.listen(AiTokenThresholdCrossed, [
  () => import('#listeners/send_ai_token_quota_notification'),
])
