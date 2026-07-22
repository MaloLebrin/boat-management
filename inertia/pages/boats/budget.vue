<script setup lang="ts">
import { computed, ref } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BudgetBarChart from '~/components/boats/budget/BudgetBarChart.vue'
import BudgetCategoryCard from '~/components/boats/budget/BudgetCategoryCard.vue'
import BudgetPortStayForm from '~/components/boats/budget/BudgetPortStayForm.vue'
import BudgetPortStayList from '~/components/boats/budget/BudgetPortStayList.vue'
import BudgetEntryForm from '~/components/boats/budget/BudgetEntryForm.vue'
import BudgetEntryList from '~/components/boats/budget/BudgetEntryList.vue'
import { useCurrencyFormat } from '~/composables/use_currency_format'
import { useT } from '~/composables/use_t'
import type { BudgetData, BoatPortStayItem, BoatBudgetEntryItem } from '~/types/budget'

const props = defineProps<{
  boat: { id: number; name: string }
  budget: BudgetData
  year: number
  portStays: BoatPortStayItem[]
  entries: BoatBudgetEntryItem[]
  canManage: boolean
}>()

const { t } = useT()
const { formatCurrency } = useCurrencyFormat()

const selectedYear = ref(props.year)
const currentYear = new Date().getFullYear()
const yearOptions = computed(() =>
  Array.from({ length: 10 }, (_, i) => currentYear - i).map((y) => ({
    value: String(y),
    label: String(y),
  }))
)

function changeYear(y: number) {
  selectedYear.value = y
  router.get(`/boats/${props.boat.id}/budget`, { year: String(y) }, { preserveScroll: true })
}

const categories = computed(() => [
  {
    key: 'maintenance' as const,
    amount: props.budget.totals.maintenance,
    previousAmount: props.budget.previousYearTotals?.maintenance ?? null,
    helpText: t('budget.categoryHelp.maintenance'),
  },
  {
    key: 'fuel' as const,
    amount: props.budget.totals.fuel,
    previousAmount: props.budget.previousYearTotals?.fuel ?? null,
    helpText: t('budget.categoryHelp.fuel'),
  },
  {
    key: 'documents' as const,
    amount: props.budget.totals.documents,
    previousAmount: props.budget.previousYearTotals?.documents ?? null,
    helpText: t('budget.categoryHelp.documents'),
  },
  {
    key: 'port' as const,
    amount: props.budget.totals.port,
    previousAmount: props.budget.previousYearTotals?.port ?? null,
    helpText: t('budget.categoryHelp.port'),
  },
  {
    key: 'equipment' as const,
    amount: props.budget.totals.equipment,
    previousAmount: props.budget.previousYearTotals?.equipment ?? null,
    helpText: t('budget.categoryHelp.equipment'),
  },
  {
    key: 'entries' as const,
    amount: props.budget.totals.entries,
    previousAmount: props.budget.previousYearTotals?.entries ?? null,
    helpText: t('budget.categoryHelp.entries'),
  },
])
</script>

<template>
  <Head :title="t('budget.title')" />

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
          <BaseSelect
            id="year-select"
            :model-value="String(selectedYear)"
            :options="yearOptions"
            @update:model-value="(val) => val !== '' && changeYear(Number(val))"
          />
        </div>
        <BaseButton
          variant="secondary"
          size="sm"
          :href="`/boats/${boat.id}/export/budget.csv?year=${selectedYear}`"
        >
          {{ t('budget.exportCsv') }}
        </BaseButton>
        <BaseButton variant="secondary" size="sm" route="boats.show" :params="{ id: boat.id }">
          ← {{ boat.name }}
        </BaseButton>
      </div>
    </header>

    <div class="mt-8 space-y-8">
      <!-- Summary cards -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <BudgetCategoryCard
          v-for="cat in categories"
          :key="cat.key"
          :category="cat.key"
          :amount="cat.amount"
          :previous-amount="cat.previousAmount"
          :previous-year="budget.previousYearTotals ? year - 1 : null"
          :help-text="cat.helpText"
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

      <!-- Port stays section -->
      <div class="space-y-4">
        <BudgetPortStayForm v-if="canManage" :boat-id="boat.id" />
        <BudgetPortStayList :boat-id="boat.id" :stays="portStays" :can-manage="canManage" />
      </div>

      <!-- Budget entries section -->
      <div class="space-y-4">
        <BudgetEntryForm v-if="canManage" :boat-id="boat.id" />
        <BudgetEntryList :boat-id="boat.id" :entries="entries" :can-manage="canManage" />
      </div>
    </div>
  </div>
</template>
