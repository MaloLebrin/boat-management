<script setup lang="ts">
import { computed, ref } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import SettingsMembersInviteForm from '~/components/settings/tabs/SettingsMembersInviteForm.vue'
import SettingsMembersPendingInvitations from '~/components/settings/tabs/SettingsMembersPendingInvitations.vue'
import SettingsMembersRoleModal from '~/components/settings/tabs/SettingsMembersRoleModal.vue'
import UpgradePlanModal from '~/components/base/UpgradePlanModal.vue'
import { useT } from '~/composables/use_t'
import type {
  OrgRole,
  OrganizationMemberData,
  OrganizationInvitationData,
} from '../../../../shared/types/organization'

const props = defineProps<{
  currentUserId: number
  members: OrganizationMemberData[]
  pendingInvitations: OrganizationInvitationData[]
  canManageMembers: boolean
  canAddMember: boolean
  boatOptions: { id: number; name: string }[]
}>()

const { t } = useT()

const showInviteForm = ref(false)
const showUpgradeModal = ref(false)

function handleInvite() {
  if (props.canAddMember) {
    showInviteForm.value = true
  } else {
    showUpgradeModal.value = true
  }
}

const roleOptions = computed(() => [
  { label: t('settings.members.roles.admin'), value: 'admin' },
  { label: t('settings.members.roles.member'), value: 'member' },
  { label: t('settings.members.roles.mechanic'), value: 'mechanic' },
  { label: t('settings.members.roles.boat_owner'), value: 'boat_owner' },
])

function getInitials(member: OrganizationMemberData): string {
  if (member.fullName) {
    return member.fullName.charAt(0).toUpperCase()
  }
  return member.email.charAt(0).toUpperCase()
}

const showRoleModal = ref(false)
const pendingMember = ref<OrganizationMemberData | null>(null)
const pendingRole = ref<OrgRole | null>(null)
// Force le remount des <select> pour revenir au rôle courant quand on annule
// la confirmation (le model-value reste lié à member.role, non muté).
const selectVersion = ref(0)

function requestRoleChange(member: OrganizationMemberData, role: string) {
  if (role === member.role) return
  pendingMember.value = member
  pendingRole.value = role as OrgRole
  showRoleModal.value = true
}

function confirmRoleChange() {
  if (!pendingMember.value || !pendingRole.value) return
  router.put(
    `/organization/members/${pendingMember.value.id}`,
    { role: pendingRole.value },
    { preserveScroll: true }
  )
}

function onRoleModalOpen(value: boolean) {
  showRoleModal.value = value
  if (!value) {
    pendingMember.value = null
    pendingRole.value = null
    selectVersion.value++
  }
}

function removeMember(memberId: number) {
  router.delete(`/organization/members/${memberId}`, { preserveScroll: true })
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <BaseHeading level="2">{{ t('settings.members.title') }}</BaseHeading>
      <BaseButton
        v-if="canManageMembers && !showInviteForm"
        variant="primary"
        size="sm"
        @click="handleInvite"
      >
        {{ t('settings.members.invite') }}
      </BaseButton>
    </div>

    <SettingsMembersInviteForm
      v-if="canManageMembers && showInviteForm"
      :boat-options="boatOptions"
      @close="showInviteForm = false"
    />

    <BaseHeading level="3" class="mb-4">
      {{ t('settings.members.activeMembers') }}
    </BaseHeading>

    <BaseCard :padded="false">
      <table class="w-full">
        <thead>
          <tr class="border-b border-border">
            <th
              class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-fg-muted"
            >
              {{ t('settings.members.columns.member') }}
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-fg-muted"
            >
              {{ t('settings.members.columns.role') }}
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-fg-muted"
            >
              {{ t('settings.members.columns.status') }}
            </th>
            <th
              class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-fg-muted"
            >
              {{ t('settings.members.columns.actions') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="member in members"
            :key="member.id"
            class="border-b border-border last:border-b-0"
          >
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-medium text-white"
                >
                  {{ getInitials(member) }}
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-fg">
                    {{ member.fullName ?? t('settings.members.noName') }}
                  </p>
                  <p class="truncate text-xs text-fg-muted">{{ member.email }}</p>
                </div>
              </div>
            </td>
            <td class="px-6 py-4">
              <template v-if="canManageMembers && member.userId !== props.currentUserId">
                <BaseSelect
                  :key="`role-${member.id}-${selectVersion}`"
                  :model-value="member.role"
                  :options="roleOptions"
                  @update:model-value="requestRoleChange(member, String($event))"
                />
              </template>
              <template v-else>
                <BaseBadge :variant="member.role === 'admin' ? 'info' : 'neutral'">
                  {{ t(`settings.members.roles.${member.role}`) }}
                </BaseBadge>
              </template>
            </td>
            <td class="px-6 py-4">
              <BaseBadge variant="success">
                {{ t('settings.members.statuses.active') }}
              </BaseBadge>
            </td>
            <td class="px-6 py-4 text-right">
              <template v-if="member.userId === props.currentUserId">
                <span class="text-xs text-fg-muted">{{ t('settings.members.you') }}</span>
              </template>
              <template v-else-if="canManageMembers">
                <BaseButton variant="danger" size="sm" @click="removeMember(member.id)">
                  {{ t('settings.members.remove') }}
                </BaseButton>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </BaseCard>

    <SettingsMembersPendingInvitations
      v-if="canManageMembers && pendingInvitations.length > 0"
      :invitations="pendingInvitations"
    />
  </div>

  <UpgradePlanModal v-model:open="showUpgradeModal" feature="members" />

  <SettingsMembersRoleModal
    :open="showRoleModal"
    :member-name="pendingMember?.fullName ?? pendingMember?.email ?? ''"
    :current-role="pendingMember?.role ?? 'member'"
    :new-role="pendingRole"
    @update:open="onRoleModalOpen"
    @confirm="confirmRoleChange"
  />
</template>
