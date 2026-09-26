<script setup lang="ts">
import { computed } from 'vue'
import { Link } from '@adonisjs/inertia/vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseSkeleton from '~/components/base/BaseSkeleton.vue'
import type { DashboardInvoicingSummary } from '#shared/types/dashboard'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'

/** `undefined` = prop différée pas encore arrivée (squelette). */
const props = defineProps<{ invoicing: DashboardInvoicingSummary | undefined }>()

const { t } = useT()
const { formatCurrencyNoDecimals } = useNumberFormat()

interface Tile {
  key: 'outstanding' | 'overdue' | 'paidThisMonth' | 'pendingQuotes'
  href: string
  /** Montant affiché en grand ; `null` pour un simple compteur (devis). */
  amount: number | null
  count: number
  danger: boolean
}

const tiles = computed<Tile[]>(() => {
  const i = props.invoicing
  if (!i) return []
  return [
    {
      key: 'outstanding',
      href: '/invoices?status=sent',
      amount: i.outstandingTotal,
      count: i.outstandingCount,
      danger: false,
    },
    {
      key: 'overdue',
      href: '/invoices?status=overdue',
      amount: i.overdueTotal,
      count: i.overdueCount,
      danger: i.overdueCount > 0,
    },
    {
      key: 'paidThisMonth',
      href: '/invoices?status=paid',
      amount: i.paidThisMonthTotal,
      count: i.paidThisMonthCount,
      danger: false,
    },
    {
      key: 'pendingQuotes',
      href: '/invoices?kind=quote',
      amount: null,
      count: i.pendingQuotes,
      danger: false,
    },
  ]
})

const isEmpty = computed(() => tiles.value.every((tile) => tile.count === 0))
</script>

<template>
  <!-- Widget « Facturation » (galerie, module CRM/Facturation) : encours,
       impayées, encaissé ce mois, devis en attente — chaque chiffre ouvre la
       liste filtrée. -->
  <BaseCard>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 class="text-sm font-semibold text-fg">{{ t('dashboard.invoicing.title') }}</h2>
        <Link
          href="/invoices"
          data-testid="dashboard-invoicing-view-all"
          class="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline"
        >
          {{ t('dashboard.invoicing.viewAll') }}
        </Link>
      </div>
    </template>

    <div
      v-if="invoicing === undefined"
      class="grid grid-cols-2 gap-3"
      data-testid="dashboard-invoicing-skeleton"
    >
      <BaseSkeleton v-for="i in 4" :key="i" height-class="h-14" />
    </div>

    <p v-else-if="isEmpty" class="text-sm text-fg-muted" data-testid="dashboard-invoicing-empty">
      {{ t('dashboard.invoicing.empty') }}
    </p>

    <div v-else class="grid grid-cols-2 gap-3">
      <Link
        v-for="tile in tiles"
        :key="tile.key"
        :href="tile.href"
        data-testid="dashboard-invoicing-tile"
        :data-key="tile.key"
        class="block min-h-11 rounded-(--radius-control) border border-border bg-surface-muted/40 p-3 transition-colors hover:border-border-strong hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <span class="block text-xs font-medium text-fg-muted">
          {{ t(`dashboard.invoicing.${tile.key}`) }}
        </span>
        <span
          class="mt-1 block font-display text-lg font-bold tracking-tight"
          :class="tile.danger ? 'text-danger' : 'text-fg'"
        >
          {{ tile.amount !== null ? formatCurrencyNoDecimals(tile.amount) : tile.count }}
        </span>
        <span v-if="tile.amount !== null" class="block text-xs text-fg-subtle">
          {{ t('dashboard.invoicing.count', { count: String(tile.count) }) }}
        </span>
      </Link>
    </div>
  </BaseCard>
</template>
