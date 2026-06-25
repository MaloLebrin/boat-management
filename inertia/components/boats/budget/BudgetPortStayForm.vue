<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useT } from '~/composables/use_t'

const props = defineProps<{
  boatId: number
}>()

const { t } = useT()

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
      <BaseInput
        v-model="form.portName"
        :label="t('budget.portStay.portName')"
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
