<script setup lang="ts">
import { computed } from 'vue'
import { useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useNetworkStatus } from '~/composables/use_network_status'
import { useOfflineQueue } from '~/composables/use_offline_queue'
import { useT } from '~/composables/use_t'
import type { BoatShowDetail } from '~/types/boat_show'

const props = defineProps<{
  boat: BoatShowDetail
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useT()
const { isOnline } = useNetworkStatus()
const { enqueue } = useOfflineQueue()

const engineOptions = computed(() =>
  props.boat.engines.map((e) => ({
    value: String(e.id),
    label: `${e.kind}${e.brand ? ` — ${e.brand}` : ''}${e.model ? ` ${e.model}` : ''}`,
  }))
)

const form = useForm({
  fueledAt: new Date().toLocaleDateString('en-CA'),
  quantityLiters: '' as string | number,
  pricePerLiter: null as number | null,
  totalCost: null as number | null,
  boatEngineId: '' as string | number,
  engineHoursAtFueling: null as number | null,
  supplier: '',
  notes: '',
})

function handleSubmit() {
  if (!isOnline.value) {
    enqueue({
      type: 'create-fuel-log',
      url: `/boats/${props.boat.id}/fuel-logs`,
      method: 'post',
      payload: form.data() as Record<string, unknown>,
    })
    emit('close')
    return
  }

  form.post(`/boats/${props.boat.id}/fuel-logs`, {
    preserveScroll: true,
    onSuccess: () => emit('close'),
  })
}
</script>

<template>
  <div class="rounded-lg border border-border bg-surface-elevated p-6 space-y-4">
    <h3 class="font-semibold text-fg">{{ t('fuel_logs.form.createTitle') }}</h3>

    <form @submit.prevent="handleSubmit">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseInput
          v-model="form.fueledAt"
          type="date"
          id="fueledAt"
          name="fueledAt"
          :label="t('fuel_logs.fields.fueledAt')"
          :error="form.errors.fueledAt"
          required
        />

        <BaseInput
          :model-value="form.quantityLiters != null ? String(form.quantityLiters) : ''"
          type="number"
          id="quantityLiters"
          name="quantityLiters"
          step="0.001"
          min="0.001"
          :label="t('fuel_logs.fields.quantityLiters')"
          :error="form.errors.quantityLiters"
          required
          @update:model-value="form.quantityLiters = Number($event) || 0"
        />

        <BaseInput
          :model-value="form.pricePerLiter != null ? String(form.pricePerLiter) : ''"
          type="number"
          id="pricePerLiter"
          name="pricePerLiter"
          step="0.0001"
          min="0"
          :label="t('fuel_logs.fields.pricePerLiter')"
          :error="form.errors.pricePerLiter"
          @update:model-value="form.pricePerLiter = $event !== '' ? Number($event) : null"
        />

        <BaseInput
          :model-value="form.totalCost != null ? String(form.totalCost) : ''"
          type="number"
          id="totalCost"
          name="totalCost"
          step="0.01"
          min="0"
          :label="t('fuel_logs.fields.totalCost')"
          :error="form.errors.totalCost"
          @update:model-value="form.totalCost = $event !== '' ? Number($event) : null"
        />

        <!-- Engine -->
        <BaseSelect
          v-if="boat.engines.length > 0"
          v-model="form.boatEngineId"
          name="boatEngineId"
          :label="t('fuel_logs.fields.boatEngineId')"
          :options="engineOptions"
          :error="form.errors.boatEngineId"
          allow-empty
          :placeholder="t('fuel_logs.fields.noEngine')"
        />

        <BaseInput
          :model-value="form.engineHoursAtFueling != null ? String(form.engineHoursAtFueling) : ''"
          type="number"
          id="engineHoursAtFueling"
          name="engineHoursAtFueling"
          step="0.1"
          min="0"
          :label="t('fuel_logs.fields.engineHoursAtFueling')"
          :error="form.errors.engineHoursAtFueling"
          @update:model-value="form.engineHoursAtFueling = $event !== '' ? Number($event) : null"
        />

        <BaseInput
          v-model="form.supplier"
          type="text"
          id="supplier"
          name="supplier"
          maxlength="500"
          :class="boat.engines.length > 0 ? '' : 'sm:col-span-2'"
          :label="t('fuel_logs.fields.supplier')"
          :error="form.errors.supplier"
        />

        <BaseTextarea
          v-model="form.notes"
          name="notes"
          :label="t('fuel_logs.fields.notes')"
          :error="form.errors.notes"
          :rows="2"
          :maxlength="2000"
          compact
          class="sm:col-span-2"
        />
      </div>

      <div class="mt-4 flex items-center justify-end gap-3">
        <BaseButton type="button" variant="ghost" size="sm" @click="emit('close')">
          {{ t('fuel_logs.form.cancel') }}
        </BaseButton>
        <BaseButton type="submit" variant="primary" size="sm" :disabled="form.processing">
          {{ t('fuel_logs.form.submit') }}
        </BaseButton>
      </div>
    </form>
  </div>
</template>
