<script setup lang="ts">
import { computed } from 'vue'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import type { MaintenanceTaskWorkOrder } from '#shared/types/maintenance'

/**
 * Résumé d'une ligne de l'ordre de travail (#868) sous le titre d'une tâche :
 * responsable, prestataire, coût prévu. Rien n'est rendu quand aucun de ces
 * champs n'est renseigné.
 */
const props = defineProps<{ workOrder: Partial<MaintenanceTaskWorkOrder> }>()

const { t } = useT()
const { formatCurrency } = useNumberFormat()

const parts = computed(() => {
  const w = props.workOrder
  const out: string[] = []
  if (w.assignee) {
    out.push(t('boats.maintenance.tasks.workOrder.assignedTo', { name: w.assignee.fullName }))
  }
  if (w.providerName) {
    out.push(t('boats.maintenance.tasks.workOrder.providerShort', { name: w.providerName }))
  }
  if (w.estimatedCost !== null && w.estimatedCost !== undefined) {
    out.push(
      t('boats.maintenance.tasks.workOrder.estimatedShort', {
        amount: formatCurrency(w.estimatedCost),
      })
    )
  }
  return out
})
</script>

<template>
  <p v-if="parts.length > 0" class="mt-1 text-xs text-fg-subtle" data-testid="task-work-order">
    {{ parts.join(' · ') }}
  </p>
</template>
