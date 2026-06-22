<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useT } from '~/composables/use_t'
import type { NavigationLogPortOption, NavigationLogRow } from '~/types/boat_show'

const props = defineProps<{
  boatId: number
  log: NavigationLogRow
  portOptions: NavigationLogPortOption[]
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useT()

const now = new Date()
const pad = (n: number) => String(n).padStart(2, '0')
const defaultArrivedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`

const SEA_STATES = ['calm', 'slight', 'moderate', 'rough', 'very_rough'] as const
</script>

<template>
  <div class="rounded-lg border border-brand/30 bg-surface-elevated p-6 space-y-4">
    <h3 class="font-semibold text-fg">{{ t('navigation_logs.form.closeTitle') }}</h3>

    <Form
      :action="{ url: `/boats/${boatId}/navigation-logs/${log.id}/close`, method: 'patch' }"
      #default="{ processing, errors }"
    >
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <!-- Arrival datetime -->
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('navigation_logs.fields.arrivedAt') }}
          </label>
          <input
            type="datetime-local"
            name="arrivedAt"
            :value="defaultArrivedAt"
            required
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <p v-if="errors.arrivedAt" class="mt-1 text-xs text-danger">{{ errors.arrivedAt }}</p>
        </div>

        <!-- Arrival port select -->
        <div v-if="portOptions.length > 0">
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('navigation_logs.fields.arrivalPortId') }}
          </label>
          <select
            name="arrivalPortId"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="">{{ t('navigation_logs.fields.noPort') }}</option>
            <option v-for="port in portOptions" :key="port.id" :value="port.id">
              {{ port.name }}
            </option>
          </select>
        </div>

        <!-- Arrival port free text -->
        <div>
          <label class="block text-sm font-medium text-fg mb-1">
            {{
              portOptions.length > 0
                ? t('navigation_logs.fields.arrivalPortName')
                : t('navigation_logs.fields.arrivalPort')
            }}
          </label>
          <input
            type="text"
            name="arrivalPortName"
            maxlength="255"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <!-- Distance -->
        <div>
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('navigation_logs.fields.distanceNm') }}
          </label>
          <input
            type="number"
            name="distanceNm"
            step="0.1"
            min="0"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <p v-if="errors.distanceNm" class="mt-1 text-xs text-danger">{{ errors.distanceNm }}</p>
        </div>

        <!-- Engine hours end -->
        <div>
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('navigation_logs.fields.engineHoursEnd') }}
          </label>
          <input
            type="number"
            name="engineHoursEnd"
            step="0.1"
            min="0"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <p v-if="errors.engineHoursEnd" class="mt-1 text-xs text-danger">
            {{ errors.engineHoursEnd }}
          </p>
        </div>

        <!-- Fuel consumed -->
        <div>
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('navigation_logs.fields.fuelConsumedLiters') }}
          </label>
          <input
            type="number"
            name="fuelConsumedLiters"
            step="0.001"
            min="0"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <p v-if="errors.fuelConsumedLiters" class="mt-1 text-xs text-danger">
            {{ errors.fuelConsumedLiters }}
          </p>
        </div>

        <!-- Wind force -->
        <div>
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('navigation_logs.fields.windForceBeaufort') }}
          </label>
          <input
            type="number"
            name="windForceBeaufort"
            step="1"
            min="0"
            max="12"
            :value="log.windForceBeaufort ?? ''"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <p v-if="errors.windForceBeaufort" class="mt-1 text-xs text-danger">
            {{ errors.windForceBeaufort }}
          </p>
        </div>

        <!-- Sea state -->
        <div>
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('navigation_logs.fields.seaState') }}
          </label>
          <select
            name="seaState"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="">{{ t('navigation_logs.fields.selectSeaState') }}</option>
            <option
              v-for="state in SEA_STATES"
              :key="state"
              :value="state"
              :selected="log.seaState === state"
            >
              {{ t(`navigation_logs.seaState.${state}`) }}
            </option>
          </select>
        </div>

        <!-- Crew count -->
        <div>
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('navigation_logs.fields.crewCount') }}
          </label>
          <input
            type="number"
            name="crewCount"
            step="1"
            min="0"
            :value="log.crewCount ?? ''"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <p v-if="errors.crewCount" class="mt-1 text-xs text-danger">{{ errors.crewCount }}</p>
        </div>

        <!-- Notes -->
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('navigation_logs.fields.notes') }}
          </label>
          <textarea
            name="notes"
            rows="2"
            maxlength="5000"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand resize-none"
            >{{ log.notes }}</textarea
          >
          <p v-if="errors.notes" class="mt-1 text-xs text-danger">{{ errors.notes }}</p>
        </div>
      </div>

      <div class="mt-4 flex items-center justify-end gap-3">
        <BaseButton type="button" variant="ghost" size="sm" @click="emit('close')">
          {{ t('navigation_logs.form.cancel') }}
        </BaseButton>
        <BaseButton type="submit" variant="primary" size="sm" :disabled="processing">
          {{ t('navigation_logs.form.submitClose') }}
        </BaseButton>
      </div>
    </Form>
  </div>
</template>
