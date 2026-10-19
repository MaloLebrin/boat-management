<script setup lang="ts">
import { computed } from 'vue'
import BaseAlert from '~/components/base/BaseAlert.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { SignalKConnectionState, SignalKErrorKey } from '~/lib/signalk/types'

const props = defineProps<{
  state: SignalKConnectionState
  errorKey: SignalKErrorKey | null
  lastDeltaAt: number | null
  /** Ce visiteur ne peut pas ingérer : il lit les dernières valeurs, sans flux. */
  readOnly: boolean
  enabled: boolean
  /** Dernier lot reçu par FleetAi, côté serveur (ISO). */
  lastSeenAt: string | null
}>()

const { t } = useT()
const { formatDateTime } = useDateFormat()

const variant = computed(() => {
  if (props.readOnly || !props.enabled) return 'info' as const
  if (props.state === 'open') return 'success' as const
  if (props.state === 'error') return 'danger' as const
  if (props.state === 'reconnecting') return 'warning' as const
  return 'info' as const
})

const title = computed(() => {
  if (!props.enabled) return t('instruments.banner.disabled')
  if (props.readOnly) return t('instruments.banner.readOnly')
  return t(`instruments.banner.state.${props.state}`)
})

const detail = computed(() => {
  if (!props.enabled || props.readOnly) return null
  if (props.errorKey) return t(`instruments.banner.error.${props.errorKey}`)
  if (props.state === 'open') return t('instruments.banner.screenOpen')
  return null
})
</script>

<template>
  <BaseAlert :variant="variant" :title="title" data-testid="instrument-banner">
    <p v-if="detail">{{ detail }}</p>
    <p v-if="lastDeltaAt !== null">
      {{ t('instruments.banner.lastDelta', { date: formatDateTime(new Date(lastDeltaAt)) }) }}
    </p>
    <p v-else-if="lastSeenAt">
      {{ t('instruments.banner.lastSeen', { date: formatDateTime(lastSeenAt) }) }}
    </p>
  </BaseAlert>
</template>
