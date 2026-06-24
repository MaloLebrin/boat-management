<script setup lang="ts">
import { computed, ref } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BudgetBarChart from '~/components/boats/budget/BudgetBarChart.vue'
import BudgetCategoryCard from '~/components/boats/budget/BudgetCategoryCard.vue'
import { useCurrencyFormat } from '~/composables/use_currency_format'
import { useT } from '~/composables/use_t'
import type { BudgetData } from '~/types/budget'

const props = defineProps<{
  boat: { id: number; name: string }
  budget: BudgetData
  year: number
}>()

const { t } = useT()
const { formatCurrency } = useCurrencyFormat()

const selectedYear = ref(props.year)
const currentYear = new Date().getFullYear()
const yearOptions = computed(() => Array.from({ length: 5 }, (_, i) => currentYear - i))

function changeYear(y: number) {
  selectedYear.value = y
  router.get(`/boats/${props.boat.id}/budget`, { year: String(y) }, { preserveScroll: true })
}

const categories = computed(() => [
  {
    key: 'maintenance' as const,
    amount: props.budget.totals.maintenance,
    previousAmount: props.budget.previousYearTotals?.maintenance ?? null,
  },
  {
    key: 'fuel' as const,
    amount: props.budget.totals.fuel,
    previousAmount: props.budget.previousYearTotals?.fuel ?? null,
  },
  {
    key: 'documents' as const,
    amount: props.budget.totals.documents,
    previousAmount: props.budget.previousYearTotals?.documents ?? null,
  },
])
</script>

<template>
  <div class="w-full max-w-7xl px-6 py-10 sm:px-8">
    <BaseBreadcrumb
      :items="[
        { label: t('boats.index.title'), href: '/boats' },
        { label: boat.name, href: `/boats/${boat.id}` },
        { label: t('budget.title') },
      ]"
    />

    <header class="mt-6 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
      <div>
        <BaseHeading level="1">{{ t('budget.title') }}</BaseHeading>
        <p class="mt-1 text-sm text-fg-muted">{{ boat.name }} — {{ t('budget.subtitle') }}</p>
      </div>
      <div class="flex items-center gap-3 flex-wrap">
        <div class="flex items-center gap-2">
          <label for="year-select" class="text-sm font-medium text-fg-muted">
            {{ t('budget.yearSelector') }}
          </label>
          <select
            id="year-select"
            :value="selectedYear"
            class="rounded-(--radius-input) border border-border bg-surface px-3 py-1.5 text-sm text-fg"
            @change="changeYear(Number(($event.target as HTMLSelectElement).value))"
          >
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <BaseButton
          variant="secondary"
          size="sm"
          :href="`/boats/${boat.id}/export/budget.csv?year=${selectedYear}`"
        >
          {{ t('budget.exportCsv') }}
        </BaseButton>
        <BaseButton variant="secondary" size="sm" :route="`/boats/${boat.id}`">
          ← {{ boat.name }}
        </BaseButton>
      </div>
    </header>

    <div class="mt-8 space-y-8">
      <!-- Summary cards -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BudgetCategoryCard
          v-for="cat in categories"
          :key="cat.key"
          :category="cat.key"
          :amount="cat.amount"
          :previous-amount="cat.previousAmount"
          :previous-year="budget.previousYearTotals ? year - 1 : null"
        />
        <BudgetCategoryCard
          category="port"
          :amount="0"
          :previous-amount="null"
          :previous-year="null"
          :unavailable="true"
        />
      </div>

      <!-- Total card -->
      <div
        class="rounded-(--radius-card) border-2 border-border bg-surface-elevated p-6 shadow-(--shadow-sm)"
      >
        <div class="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
          <p class="text-base font-semibold text-fg-muted">
            {{ t('budget.cards.total') }} {{ selectedYear }}
          </p>
          <p class="font-display text-4xl font-bold tracking-tight text-fg">
            {{ formatCurrency(budget.totals.total) }}
          </p>
        </div>
        <div v-if="budget.previousYearTotals" class="mt-2 text-sm text-fg-subtle">
          {{ t('budget.cards.vsLastYear', { year: String(year - 1) }) }} :
          <span class="font-semibold">{{ formatCurrency(budget.previousYearTotals.total) }}</span>
        </div>
      </div>

      <!-- Monthly chart -->
      <BudgetBarChart :monthly="budget.monthly" />
    </div>
  </div>
</template>
