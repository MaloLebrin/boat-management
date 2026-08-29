<script setup lang="ts">
import { computed, ref } from 'vue'
import { useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useGpsBurst } from '~/composables/use_gps_burst'
import { useNetworkStatus } from '~/composables/use_network_status'
import { useOfflineQueue } from '~/composables/use_offline_queue'
import { useT } from '~/composables/use_t'
import { nowDatetimeLocalValue, tzOffsetMinutes } from '~/utils/local_datetime'

const props = defineProps<{
  boatId: number
  logId: number
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useT()
const { isOnline } = useNetworkStatus()
const { enqueue } = useOfflineQueue()
const { state: gpsState, errorKey: gpsErrorKey, result: gpsResult, capture } = useGpsBurst()

const showForm = ref(false)

const form = useForm({
  recordedAt: nowDatetimeLocalValue(),
  tzOffsetMinutes: tzOffsetMinutes(),
  latitude: null as number | null,
  longitude: null as number | null,
  gpsAccuracyM: null as number | null,
  cogDeg: null as number | null,
  sogKn: null as number | null,
  sailConfig: '',
  note: '',
})

const gpsSummaryText = computed(() => {
  const summary = gpsResult.value
  if (!summary) return null
  const coords = `${summary.latitude.toFixed(5)}, ${summary.longitude.toFixed(5)}`
  if (summary.sogKn !== null && summary.sogKn > 0 && summary.cogDeg !== null) {
    return `${coords} · ${t('navigation_logs.entries.cog')} ${summary.cogDeg}° · ${t('navigation_logs.entries.sog')} ${summary.sogKn.toFixed(1)} ${t('navigation_logs.entries.knSuffix')}`
  }
  if (summary.sogKn !== null) {
    return `${coords} · ${t('navigation_logs.entries.sogNearZero')}`
  }
  return coords
})

const gpsErrorText = computed(() => {
  if (gpsErrorKey.value === 'denied') return t('navigation_logs.entries.gpsDenied')
  if (gpsErrorKey.value === 'unsupported' || gpsErrorKey.value === 'unavailable') {
    return t('navigation_logs.entries.gpsUnavailable')
  }
  return null
})

// La capture démarre dans le handler du tap (contrainte iOS : watchPosition
// doit être déclenché par un geste utilisateur, au premier plan).
async function startCapture() {
  showForm.value = true
  form.reset()
  form.recordedAt = nowDatetimeLocalValue()
  form.tzOffsetMinutes = tzOffsetMinutes()

  const summary = await capture()
  if (summary) {
    form.latitude = summary.latitude
    form.longitude = summary.longitude
    form.gpsAccuracyM = Math.round(summary.gpsAccuracyM * 10) / 10
    form.cogDeg = summary.cogDeg
    form.sogKn = summary.sogKn
  }
}

function handleSubmit() {
  form.tzOffsetMinutes = tzOffsetMinutes()
  const url = `/boats/${props.boatId}/navigation-logs/${props.logId}/entries`

  if (!isOnline.value) {
    enqueue({
      type: 'create-navigation-log-entry',
      url,
      method: 'post',
      payload: form.data() as unknown as Record<string, unknown>,
    })
    closeForm()
    return
  }

  form.post(url, {
    preserveScroll: true,
    onSuccess: () => closeForm(),
  })
}

function closeForm() {
  showForm.value = false
  form.reset()
  emit('close')
}

defineExpose({ startCapture })
</script>

<template>
  <div>
    <BaseButton v-if="!showForm" type="button" variant="primary" size="sm" @click="startCapture">
      {{ t('navigation_logs.entries.addPoint') }}
    </BaseButton>

    <div v-else class="rounded-lg border border-border bg-surface-elevated p-4 space-y-3">
      <h3 class="text-sm font-semibold text-fg">{{ t('navigation_logs.entries.addTitle') }}</h3>

      <!-- Acquisition GPS -->
      <p v-if="gpsState === 'acquiring'" class="text-xs text-fg-muted animate-pulse">
        {{ t('navigation_logs.entries.acquiringGps') }}
      </p>
      <p v-else-if="gpsSummaryText" class="text-xs text-fg-muted">
        {{ gpsSummaryText }}
      </p>
      <p v-else-if="gpsErrorText" class="text-xs text-warning">
        {{ gpsErrorText }}
      </p>

      <form class="space-y-3" @submit.prevent="handleSubmit">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <BaseInput
            v-model="form.sailConfig"
            type="text"
            id="quick-entry-sail-config"
            name="sailConfig"
            :label="t('navigation_logs.entries.sailConfig')"
            :error="form.errors.sailConfig"
            :maxlength="255"
            :placeholder="t('navigation_logs.entries.sailConfigPlaceholder')"
          />

          <BaseTextarea
            v-model="form.note"
            name="note"
            :label="t('navigation_logs.entries.note')"
            :error="form.errors.note"
            :rows="2"
            :maxlength="2000"
            compact
            :placeholder="t('navigation_logs.entries.notePlaceholder')"
          />
        </div>

        <div class="flex items-center justify-end gap-3">
          <BaseButton type="button" variant="ghost" size="sm" @click="closeForm">
            {{ t('navigation_logs.form.cancel') }}
          </BaseButton>
          <BaseButton
            type="submit"
            variant="primary"
            size="sm"
            :disabled="form.processing || gpsState === 'acquiring'"
          >
            {{ t('navigation_logs.entries.submitPoint') }}
          </BaseButton>
        </div>
      </form>
    </div>
  </div>
</template>
