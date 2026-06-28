<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
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
  engineHoursStart: null as number | null,
  windForceBeaufort: null as number | null,
  seaState: '',
  crewCount: null as number | null,
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
        <BaseInput
          v-model="form.departedAt"
          type="datetime-local"
          id="departedAt"
          name="departedAt"
          class="sm:col-span-2"
          :label="t('navigation_logs.fields.departedAt')"
          :error="form.errors.departedAt"
          required
        />

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

        <BaseInput
          v-model="form.departurePortName"
          type="text"
          id="departurePortName"
          name="departurePortName"
          maxlength="255"
          :label="
            portOptions.length > 0
              ? t('navigation_logs.fields.departurePortName')
              : t('navigation_logs.fields.departurePort')
          "
        />

        <BaseInput
          :model-value="form.engineHoursStart != null ? String(form.engineHoursStart) : ''"
          type="number"
          id="engineHoursStart"
          name="engineHoursStart"
          step="0.1"
          min="0"
          :label="t('navigation_logs.fields.engineHoursStart')"
          :error="form.errors.engineHoursStart"
          @update:model-value="form.engineHoursStart = $event !== '' ? Number($event) : null"
        />

        <BaseInput
          :model-value="form.windForceBeaufort != null ? String(form.windForceBeaufort) : ''"
          type="number"
          id="windForceBeaufort"
          name="windForceBeaufort"
          step="1"
          min="0"
          max="12"
          :label="t('navigation_logs.fields.windForceBeaufort')"
          :error="form.errors.windForceBeaufort"
          @update:model-value="form.windForceBeaufort = $event !== '' ? Number($event) : null"
        />

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

        <BaseInput
          :model-value="form.crewCount != null ? String(form.crewCount) : ''"
          type="number"
          id="crewCount"
          name="crewCount"
          step="1"
          min="0"
          :label="t('navigation_logs.fields.crewCount')"
          :error="form.errors.crewCount"
          @update:model-value="form.crewCount = $event !== '' ? Number($event) : null"
        />

        <BaseTextarea
          v-model="form.notes"
          name="notes"
          :label="t('navigation_logs.fields.notes')"
          :error="form.errors.notes"
          :rows="2"
          :maxlength="5000"
          compact
          class="sm:col-span-2"
        />
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
