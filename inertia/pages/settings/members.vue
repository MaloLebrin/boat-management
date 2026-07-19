<script lang="ts">
import DefaultLayout from '~/layouts/default.vue'
export default { layout: DefaultLayout }
</script>

<script setup lang="ts">
import SettingsShell from '~/components/settings/SettingsShell.vue'
import SettingsMembersTab from '~/components/settings/tabs/SettingsMembersTab.vue'
import type {
  OrganizationMemberData,
  OrganizationInvitationData,
} from '../../../shared/types/organization'

defineProps<{
  currentUserId: number
  members: OrganizationMemberData[]
  pendingInvitations: OrganizationInvitationData[]
  canManageMembers: boolean
  canAddMember: boolean
  boatOptions: { id: number; name: string }[]
}>()
</script>

<template>
  <SettingsShell>
    <SettingsMembersTab
      :current-user-id="currentUserId"
      :members="members"
      :pending-invitations="pendingInvitations"
      :can-manage-members="canManageMembers"
      :can-add-member="canAddMember"
      :boat-options="boatOptions"
    />
  </SettingsShell>
</template>
