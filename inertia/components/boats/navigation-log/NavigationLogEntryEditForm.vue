<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useNetworkStatus } from '~/composables/use_network_status'
import { useOfflineQueue } from '~/composables/use_offline_queue'
import { useT } from '~/composables/use_t'
import { isoToDatetimeLocalValue, tzOffsetMinutes } from '~/utils/local_datetime'
import type { NavigationLogEntryRow } from '~/types/boat_show'

const props = defineProps<{
  boatId: number
  logId: number
  entry: NavigationLogEntryRow
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useT()
const { isOnline } = useNetworkStatus()
const { enqueue } = useOfflineQueue()

const form = useForm({
  recordedAt: isoToDatetimeLocalValue(props.entry.recordedAt),
  tzOffsetMinutes: tzOffsetMinutes(),
  latitude: props.entry.latitude,
  longitude: props.entry.longitude,
  cogDeg: props.entry.cogDeg,
  sogKn: props.entry.sogKn,
  sailConfig: props.entry.sailConfig ?? '',
  note: props.entry.note ?? '',
})

function handleSubmit() {
  form.tzOffsetMinutes = tzOffsetMinutes()
  const url = `/boats/${props.boatId}/navigation-logs/${props.logId}/entries/${props.entry.id}`

  if (!isOnline.value) {
    enqueue({
      type: 'update-navigation-log-entry',
      url,
      method: 'patch',
      payload: form.data() as unknown as Record<string, unknown>,
    })
    emit('close')
    return
  }

  form.patch(url, {
    preserveScroll: true,
    onSuccess: () => emit('close'),
  })
}
</script>

<template>
  <form class="space-y-3" @submit.prevent="handleSubmit">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <BaseInput
        v-model="form.recordedAt"
        type="datetime-local"
        id="entry-recorded-at"
        name="recordedAt"
        :label="t('navigation_logs.entries.recordedAt')"
        :error="form.errors.recordedAt"
        required
      />

      <BaseInput
        :model-value="form.cogDeg != null ? String(form.cogDeg) : ''"
        type="number"
        id="entry-cog"
        name="cogDeg"
        step="1"
        min="0"
        max="359"
        :label="t('navigation_logs.entries.cog')"
        :error="form.errors.cogDeg"
        @update:model-value="form.cogDeg = $event !== '' ? Number($event) : null"
      />

      <BaseInput
        :model-value="form.latitude != null ? String(form.latitude) : ''"
        type="number"
        id="entry-latitude"
        name="latitude"
        step="0.000001"
        min="-90"
        max="90"
        :label="t('navigation_logs.entries.latitude')"
        :error="form.errors.latitude"
        @update:model-value="form.latitude = $event !== '' ? Number($event) : null"
      />

      <BaseInput
        :model-value="form.longitude != null ? String(form.longitude) : ''"
        type="number"
        id="entry-longitude"
        name="longitude"
        step="0.000001"
        min="-180"
        max="180"
        :label="t('navigation_logs.entries.longitude')"
        :error="form.errors.longitude"
        @update:model-value="form.longitude = $event !== '' ? Number($event) : null"
      />

      <BaseInput
        :model-value="form.sogKn != null ? String(form.sogKn) : ''"
        type="number"
        id="entry-sog"
        name="sogKn"
        step="0.1"
        min="0"
        max="99"
        :label="t('navigation_logs.entries.sog')"
        :error="form.errors.sogKn"
        @update:model-value="form.sogKn = $event !== '' ? Number($event) : null"
      />

      <BaseInput
        v-model="form.sailConfig"
        type="text"
        id="entry-sail-config"
        name="sailConfig"
        :label="t('navigation_logs.entries.sailConfig')"
        :error="form.errors.sailConfig"
        :maxlength="255"
      />

      <BaseTextarea
        v-model="form.note"
        name="note"
        :label="t('navigation_logs.entries.note')"
        :error="form.errors.note"
        :rows="2"
        :maxlength="2000"
        compact
        class="sm:col-span-2"
      />
    </div>

    <div class="flex items-center justify-end gap-3">
      <BaseButton type="button" variant="ghost" size="sm" @click="emit('close')">
        {{ t('navigation_logs.form.cancel') }}
      </BaseButton>
      <BaseButton type="submit" variant="primary" size="sm" :disabled="form.processing">
        {{ t('navigation_logs.form.submitUpdate') }}
      </BaseButton>
    </div>
  </form>
</template>
