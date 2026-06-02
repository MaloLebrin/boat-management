<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { useT } from '~/composables/use_t'
import type { OrganizationInvitationData } from '../../../../shared/types/organization'

defineProps<{
  invitations: OrganizationInvitationData[]
}>()

const { t, locale } = useT()

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function cancelInvitation(id: number) {
  router.delete(`/organization/invitations/${id}`, { preserveScroll: true })
}
</script>

<template>
  <div class="mt-8">
    <BaseHeading level="3" class="mb-4">
      {{ t('settings.members.pendingInvitations') }}
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
              {{ t('settings.members.columns.expires') }}
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
            v-for="invitation in invitations"
            :key="invitation.id"
            class="border-b border-border last:border-b-0"
          >
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fg-muted/20 text-sm font-medium text-fg-muted"
                >
                  {{ invitation.email.charAt(0).toUpperCase() }}
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-fg">{{ invitation.email }}</p>
                  <p class="truncate text-xs text-fg-muted">
                    {{ t('settings.members.statuses.pending') }}
                  </p>
                </div>
              </div>
            </td>
            <td class="px-6 py-4">
              <BaseBadge :variant="invitation.role === 'admin' ? 'info' : 'neutral'">
                {{ t(`settings.members.roles.${invitation.role}`) }}
              </BaseBadge>
            </td>
            <td class="px-6 py-4">
              <span class="text-sm text-fg-muted">{{ formatDate(invitation.expiresAt) }}</span>
            </td>
            <td class="px-6 py-4 text-right">
              <BaseButton variant="danger" size="sm" @click="cancelInvitation(invitation.id)">
                {{ t('settings.members.cancelInvitation') }}
              </BaseButton>
            </td>
          </tr>
        </tbody>
      </table>
    </BaseCard>
  </div>
</template>
