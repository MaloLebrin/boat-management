<script setup lang="ts">
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import type { PlannedMaintenanceSummary } from '#shared/types/budget'

/**
 * « Entretien prévu ce trimestre » (#868) : la somme des coûts estimés des
 * tâches ouvertes dues d'ici la fin du trimestre. `inline` : une ligne sous la
 * carte dépenses du tableau de bord ; sinon, une carte de la page budget.
 */
withDefaults(defineProps<{ summary: PlannedMaintenanceSummary; inline?: boolean }>(), {
  inline: false,
})

const { t } = useT()
const { formatCurrency } = useNumberFormat()
</script>

<template>
  <div
    :class="
      inline
        ? 'mt-4 border-t border-border pt-3'
        : 'rounded-(--radius-card) border border-border bg-surface-elevated p-6 shadow-(--shadow-sm)'
    "
    data-testid="planned-maintenance"
  >
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <p
        :class="
          inline ? 'text-xs font-medium text-fg-muted' : 'text-base font-semibold text-fg-muted'
        "
      >
        {{
          t('budget.plannedMaintenance.title', {
            quarter: String(summary.quarter),
            year: String(summary.year),
          })
        }}
      </p>
      <p
        :class="
          inline
            ? 'text-sm font-semibold text-fg'
            : 'font-display text-2xl font-bold tracking-tight text-fg'
        "
        data-testid="planned-maintenance-amount"
      >
        {{ formatCurrency(summary.amount) }}
      </p>
    </div>
    <p
      v-if="summary.unestimatedCount > 0"
      class="mt-1 text-xs text-fg-subtle"
      data-testid="planned-maintenance-unestimated"
    >
      {{ t('budget.plannedMaintenance.unestimated', { count: String(summary.unestimatedCount) }) }}
    </p>
    <p v-else-if="summary.estimatedCount === 0" class="mt-1 text-xs text-fg-subtle">
      {{ t('budget.plannedMaintenance.empty') }}
    </p>
  </div>
</template>
