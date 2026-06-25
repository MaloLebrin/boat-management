<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import { useCurrencyFormat } from '~/composables/use_currency_format'
import { useT } from '~/composables/use_t'
import type { BoatPortStayItem } from '#shared/types/budget'

const props = defineProps<{
  boatId: number
  stays: BoatPortStayItem[]
  canManage: boolean
}>()

const { t } = useT()
const { formatCurrency } = useCurrencyFormat()

function deleteStay(stayId: number) {
  if (!confirm(t('budget.portStay.deleteConfirm'))) return
  router.delete(`/boats/${props.boatId}/port-stays/${stayId}`, {
    preserveScroll: true,
  })
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString()
}
</script>

<template>
  <div
    class="rounded-(--radius-card) border border-border bg-surface-elevated p-5 shadow-(--shadow-xs)"
  >
    <h3 class="text-base font-semibold text-fg mb-4">{{ t('budget.portStay.listTitle') }}</h3>
    <div v-if="stays.length === 0" class="text-sm text-fg-subtle text-center py-6">
      {{ t('budget.portStay.noStays') }}
    </div>
    <ul v-else class="divide-y divide-border">
      <li
        v-for="stay in stays"
        :key="stay.id"
        class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex-1 min-w-0">
          <p class="font-medium text-fg truncate">{{ stay.portName }}</p>
          <p class="text-sm text-fg-muted">
            {{ formatDate(stay.startedAt) }}
            <template v-if="stay.endedAt"> — {{ formatDate(stay.endedAt) }}</template>
          </p>
          <p v-if="stay.notes" class="text-sm text-fg-subtle mt-1 line-clamp-2">{{ stay.notes }}</p>
        </div>
        <div class="flex items-center gap-4">
          <span v-if="stay.cost" class="font-semibold text-teal-600 dark:text-teal-400">
            {{ formatCurrency(Number(stay.cost)) }}
          </span>
          <span v-else class="text-fg-subtle">—</span>
          <BaseButton v-if="canManage" variant="danger" size="sm" @click="deleteStay(stay.id)">
            {{ t('common.delete') }}
          </BaseButton>
        </div>
      </li>
    </ul>
  </div>
</template>
