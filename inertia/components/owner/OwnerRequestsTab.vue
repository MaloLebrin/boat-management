<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import OwnerRequestForm from '~/components/owner/OwnerRequestForm.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import type {
  OwnerApprovalDecision,
  OwnerApprovalStatus,
  OwnerRequestStatus,
  OwnerTaskRow,
} from '#shared/types/owner_portal'

/**
 * Demandes du propriétaire et devis soumis à son accord (#890). Le statut est
 * celui vu du propriétaire : reçue, planifiée, faite.
 */
const props = defineProps<{ boatId: number; requests: OwnerTaskRow[] }>()

const { t } = useT()
const { formatDate } = useDateFormat()
const { formatCurrency } = useNumberFormat()

const STATUS_VARIANT: Record<OwnerRequestStatus, 'info' | 'warning' | 'success'> = {
  received: 'info',
  planned: 'warning',
  done: 'success',
}

const APPROVAL_VARIANT: Record<OwnerApprovalStatus, 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
}

function decide(taskId: number, decision: OwnerApprovalDecision) {
  router.post(
    `/owner/boats/${props.boatId}/tasks/${taskId}/${decision}`,
    {},
    { preserveScroll: true }
  )
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <OwnerRequestForm :boat-id="boatId" />

    <BaseEmptyState
      v-if="requests.length === 0"
      :title="t('owner.boats.show.requests.emptyTitle')"
    />

    <div v-else class="flex flex-col gap-3">
      <BaseCard v-for="request in requests" :key="request.id" data-testid="owner-request-row">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <p class="text-sm font-semibold text-fg">{{ request.title }}</p>
            <p class="text-xs text-fg-muted">
              {{
                request.requestedByOwner
                  ? t('owner.boats.show.requests.requestedOn', {
                      date: formatDate(request.createdAt),
                    })
                  : t('owner.boats.show.requests.submittedByManager')
              }}
              <span v-if="request.dueAt">
                ·
                {{ t('owner.boats.show.requests.plannedFor', { date: formatDate(request.dueAt) }) }}
              </span>
            </p>
            <p v-if="request.description" class="mt-2 text-sm text-fg-muted">
              {{ request.description }}
            </p>
            <p v-if="request.estimatedCost !== null" class="mt-2 text-sm text-fg">
              {{
                t('owner.boats.show.requests.estimatedCost', {
                  amount: formatCurrency(request.estimatedCost),
                })
              }}
            </p>
          </div>
          <div class="flex shrink-0 flex-col items-end gap-2">
            <BaseBadge :variant="STATUS_VARIANT[request.status]">
              {{ t(`owner.boats.show.requests.status.${request.status}`) }}
            </BaseBadge>
            <BaseBadge v-if="request.approval" :variant="APPROVAL_VARIANT[request.approval]">
              {{ t(`owner.boats.show.requests.approval.${request.approval}`) }}
            </BaseBadge>
          </div>
        </div>
        <div
          v-if="request.approval === 'pending' && request.status !== 'done'"
          class="mt-3 flex justify-end gap-2"
        >
          <BaseButton
            variant="secondary"
            size="sm"
            data-testid="owner-reject"
            @click="decide(request.id, 'reject')"
          >
            {{ t('owner.boats.show.requests.reject') }}
          </BaseButton>
          <BaseButton size="sm" data-testid="owner-approve" @click="decide(request.id, 'approve')">
            {{ t('owner.boats.show.requests.approve') }}
          </BaseButton>
        </div>
      </BaseCard>
    </div>
  </div>
</template>
