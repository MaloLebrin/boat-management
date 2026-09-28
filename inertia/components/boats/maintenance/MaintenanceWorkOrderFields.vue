<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useMaintenanceAssignees } from '~/composables/use_maintenance_assignees'
import { useT } from '~/composables/use_t'
import type { FormErrors } from '~/utils/form_errors'
import type { MaintenanceTaskWorkOrder } from '#shared/types/maintenance'

/**
 * Champs d'ordre de travail d'une tâche (#868) : responsable, prestataire
 * externe, coût et durée prévus. Rendus dans un `<Form>` parent, qui les envoie
 * par leur `name`. Un champ vidé part vide, que le serveur traduit en « non
 * renseigné » (création) ou « à vider » (modification).
 *
 * Le sélecteur de responsable n'apparaît que sur les pages qui fournissent la
 * liste des membres (fiche bateau, planning).
 */
const props = defineProps<{
  idPrefix: string
  errors?: FormErrors
  initial?: Partial<MaintenanceTaskWorkOrder> | null
}>()

const { t } = useT()
const assignees = useMaintenanceAssignees()

function asInput(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value)
}

const assigneeId = ref<string | number>(props.initial?.assignee?.id ?? '')
const providerName = ref(props.initial?.providerName ?? '')
const estimatedCost = ref(asInput(props.initial?.estimatedCost))
const estimatedDuration = ref(asInput(props.initial?.estimatedDurationMinutes))

// Un assigné qui a quitté l'organisation reste affiché plutôt que d'être
// silencieusement remplacé par « personne » à l'enregistrement.
const assigneeOptions = computed(() => {
  const options = assignees.value.map((a) => ({ label: a.fullName, value: a.id }))
  const current = props.initial?.assignee
  if (current && !options.some((o) => o.value === current.id)) {
    options.push({ label: current.fullName, value: current.id })
  }
  return options
})
</script>

<template>
  <fieldset class="space-y-4 rounded-(--radius-card) border border-border p-4">
    <legend class="px-1 text-sm font-semibold text-fg">
      {{ t('boats.maintenance.tasks.workOrder.title') }}
    </legend>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <BaseSelect
        v-if="assigneeOptions.length > 0"
        :id="`${idPrefix}-assignee`"
        name="assigneeId"
        :label="t('boats.maintenance.tasks.workOrder.assignee')"
        :placeholder="t('boats.maintenance.tasks.workOrder.unassigned')"
        allow-empty
        :options="assigneeOptions"
        v-model="assigneeId"
        :errors="errors"
      />
      <BaseInput
        :id="`${idPrefix}-provider`"
        name="providerName"
        :label="t('boats.maintenance.tasks.workOrder.provider')"
        :placeholder="t('boats.maintenance.tasks.workOrder.providerPlaceholder')"
        maxlength="200"
        v-model="providerName"
        :errors="errors"
      />
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <BaseInput
        :id="`${idPrefix}-estimated-cost`"
        name="estimatedCost"
        :label="t('boats.maintenance.tasks.workOrder.estimatedCost')"
        type="number"
        inputmode="decimal"
        min="0"
        step="0.01"
        v-model="estimatedCost"
        :errors="errors"
      />
      <BaseInput
        :id="`${idPrefix}-estimated-duration`"
        name="estimatedDurationMinutes"
        :label="t('boats.maintenance.tasks.workOrder.estimatedDuration')"
        type="number"
        inputmode="numeric"
        min="0"
        step="1"
        v-model="estimatedDuration"
        :errors="errors"
      />
    </div>
  </fieldset>
</template>
