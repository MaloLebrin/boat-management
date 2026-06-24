<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import { useNetworkStatus } from '~/composables/use_network_status'
import { useOfflineQueue } from '~/composables/use_offline_queue'
import { useT } from '~/composables/use_t'
import type { BoatShowDetail, NavigationLogPortOption } from '~/types/boat_show'

const props = defineProps<{
  boat: BoatShowDetail
  portOptions: NavigationLogPortOption[]
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useT()
const { isOnline } = useNetworkStatus()
const { enqueue } = useOfflineQueue()

const now = new Date()
const pad = (n: number) => String(n).padStart(2, '0')
const defaultDepartedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`

const SEA_STATES = ['calm', 'slight', 'moderate', 'rough', 'very_rough'] as const

const form = useForm({
  departedAt: defaultDepartedAt,
  departurePortId: '' as string | number,
  departurePortName: '',
  engineHoursStart: '' as string | number,
  windForceBeaufort: '' as string | number,
  seaState: '',
  crewCount: '' as string | number,
  notes: '',
})

function handleSubmit() {
  if (!isOnline.value) {
    enqueue({
      type: 'create-navigation-log',
      url: `/boats/${props.boat.id}/navigation-logs`,
      method: 'post',
      payload: form.data() as Record<string, unknown>,
    })
    emit('close')
    return
  }

  form.post(`/boats/${props.boat.id}/navigation-logs`, {
    preserveScroll: true,
    onSuccess: () => emit('close'),
  })
}
</script>

<template>
  <div class="rounded-lg border border-border bg-surface-elevated p-6 space-y-4">
    <h3 class="font-semibold text-fg">{{ t('navigation_logs.form.createTitle') }}</h3>

    <form @submit.prevent="handleSubmit">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <!-- Departure datetime -->
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('navigation_logs.fields.departedAt') }}
          </label>
          <input
            v-model="form.departedAt"
            type="datetime-local"
            name="departedAt"
            required
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <p v-if="form.errors.departedAt" class="mt-1 text-xs text-danger">
            {{ form.errors.departedAt }}
          </p>
        </div>

        <!-- Departure port select -->
        <div v-if="portOptions.length > 0">
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('navigation_logs.fields.departurePortId') }}
          </label>
          <select
            v-model="form.departurePortId"
            name="departurePortId"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="">{{ t('navigation_logs.fields.noPort') }}</option>
            <option v-for="port in portOptions" :key="port.id" :value="port.id">
              {{ port.name }}
            </option>
          </select>
        </div>

        <!-- Departure port free text -->
        <div>
          <label class="block text-sm font-medium text-fg mb-1">
            {{
              portOptions.length > 0
                ? t('navigation_logs.fields.departurePortName')
                : t('navigation_logs.fields.departurePort')
            }}
          </label>
          <input
            v-model="form.departurePortName"
            type="text"
            name="departurePortName"
            maxlength="255"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <!-- Engine hours start -->
        <div>
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('navigation_logs.fields.engineHoursStart') }}
          </label>
          <input
            v-model="form.engineHoursStart"
            type="number"
            name="engineHoursStart"
            step="0.1"
            min="0"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <p v-if="form.errors.engineHoursStart" class="mt-1 text-xs text-danger">
            {{ form.errors.engineHoursStart }}
          </p>
        </div>

        <!-- Wind force -->
        <div>
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('navigation_logs.fields.windForceBeaufort') }}
          </label>
          <input
            v-model="form.windForceBeaufort"
            type="number"
            name="windForceBeaufort"
            step="1"
            min="0"
            max="12"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <p v-if="form.errors.windForceBeaufort" class="mt-1 text-xs text-danger">
            {{ form.errors.windForceBeaufort }}
          </p>
        </div>

        <!-- Sea state -->
        <div>
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('navigation_logs.fields.seaState') }}
          </label>
          <select
            v-model="form.seaState"
            name="seaState"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="">{{ t('navigation_logs.fields.selectSeaState') }}</option>
            <option v-for="state in SEA_STATES" :key="state" :value="state">
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
            v-model="form.crewCount"
            type="number"
            name="crewCount"
            step="1"
            min="0"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <p v-if="form.errors.crewCount" class="mt-1 text-xs text-danger">
            {{ form.errors.crewCount }}
          </p>
        </div>

        <!-- Notes -->
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-fg mb-1">
            {{ t('navigation_logs.fields.notes') }}
          </label>
          <textarea
            v-model="form.notes"
            name="notes"
            rows="2"
            maxlength="5000"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand resize-none"
          />
          <p v-if="form.errors.notes" class="mt-1 text-xs text-danger">{{ form.errors.notes }}</p>
        </div>
      </div>

      <div class="mt-4 flex items-center justify-end gap-3">
        <BaseButton type="button" variant="ghost" size="sm" @click="emit('close')">
          {{ t('navigation_logs.form.cancel') }}
        </BaseButton>
        <BaseButton type="submit" variant="primary" size="sm" :disabled="form.processing">
          {{ t('navigation_logs.form.submit') }}
        </BaseButton>
      </div>
    </form>
  </div>
</template>
