<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useNetworkStatus } from '~/composables/use_network_status'
import { useOfflineQueue } from '~/composables/use_offline_queue'
import { useT } from '~/composables/use_t'
import type { NavigationLogRow } from '~/types/boat_show'

const props = defineProps<{
  boatId: number
  log: NavigationLogRow
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useT()
const { isOnline } = useNetworkStatus()
const { enqueue } = useOfflineQueue()

const SEA_STATES = ['calm', 'slight', 'moderate', 'rough', 'very_rough'] as const

const form = useForm({
  windForceBeaufort: props.log.windForceBeaufort,
  seaState: props.log.seaState ?? '',
  crewCount: props.log.crewCount,
  notes: props.log.notes ?? '',
})

function handleSubmit() {
  if (!isOnline.value) {
    enqueue({
      type: 'update-navigation-log',
      url: `/boats/${props.boatId}/navigation-logs/${props.log.id}`,
      method: 'patch',
      payload: {
        ...form.data(),
        _expectedUpdatedAt: props.log.updatedAt,
      } as Record<string, unknown>,
    })
    emit('close')
    return
  }

  form.patch(`/boats/${props.boatId}/navigation-logs/${props.log.id}`, {
    preserveScroll: true,
    onSuccess: () => emit('close'),
  })
}
</script>

<template>
  <div class="rounded-lg border border-border bg-surface-elevated p-6 space-y-4">
    <h3 class="font-semibold text-fg">{{ t('navigation_logs.form.updateTitle') }}</h3>

    <form @submit.prevent="handleSubmit">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          :rows="3"
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
          {{ t('navigation_logs.form.submitUpdate') }}
        </BaseButton>
      </div>
    </form>
  </div>
</template>
