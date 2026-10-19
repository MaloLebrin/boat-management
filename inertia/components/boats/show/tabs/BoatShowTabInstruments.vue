<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import InstrumentAlarmsList from '~/components/boats/show/tabs/instruments/InstrumentAlarmsList.vue'
import InstrumentCategoryGrid from '~/components/boats/show/tabs/instruments/InstrumentCategoryGrid.vue'
import InstrumentConnectionBanner from '~/components/boats/show/tabs/instruments/InstrumentConnectionBanner.vue'
import InstrumentEmptyState from '~/components/boats/show/tabs/instruments/InstrumentEmptyState.vue'
import InstrumentSourceForm from '~/components/boats/show/tabs/instruments/InstrumentSourceForm.vue'
import { useInstrumentStream } from '~/composables/use_instrument_stream'
import { useT } from '~/composables/use_t'
import { useTelemetrySync } from '~/composables/use_telemetry_sync'
import { buildReadings } from '~/lib/signalk/display'
import type { InstrumentsTabProps } from '#shared/types/instruments'

const props = defineProps<{ boatId: number; instruments: InstrumentsTabProps }>()

const { t } = useT()
const source = computed(() => props.instruments.source)

/** Sans le droit d'ingérer, le visiteur lit les dernières valeurs sans ouvrir de flux (D3). */
const canStream = computed(() => Boolean(source.value?.enabled) && props.instruments.can.ingest)

const sync = useTelemetrySync({
  boatId: () => props.boatId,
  sourceId: () => source.value?.id ?? null,
})
const stream = useInstrumentStream({
  source: () => (canStream.value ? source.value : null),
  onSamples: (samples) => sync.push(samples),
})

const now = ref(Date.now())
let clock: ReturnType<typeof setInterval> | null = null

const readings = computed(() => buildReadings(props.instruments.latest, stream.latestByPath.value))
const alarmReadings = computed(() =>
  readings.value.filter((reading) => reading.category === 'notifications')
)

/** Une nouvelle adresse, un nouveau jeton ou une réactivation relancent le flux. */
const connectionKey = computed(() =>
  [
    source.value?.id,
    source.value?.baseUrl,
    source.value?.token,
    source.value?.vesselContext,
    canStream.value,
  ].join('|')
)

async function startStreaming() {
  stream.stop()
  await sync.stop()
  if (!canStream.value) return
  await sync.start()
  stream.start()
}

onMounted(() => {
  clock = setInterval(() => (now.value = Date.now()), 5000)
  void startStreaming()
})
watch(connectionKey, () => void startStreaming())
onBeforeUnmount(() => {
  if (clock !== null) clearInterval(clock)
})
</script>

<template>
  <div class="space-y-8" data-testid="tab-instruments">
    <template v-if="source">
      <InstrumentConnectionBanner
        :state="stream.connectionState.value"
        :error-key="stream.errorKey.value"
        :last-delta-at="stream.lastDeltaAt.value"
        :read-only="!instruments.can.ingest"
        :enabled="source.enabled"
        :last-seen-at="source.lastSeenAt"
      />
      <InstrumentCategoryGrid v-if="readings.length > 0" :readings="readings" :now="now" />
      <p v-else class="text-sm text-fg-muted">{{ t('instruments.noData') }}</p>
      <InstrumentAlarmsList :readings="alarmReadings" />
    </template>
    <InstrumentEmptyState v-else :can-manage="instruments.can.manage" />

    <InstrumentSourceForm v-if="instruments.can.manage" :boat-id="boatId" :source="source" />
  </div>
</template>
