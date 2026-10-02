<script setup lang="ts">
import { computed } from 'vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import type { OwnerExpenseRow } from '#shared/types/owner_portal'

/** Dépenses que le gestionnaire a partagées avec le propriétaire (#890). */
const props = defineProps<{ expenses: OwnerExpenseRow[] }>()

const { t } = useT()
const { formatDate } = useDateFormat()
const { formatCurrency } = useNumberFormat()

const total = computed(() => props.expenses.reduce((sum, expense) => sum + expense.amount, 0))
</script>

<template>
  <BaseEmptyState
    v-if="expenses.length === 0"
    :title="t('owner.boats.show.expenses.emptyTitle')"
    :description="t('owner.boats.show.expenses.emptyDescription')"
  />

  <div v-else class="flex flex-col gap-3">
    <p class="text-sm text-fg-muted" data-testid="owner-expenses-total">
      {{ t('owner.boats.show.expenses.total', { amount: formatCurrency(total) }) }}
    </p>
    <BaseCard v-for="expense in expenses" :key="expense.id">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <p class="text-sm font-semibold text-fg">{{ expense.label }}</p>
          <p class="text-xs text-fg-muted">
            {{ t(`budget.entries.categories.${expense.category}`) }} ·
            {{ formatDate(expense.date) }}
          </p>
        </div>
        <span class="shrink-0 text-sm font-medium text-fg">{{
          formatCurrency(expense.amount)
        }}</span>
      </div>
    </BaseCard>
  </div>
</template>
