<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useT } from '~/composables/use_t'
import type { BoatShowDetail } from '~/types/boat_show'

const props = defineProps<{
  boat: BoatShowDetail
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useT()

const today = new Date().toISOString().slice(0, 10)
</script>

<template>
  <div class="rounded-lg border border-border bg-surface-elevated p-6 space-y-4">
    <h3 class="font-semibold text-fg">{{ t('fuel_logs.form.createTitle') }}</h3>

    <Form
      :action="{ url: `/boats/${boat.id}/fuel-logs`, method: 'post' }"
      #default="{ processing, errors }"
    >
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <!-- Date -->
        <div>
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('fuel_logs.fields.fueledAt') }}
          </label>
          <input
            type="date"
            name="fueledAt"
            :value="today"
            required
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <p v-if="errors.fueledAt" class="mt-1 text-xs text-danger">{{ errors.fueledAt }}</p>
        </div>

        <!-- Quantity -->
        <div>
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('fuel_logs.fields.quantityLiters') }}
          </label>
          <input
            type="number"
            name="quantityLiters"
            step="0.001"
            min="0.001"
            required
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <p v-if="errors.quantityLiters" class="mt-1 text-xs text-danger">
            {{ errors.quantityLiters }}
          </p>
        </div>

        <!-- Price per liter -->
        <div>
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('fuel_logs.fields.pricePerLiter') }}
          </label>
          <input
            type="number"
            name="pricePerLiter"
            step="0.0001"
            min="0"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <p v-if="errors.pricePerLiter" class="mt-1 text-xs text-danger">
            {{ errors.pricePerLiter }}
          </p>
        </div>

        <!-- Total cost -->
        <div>
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('fuel_logs.fields.totalCost') }}
          </label>
          <input
            type="number"
            name="totalCost"
            step="0.01"
            min="0"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <p v-if="errors.totalCost" class="mt-1 text-xs text-danger">{{ errors.totalCost }}</p>
        </div>

        <!-- Engine -->
        <div v-if="boat.engines.length > 0">
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('fuel_logs.fields.boatEngineId') }}
          </label>
          <select
            name="boatEngineId"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="">{{ t('fuel_logs.fields.noEngine') }}</option>
            <option v-for="engine in boat.engines" :key="engine.id" :value="engine.id">
              {{ engine.kind }}{{ engine.brand ? ` — ${engine.brand}` : '' }}
              {{ engine.model ? engine.model : '' }}
            </option>
          </select>
          <p v-if="errors.boatEngineId" class="mt-1 text-xs text-danger">
            {{ errors.boatEngineId }}
          </p>
        </div>

        <!-- Engine hours -->
        <div>
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('fuel_logs.fields.engineHoursAtFueling') }}
          </label>
          <input
            type="number"
            name="engineHoursAtFueling"
            step="0.1"
            min="0"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <p v-if="errors.engineHoursAtFueling" class="mt-1 text-xs text-danger">
            {{ errors.engineHoursAtFueling }}
          </p>
        </div>

        <!-- Supplier -->
        <div :class="boat.engines.length > 0 ? '' : 'sm:col-span-2'">
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('fuel_logs.fields.supplier') }}
          </label>
          <input
            type="text"
            name="supplier"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <p v-if="errors.supplier" class="mt-1 text-xs text-danger">{{ errors.supplier }}</p>
        </div>

        <!-- Notes -->
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('fuel_logs.fields.notes') }}
          </label>
          <textarea
            name="notes"
            rows="2"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand resize-none"
          />
          <p v-if="errors.notes" class="mt-1 text-xs text-danger">{{ errors.notes }}</p>
        </div>
      </div>

      <div class="mt-4 flex items-center justify-end gap-3">
        <BaseButton type="button" variant="ghost" size="sm" @click="emit('close')">
          {{ t('fuel_logs.form.cancel') }}
        </BaseButton>
        <BaseButton type="submit" variant="primary" size="sm" :disabled="processing">
          {{ t('fuel_logs.form.submit') }}
        </BaseButton>
      </div>
    </Form>
  </div>
</template>
