<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import { computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCombobox, { type ComboboxOption } from '~/components/base/BaseCombobox.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useT } from '~/composables/use_t'
import type { PortNameOption } from '#shared/types/port'

const props = defineProps<{
  boatId: number
  /** Ports de l'organisation proposés en suggestion (#579) — saisie libre conservée. */
  portOptions?: PortNameOption[]
}>()

const { t } = useT()

const portSuggestions = computed<ComboboxOption[]>(() =>
  (props.portOptions ?? []).map((port) => ({ value: String(port.id), label: port.name }))
)

const form = useForm({
  portName: '',
  startedAt: '',
  endedAt: '',
  cost: '',
  notes: '',
})

function submit() {
  form.post(`/boats/${props.boatId}/port-stays`, {
    preserveScroll: true,
    onSuccess: () => form.reset(),
  })
}
</script>

<template>
  <div
    class="rounded-(--radius-card) border border-border bg-surface-elevated p-5 shadow-(--shadow-xs)"
  >
    <h3 class="text-base font-semibold text-fg mb-4">{{ t('budget.portStay.formTitle') }}</h3>
    <form class="grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent="submit">
      <BaseCombobox
        id="portStayPortName"
        v-model="form.portName"
        :label="t('budget.portStay.portName')"
        :placeholder="t('budget.portStay.portNamePlaceholder')"
        :hint="portSuggestions.length > 0 ? t('budget.portStay.portNameHint') : undefined"
        :empty-label="t('budget.portStay.noPortMatch')"
        :options="portSuggestions"
        :error="form.errors.portName"
        required
      />
      <BaseInput
        v-model="form.startedAt"
        type="date"
        :label="t('budget.portStay.startedAt')"
        :error="form.errors.startedAt"
        required
      />
      <BaseInput
        v-model="form.endedAt"
        type="date"
        :label="t('budget.portStay.endedAt')"
        :error="form.errors.endedAt"
      />
      <BaseInput
        v-model="form.cost"
        type="number"
        step="0.01"
        min="0"
        :label="t('budget.portStay.cost')"
        :error="form.errors.cost"
      />
      <div class="sm:col-span-2">
        <BaseTextarea
          v-model="form.notes"
          :label="t('budget.portStay.notes')"
          :error="form.errors.notes"
          :rows="2"
        />
      </div>
      <div class="sm:col-span-2 flex justify-end">
        <BaseButton type="submit" :loading="form.processing">
          {{ t('budget.portStay.submit') }}
        </BaseButton>
      </div>
    </form>
  </div>
</template>
