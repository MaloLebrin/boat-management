<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
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
        <!-- Date -->
        <div>
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('fuel_logs.fields.fueledAt') }}
          </label>
          <input
            v-model="form.fueledAt"
            type="date"
            name="fueledAt"
            required
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <p v-if="form.errors.fueledAt" class="mt-1 text-xs text-danger">
            {{ form.errors.fueledAt }}
          </p>
        </div>

        <!-- Quantity -->
        <div>
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('fuel_logs.fields.quantityLiters') }}
          </label>
          <input
            v-model="form.quantityLiters"
            type="number"
            name="quantityLiters"
            step="0.001"
            min="0.001"
            required
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <p v-if="form.errors.quantityLiters" class="mt-1 text-xs text-danger">
            {{ form.errors.quantityLiters }}
          </p>
        </div>

        <!-- Price per liter -->
        <div>
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('fuel_logs.fields.pricePerLiter') }}
          </label>
          <input
            v-model="form.pricePerLiter"
            type="number"
            name="pricePerLiter"
            step="0.0001"
            min="0"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <p v-if="form.errors.pricePerLiter" class="mt-1 text-xs text-danger">
            {{ form.errors.pricePerLiter }}
          </p>
        </div>

        <!-- Total cost -->
        <div>
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('fuel_logs.fields.totalCost') }}
          </label>
          <input
            v-model="form.totalCost"
            type="number"
            name="totalCost"
            step="0.01"
            min="0"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <p v-if="form.errors.totalCost" class="mt-1 text-xs text-danger">
            {{ form.errors.totalCost }}
          </p>
        </div>

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

        <!-- Engine hours -->
        <div>
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('fuel_logs.fields.engineHoursAtFueling') }}
          </label>
          <input
            v-model="form.engineHoursAtFueling"
            type="number"
            name="engineHoursAtFueling"
            step="0.1"
            min="0"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <p v-if="form.errors.engineHoursAtFueling" class="mt-1 text-xs text-danger">
            {{ form.errors.engineHoursAtFueling }}
          </p>
        </div>

        <!-- Supplier -->
        <div :class="boat.engines.length > 0 ? '' : 'sm:col-span-2'">
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('fuel_logs.fields.supplier') }}
          </label>
          <input
            v-model="form.supplier"
            type="text"
            name="supplier"
            maxlength="500"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <p v-if="form.errors.supplier" class="mt-1 text-xs text-danger">
            {{ form.errors.supplier }}
          </p>
        </div>

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
