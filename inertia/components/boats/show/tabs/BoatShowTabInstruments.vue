<script setup lang="ts">
import { usePage } from '@inertiajs/vue3'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import InstrumentPluginTokenCard from '~/components/boats/show/tabs/instruments/InstrumentPluginTokenCard.vue'
import InstrumentAlertRulesEditor from '~/components/boats/show/tabs/instruments/InstrumentAlertRulesEditor.vue'
import InstrumentAlertsList from '~/components/boats/show/tabs/instruments/InstrumentAlertsList.vue'
import InstrumentAisPanel from '~/components/boats/show/tabs/instruments/InstrumentAisPanel.vue'
import InstrumentAlarmsList from '~/components/boats/show/tabs/instruments/InstrumentAlarmsList.vue'
import InstrumentCategoryGrid from '~/components/boats/show/tabs/instruments/InstrumentCategoryGrid.vue'
import InstrumentConnectionBanner from '~/components/boats/show/tabs/instruments/InstrumentConnectionBanner.vue'
import InstrumentForecastPanel from '~/components/boats/show/tabs/instruments/InstrumentForecastPanel.vue'
import InstrumentHistoryPanel from '~/components/boats/show/tabs/instruments/InstrumentHistoryPanel.vue'
import InstrumentEmptyState from '~/components/boats/show/tabs/instruments/InstrumentEmptyState.vue'
import InstrumentSourceForm from '~/components/boats/show/tabs/instruments/InstrumentSourceForm.vue'
import { useAisTargets } from '~/composables/use_ais_targets'
import { useInstrumentStream } from '~/composables/use_instrument_stream'
import { useT } from '~/composables/use_t'
import { useSignalKForecast } from '~/composables/use_signalk_forecast'
import { useTelemetrySync } from '~/composables/use_telemetry_sync'
import { buildReadings } from '~/lib/signalk/display'
import { isMixedContent } from '~/lib/signalk/probe'
import { parsePosition } from '~/lib/signalk/weather'
import { mergeInstrumentAlerts } from '~/utils/instrument_alerts'
import { alertRuleSpecs } from '#shared/helpers/instrument_alerts'
import { sortAisTargets, withDistances } from '#shared/helpers/ais'
import type { InstrumentSeries, InstrumentsTabProps } from '#shared/types/instruments'

const props = defineProps<{ boatId: number; instruments: InstrumentsTabProps }>()

const { t } = useT()
const source = computed(() => props.instruments.source)

/** Historique (#992) : prop optionnelle de la page, servie par `router.reload({ only })`. */
const page = usePage<{ instrumentSeries?: InstrumentSeries }>()
const historyPaths = computed(() =>
  readings.value.filter((reading) => reading.value !== null).map((reading) => reading.path)
)

/** Sans le droit d'ingérer, le visiteur lit les dernières valeurs sans ouvrir de flux (D3). */
const canStream = computed(
  () => Boolean(source.value?.enabled) && props.instruments.can.ingest && !mixedContent.value
)

/** Protocole de la page, connu au montage seulement (SSR : pas de `window`). */
const pageProtocol = ref<string | undefined>(undefined)
/** Adresse `http:` sur une page `https:` : le navigateur bloque le flux (#1019). */
const mixedContent = computed(() =>
  source.value ? isMixedContent(source.value.baseUrl, pageProtocol.value) : false
)
/** Mixte, mais le plugin pousse les mesures : FleetAi les lit sans flux ici. */
const pluginOnly = computed(() => mixedContent.value && Boolean(source.value?.hasIngestToken))
const bannerState = computed(() =>
  mixedContent.value && !pluginOnly.value ? ('error' as const) : stream.connectionState.value
)
const bannerError = computed(() =>
  mixedContent.value && !pluginOnly.value ? ('mixed_content' as const) : stream.errorKey.value
)

const sync = useTelemetrySync({
  boatId: () => props.boatId,
  sourceId: () => source.value?.id ?? null,
})
const ais = useAisTargets({
  own: () => ownPosition.value,
  onSamples: (samples) => sync.push(samples),
})
const stream = useInstrumentStream({
  source: () => (canStream.value ? source.value : null),
  alertRules: () => alertRuleSpecs(props.instruments.rules),
  onSamples: (samples) => sync.push(samples),
  onAisDelta: ais.handleDelta,
  pageProtocol: () => pageProtocol.value,
})

const now = ref(Date.now())
let clock: ReturnType<typeof setInterval> | null = null

const readings = computed(() => buildReadings(props.instruments.latest, stream.latestByPath.value))
/** Dernière position connue (flux, sinon dernière valeur du serveur) : point des prévisions. */
const boatPosition = computed(() =>
  parsePosition(readings.value.find((reading) => reading.path === 'navigation.position')?.valueJson)
)
const forecast = useSignalKForecast({
  boatId: () => props.boatId,
  source: () => source.value,
  position: () => boatPosition.value,
  pageProtocol: () => pageProtocol.value,
})
const alerts = computed(() =>
  mergeInstrumentAlerts(props.instruments.openAlerts, stream.localAlerts.value)
)
/** Les instruments numériques déjà reçus : les seuls sur lesquels poser une règle. */
const rulePaths = computed(() =>
  readings.value
    .filter((reading) => reading.value !== null)
    .map((reading) => ({
      value: reading.path,
      label: `${t(reading.labelKey)} · ${reading.instance}`,
    }))
)
/** Position du bateau : le flux d'abord, sinon la dernière valeur connue du serveur. */
const ownPosition = computed(() => {
  const json = readings.value.find((reading) => reading.path === 'navigation.position')?.valueJson
  if (json === null || json === undefined || typeof json !== 'object' || Array.isArray(json)) {
    return null
  }
  const { latitude, longitude } = json
  return typeof latitude === 'number' && typeof longitude === 'number'
    ? { latitude, longitude }
    : null
})
/** En direct tant que le flux a livré des cibles ; sinon les derniers relevés du serveur. */
const aisLive = computed(() => ais.targets.value.length > 0)
const aisTargets = computed(() =>
  aisLive.value
    ? ais.targets.value
    : sortAisTargets(withDistances(props.instruments.aisTargets, ownPosition.value))
)
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
  ais.stop()
  await sync.stop()
  if (!canStream.value) return
  await sync.start()
  stream.start()
  ais.start()
}

onMounted(() => {
  pageProtocol.value = window.location.protocol
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
        :state="bannerState"
        :error-key="bannerError"
        :plugin-only="pluginOnly"
        :last-delta-at="stream.lastDeltaAt.value"
        :read-only="!instruments.can.ingest"
        :enabled="source.enabled"
        :last-seen-at="source.lastSeenAt"
      />
      <InstrumentCategoryGrid v-if="readings.length > 0" :readings="readings" :now="now" />
      <p v-else class="text-sm text-fg-muted">{{ t('instruments.noData') }}</p>
      <InstrumentHistoryPanel
        v-if="historyPaths.length > 0"
        :paths="historyPaths"
        :series="page.props.instrumentSeries"
      />
      <InstrumentAisPanel
        v-if="aisTargets.length > 0 || canStream"
        :targets="aisTargets"
        :own="ownPosition"
        :live="aisLive"
      />
      <InstrumentForecastPanel
        :snapshot="forecast.snapshot.value"
        :error="forecast.error.value"
        :loading="forecast.loading.value"
        :stale="forecast.stale.value"
        :now="forecast.now.value"
        @refresh="forecast.refresh()"
      />
      <InstrumentAlertsList :alerts="alerts" />
      <InstrumentAlarmsList :readings="alarmReadings" />
    </template>
    <InstrumentEmptyState v-else :can-manage="instruments.can.manage" />

    <InstrumentAlertRulesEditor
      v-if="instruments.can.manage && source"
      :boat-id="boatId"
      :rules="instruments.rules"
      :paths="rulePaths"
    />
    <InstrumentPluginTokenCard
      v-if="instruments.can.manage && source"
      :boat-id="boatId"
      :source="source"
    />
    <InstrumentSourceForm v-if="instruments.can.manage" :boat-id="boatId" :source="source" />
  </div>
</template>
