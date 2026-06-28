<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
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

const form = useForm({
  fueledAt: new Date().toLocaleDateString('en-CA'),
  quantityLiters: '' as string | number,
  pricePerLiter: '' as string | number,
  totalCost: '' as string | number,
  boatEngineId: '' as string | number,
  engineHoursAtFueling: '' as string | number,
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
          @update:model-value="form.pricePerLiter = Number($event) || 0"
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
          @update:model-value="form.totalCost = Number($event) || 0"
        />

        <!-- Engine -->
        <div v-if="boat.engines.length > 0">
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('fuel_logs.fields.boatEngineId') }}
          </label>
          <select
            v-model="form.boatEngineId"
            name="boatEngineId"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="">{{ t('fuel_logs.fields.noEngine') }}</option>
            <option v-for="engine in boat.engines" :key="engine.id" :value="engine.id">
              {{ engine.kind }}{{ engine.brand ? ` — ${engine.brand}` : '' }}
              {{ engine.model ? engine.model : '' }}
            </option>
          </select>
          <p v-if="form.errors.boatEngineId" class="mt-1 text-xs text-danger">
            {{ form.errors.boatEngineId }}
          </p>
        </div>

        <BaseInput
          :model-value="form.engineHoursAtFueling != null ? String(form.engineHoursAtFueling) : ''"
          type="number"
          id="engineHoursAtFueling"
          name="engineHoursAtFueling"
          step="0.1"
          min="0"
          :label="t('fuel_logs.fields.engineHoursAtFueling')"
          :error="form.errors.engineHoursAtFueling"
          @update:model-value="form.engineHoursAtFueling = Number($event) || 0"
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

        <!-- Notes -->
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('fuel_logs.fields.notes') }}
          </label>
          <textarea
            v-model="form.notes"
            name="notes"
            rows="2"
            maxlength="2000"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand resize-none"
          />
          <p v-if="form.errors.notes" class="mt-1 text-xs text-danger">{{ form.errors.notes }}</p>
        </div>
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
