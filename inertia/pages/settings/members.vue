<script lang="ts">
import DefaultLayout from '~/layouts/default.vue'
export default { layout: DefaultLayout }
</script>

<script setup lang="ts">
import SettingsShell from '~/components/settings/SettingsShell.vue'
import SettingsMembersTab from '~/components/settings/tabs/SettingsMembersTab.vue'
import type { OrganizationMemberData, OrganizationInvitationData } from '../../../shared/types/organization'

defineProps<{
  user: {
    id: number
    email: string
    fullName: string | null
  }
  members: OrganizationMemberData[]
  pendingInvitations: OrganizationInvitationData[]
  canManageMembers: boolean
  canAddMember: boolean
}>()
</script>

<template>
  <SettingsShell>
    <SettingsMembersTab
      :user="user"
      :members="members"
      :pending-invitations="pendingInvitations"
      :can-manage-members="canManageMembers"
      :can-add-member="canAddMember"
    />
  </SettingsShell>
</template>
