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
const { isOnline } = useNetworkStatus()
const { enqueue } = useOfflineQueue()

const now = new Date()
const pad = (n: number) => String(n).padStart(2, '0')
const defaultArrivedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`

const SEA_STATES = ['calm', 'slight', 'moderate', 'rough', 'very_rough'] as const

const arrivalPortOptions = computed(() =>
  props.portOptions.map((p) => ({ value: String(p.id), label: p.name }))
)

const seaStateOptions = computed(() =>
  SEA_STATES.map((s) => ({
    value: s,
    label: t(`navigation_logs.seaState.${s}`),
  }))
)

const form = useForm({
  arrivedAt: defaultArrivedAt,
  arrivalPortId: '' as string | number,
  arrivalPortName: '',
  distanceNm: null as number | null,
  engineHoursEnd: null as number | null,
  fuelConsumedLiters: null as number | null,
  windForceBeaufort: props.log.windForceBeaufort,
  seaState: props.log.seaState ?? '',
  crewCount: props.log.crewCount,
  notes: props.log.notes ?? '',
})

function handleSubmit() {
  if (!isOnline.value) {
    enqueue({
      type: 'close-navigation-log',
      url: `/boats/${props.boatId}/navigation-logs/${props.log.id}/close`,
      method: 'patch',
      payload: {
        ...form.data(),
        _expectedUpdatedAt: props.log.updatedAt,
      } as Record<string, unknown>,
    })
    emit('close')
    return
  }

  form.patch(`/boats/${props.boatId}/navigation-logs/${props.log.id}/close`, {
    preserveScroll: true,
    onSuccess: () => emit('close'),
  })
}
</script>

<template>
  <div class="rounded-lg border border-brand/30 bg-surface-elevated p-6 space-y-4">
    <h3 class="font-semibold text-fg">{{ t('navigation_logs.form.closeTitle') }}</h3>

    <form @submit.prevent="handleSubmit">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseInput
          v-model="form.arrivedAt"
          type="datetime-local"
          id="arrivedAt"
          name="arrivedAt"
          class="sm:col-span-2"
          :label="t('navigation_logs.fields.arrivedAt')"
          :error="form.errors.arrivedAt"
          required
        />

        <!-- Arrival port select -->
        <BaseSelect
          v-if="portOptions.length > 0"
          v-model="form.arrivalPortId"
          name="arrivalPortId"
          :label="t('navigation_logs.fields.arrivalPortId')"
          :options="arrivalPortOptions"
          :error="form.errors.arrivalPortId"
          allow-empty
          :placeholder="t('navigation_logs.fields.noPort')"
        />

        <BaseInput
          v-model="form.arrivalPortName"
          type="text"
          id="arrivalPortName"
          name="arrivalPortName"
          maxlength="255"
          :label="
            portOptions.length > 0
              ? t('navigation_logs.fields.arrivalPortName')
              : t('navigation_logs.fields.arrivalPort')
          "
        />

        <BaseInput
          :model-value="form.distanceNm != null ? String(form.distanceNm) : ''"
          type="number"
          id="distanceNm"
          name="distanceNm"
          step="0.1"
          min="0"
          :label="t('navigation_logs.fields.distanceNm')"
          :error="form.errors.distanceNm"
          @update:model-value="form.distanceNm = $event !== '' ? Number($event) : null"
        />

        <BaseInput
          :model-value="form.engineHoursEnd != null ? String(form.engineHoursEnd) : ''"
          type="number"
          id="engineHoursEnd"
          name="engineHoursEnd"
          step="0.1"
          min="0"
          :label="t('navigation_logs.fields.engineHoursEnd')"
          :error="form.errors.engineHoursEnd"
          @update:model-value="form.engineHoursEnd = $event !== '' ? Number($event) : null"
        />

        <BaseInput
          :model-value="form.fuelConsumedLiters != null ? String(form.fuelConsumedLiters) : ''"
          type="number"
          id="fuelConsumedLiters"
          name="fuelConsumedLiters"
          step="0.001"
          min="0"
          :label="t('navigation_logs.fields.fuelConsumedLiters')"
          :error="form.errors.fuelConsumedLiters"
          @update:model-value="form.fuelConsumedLiters = $event !== '' ? Number($event) : null"
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
        <BaseSelect
          v-model="form.seaState"
          name="seaState"
          :label="t('navigation_logs.fields.seaState')"
          :options="seaStateOptions"
          :error="form.errors.seaState"
          allow-empty
          :placeholder="t('navigation_logs.fields.selectSeaState')"
        />

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
          {{ t('navigation_logs.form.submitClose') }}
        </BaseButton>
      </div>
    </form>
  </div>
</template>
