<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { ref } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseConfirmModal from '~/components/base/BaseConfirmModal.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { useT } from '~/composables/use_t'
import type { AccountMembershipRow } from '#shared/types/account'

/** « Mes organisations » (#886) : quitter une organisation. */
defineProps<{ memberships: AccountMembershipRow[] }>()

const { t } = useT()
const pendingLeave = ref<AccountMembershipRow | null>(null)
const confirmOpen = ref(false)

function askLeave(membership: AccountMembershipRow) {
  pendingLeave.value = membership
  confirmOpen.value = true
}

function leave() {
  if (!pendingLeave.value) return
  router.delete(`/settings/me/memberships/${pendingLeave.value.organizationId}`, {
    preserveScroll: true,
  })
}
</script>

<template>
  <section>
    <BaseHeading level="2" class="mb-2">{{ t('settings.danger.memberships.title') }}</BaseHeading>
    <p class="mb-6 text-sm text-fg-muted">{{ t('settings.danger.memberships.subtitle') }}</p>
    <BaseCard>
      <ul class="space-y-3">
        <li
          v-for="membership in memberships"
          :key="membership.organizationId"
          class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-elevated px-4 py-3"
          data-testid="membership-row"
        >
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="truncate text-sm font-medium text-fg">{{ membership.name }}</p>
              <BaseBadge v-if="membership.isCurrent" variant="success">
                {{ t('settings.danger.memberships.current') }}
              </BaseBadge>
            </div>
            <p class="text-xs text-fg-muted">
              {{ t(`settings.members.roles.${membership.role}`) }}
            </p>
            <p
              v-if="membership.leaveBlockedReason"
              class="mt-1 text-xs text-fg-subtle"
              data-testid="leave-blocked"
            >
              {{ t(`settings.danger.memberships.blocked.${membership.leaveBlockedReason}`) }}
            </p>
          </div>
          <BaseButton
            v-if="!membership.leaveBlockedReason"
            variant="danger"
            size="sm"
            type="button"
            :aria-label="t('settings.danger.memberships.leaveFor', { name: membership.name })"
            @click="askLeave(membership)"
          >
            {{ t('settings.danger.memberships.leave') }}
          </BaseButton>
        </li>
      </ul>
    </BaseCard>
    <BaseConfirmModal
      v-model:open="confirmOpen"
      :title="t('settings.danger.memberships.leaveTitle', { name: pendingLeave?.name ?? '' })"
      :message="t('settings.danger.memberships.leaveConfirm')"
      :confirm-label="t('settings.danger.memberships.leave')"
      @confirm="leave"
    />
  </section>
</template>
