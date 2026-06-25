<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useT } from '~/composables/use_t'

const props = defineProps<{
  boatId: number
}>()

const { t } = useT()

const form = useForm({
  label: '',
  amount: '',
  date: '',
  category: '',
  description: '',
})

const categoryOptions = [
  { value: '', label: '' },
  { value: 'maintenance', label: t('budget.entries.categories.maintenance') },
  { value: 'fuel', label: t('budget.entries.categories.fuel') },
  { value: 'documents', label: t('budget.entries.categories.documents') },
  { value: 'port', label: t('budget.entries.categories.port') },
  { value: 'equipment', label: t('budget.entries.categories.equipment') },
  { value: 'other', label: t('budget.entries.categories.other') },
]

function submit() {
  form.post(`/boats/${props.boatId}/budget/entries`, {
    preserveScroll: true,
    onSuccess: () => form.reset(),
  })
}
</script>

<template>
  <div
    class="rounded-(--radius-card) border border-border bg-surface-elevated p-5 shadow-(--shadow-xs)"
  >
    <h3 class="text-base font-semibold text-fg mb-4">{{ t('budget.entries.formTitle') }}</h3>
    <form class="grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent="submit">
      <BaseInput
        v-model="form.label"
        :label="t('budget.entries.label')"
        :error="form.errors.label"
        required
      />
      <BaseInput
        v-model="form.amount"
        type="number"
        step="0.01"
        min="0"
        :label="t('budget.entries.amount')"
        :error="form.errors.amount"
        required
      />
      <BaseInput
        v-model="form.date"
        type="date"
        :label="t('budget.entries.date')"
        :error="form.errors.date"
        required
      />
      <BaseSelect
        v-model="form.category"
        :label="t('budget.entries.category')"
        :options="categoryOptions"
        :error="form.errors.category"
      />
      <div class="sm:col-span-2">
        <BaseTextarea
          v-model="form.description"
          :label="t('budget.entries.description')"
          :error="form.errors.description"
          :rows="2"
        />
      </div>
      <div class="sm:col-span-2 flex justify-end">
        <BaseButton type="submit" :loading="form.processing">
          {{ t('budget.entries.submit') }}
        </BaseButton>
      </div>
    </form>
  </div>
</template>
