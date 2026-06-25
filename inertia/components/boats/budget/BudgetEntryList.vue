<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import { useCurrencyFormat } from '~/composables/use_currency_format'
import { useT } from '~/composables/use_t'
import type { BoatBudgetEntryItem } from '#shared/types/budget'

const props = defineProps<{
  boatId: number
  entries: BoatBudgetEntryItem[]
  canManage: boolean
}>()

const { t } = useT()
const { formatCurrency } = useCurrencyFormat()

function deleteEntry(entryId: number) {
  if (!confirm(t('budget.entries.deleteConfirm'))) return
  router.delete(`/boats/${props.boatId}/budget/entries/${entryId}`, {
    preserveScroll: true,
  })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

function getCategoryLabel(category: string): string {
  const key = `budget.entries.categories.${category}`
  return t(key)
}

const CATEGORY_COLORS: Record<string, string> = {
  maintenance: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  fuel: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  documents: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  port: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  equipment: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
}
</script>

<template>
  <div
    class="rounded-(--radius-card) border border-border bg-surface-elevated p-5 shadow-(--shadow-xs)"
  >
    <h3 class="text-base font-semibold text-fg mb-4">{{ t('budget.entries.listTitle') }}</h3>
    <div v-if="entries.length === 0" class="text-sm text-fg-subtle text-center py-6">
      {{ t('budget.entries.noEntries') }}
    </div>
    <ul v-else class="divide-y divide-border">
      <li
        v-for="entry in entries"
        :key="entry.id"
        class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="font-medium text-fg truncate">{{ entry.label }}</p>
            <span
              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
              :class="CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.other"
            >
              {{ getCategoryLabel(entry.category) }}
            </span>
          </div>
          <p class="text-sm text-fg-muted">{{ formatDate(entry.date) }}</p>
          <p v-if="entry.description" class="text-sm text-fg-subtle mt-1 line-clamp-2">
            {{ entry.description }}
          </p>
        </div>
        <div class="flex items-center gap-4">
          <span class="font-semibold text-orange-600 dark:text-orange-400">
            {{ formatCurrency(Number(entry.amount)) }}
          </span>
          <BaseButton v-if="canManage" variant="danger" size="sm" @click="deleteEntry(entry.id)">
            {{ t('common.delete') }}
          </BaseButton>
        </div>
      </li>
    </ul>
  </div>
</template>
