<script setup lang="ts">
import { computed, ref } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import SettingsMembersInviteForm from '~/components/settings/tabs/SettingsMembersInviteForm.vue'
import SettingsMembersPendingInvitations from '~/components/settings/tabs/SettingsMembersPendingInvitations.vue'
import UpgradePlanModal from '~/components/base/UpgradePlanModal.vue'
import { useT } from '~/composables/useT'
import type { OrganizationMemberData, OrganizationInvitationData } from '../../../../shared/types/organization'

const props = defineProps<{
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
])

function getInitials(member: OrganizationMemberData): string {
  if (member.fullName) {
    return member.fullName.charAt(0).toUpperCase()
  }
  return member.email.charAt(0).toUpperCase()
}

function changeRole(memberId: number, role: string) {
  router.put(`/organization/members/${memberId}`, { role }, { preserveScroll: true })
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
      @close="showInviteForm = false"
    />

    <BaseHeading level="3" class="mb-4">
      {{ t('settings.members.activeMembers') }}
    </BaseHeading>

    <BaseCard :padded="false">
      <table class="w-full">
        <thead>
          <tr class="border-b border-border">
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-fg-muted">
              {{ t('settings.members.columns.member') }}
            </th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-fg-muted">
              {{ t('settings.members.columns.role') }}
            </th>
            <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-fg-muted">
              {{ t('settings.members.columns.status') }}
            </th>
            <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-fg-muted">
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
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-medium text-white">
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
              <template v-if="canManageMembers && member.userId !== user.id">
                <select
                  :value="member.role"
                  class="rounded-md border border-border bg-surface px-2 py-1 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  @change="changeRole(member.id, ($event.target as HTMLSelectElement).value)"
                >
                  <option v-for="opt in roleOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
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
              <template v-if="member.userId === user.id">
                <span class="text-xs text-fg-muted">{{ t('settings.members.you') }}</span>
              </template>
              <template v-else-if="canManageMembers">
                <BaseButton
                  variant="danger"
                  size="sm"
                  @click="removeMember(member.id)"
                >
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
</template>
