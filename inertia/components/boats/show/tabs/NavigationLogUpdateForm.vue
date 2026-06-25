<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
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
  windForceBeaufort: props.log.windForceBeaufort ?? ('' as string | number),
  seaState: props.log.seaState ?? '',
  crewCount: props.log.crewCount ?? ('' as string | number),
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
            rows="3"
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
          {{ t('navigation_logs.form.submitUpdate') }}
        </BaseButton>
      </div>
    </form>
  </div>
</template>
