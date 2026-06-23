<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useT } from '~/composables/use_t'
import type { BoatPositionHistoryRow } from '~/types/boat_show'

const props = defineProps<{
  boatId: number
  positionHistory: BoatPositionHistoryRow[]
  latestGpsPosition: BoatPositionHistoryRow | null
  canManage: boolean
}>()

const { t } = useT()

const showForm = ref(false)
const latitude = ref('')
const longitude = ref('')
const saving = ref(false)

let map: import('leaflet').Map | null = null

async function initMap() {
  const gpsPoints = props.positionHistory.filter((p) => p.latitude !== null && p.longitude !== null)
  if (gpsPoints.length === 0) return

  const L = await import('leaflet')

  const center = props.latestGpsPosition?.latitude
    ? [props.latestGpsPosition.latitude, props.latestGpsPosition.longitude]
    : [gpsPoints[0].latitude!, gpsPoints[0].longitude!]

  map = L.map('nav-position-map', { zoomControl: true }).setView(center as [number, number], 12)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)

  if (gpsPoints.length > 1) {
    const latlngs = gpsPoints.map((p) => [p.latitude!, p.longitude!] as [number, number])
    L.polyline(latlngs, { color: 'var(--color-brand, #2563eb)', weight: 2, opacity: 0.7 }).addTo(
      map
    )
  }

  const activeIcon = L.divIcon({
    className: '',
    html: '<div class="boat-marker">⚓</div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })

  const dotIcon = L.divIcon({
    className: '',
    html: '<div style="width:8px;height:8px;border-radius:50%;background:var(--color-brand,#2563eb);opacity:0.5;"></div>',
    iconSize: [8, 8],
    iconAnchor: [4, 4],
  })

  gpsPoints.slice(1).forEach((p) => {
    L.marker([p.latitude!, p.longitude!], { icon: dotIcon }).addTo(map!)
  })

  if (props.latestGpsPosition?.latitude) {
    L.marker([props.latestGpsPosition.latitude, props.latestGpsPosition.longitude!], {
      icon: activeIcon,
    })
      .addTo(map)
      .bindPopup(
        `${props.latestGpsPosition.latitude.toFixed(5)}, ${props.latestGpsPosition.longitude!.toFixed(5)}`
      )
      .openPopup()
  }
}

onMounted(() => {
  initMap()
})

onUnmounted(() => {
  map?.remove()
  map = null
})

watch(
  () => props.latestGpsPosition,
  () => {
    map?.remove()
    map = null
    initMap()
  }
)

function savePosition() {
  const lat = Number.parseFloat(latitude.value)
  const lng = Number.parseFloat(longitude.value)
  if (Number.isNaN(lat) || Number.isNaN(lng)) return

  saving.value = true
  router.post(
    `/boats/${props.boatId}/position`,
    { latitude: lat, longitude: lng },
    {
      preserveScroll: true,
      onFinish: () => {
        saving.value = false
        showForm.value = false
        latitude.value = ''
        longitude.value = ''
      },
    }
  )
}
</script>

<template>
  <div class="space-y-6">
    <!-- Map -->
    <div v-if="latestGpsPosition?.latitude" class="space-y-3">
      <p class="text-xs text-fg-muted">
        {{ t('boats.show.position.gpsCoords') }}
        {{ latestGpsPosition.latitude.toFixed(5) }},
        {{ latestGpsPosition.longitude!.toFixed(5) }}
      </p>
      <div
        id="nav-position-map"
        class="h-96 w-full overflow-hidden rounded-lg border border-border"
      />
    </div>
    <div
      v-else
      class="flex h-40 items-center justify-center rounded-lg border border-dashed border-border bg-surface-muted/30"
    >
      <p class="text-sm text-fg-muted">{{ t('boats.show.position.noHistory') }}</p>
    </div>

    <!-- Manual GPS input -->
    <div class="flex items-center justify-between">
      <p class="text-sm font-semibold text-fg">{{ t('boats.show.position.history') }}</p>
      <BaseButton v-if="canManage" size="sm" variant="secondary" @click="showForm = !showForm">
        {{ showForm ? t('common.cancel') : t('boats.show.position.setGps') }}
      </BaseButton>
    </div>

    <div
      v-if="showForm && canManage"
      class="rounded-lg border border-border bg-surface-elevated p-4 space-y-3"
    >
      <p class="text-sm font-medium text-fg">{{ t('boats.show.position.manualTitle') }}</p>
      <div class="grid grid-cols-2 gap-3">
        <BaseInput
          id="nav-lat"
          name="latitude"
          :label="t('boats.show.position.latitude')"
          inputmode="decimal"
          v-model="latitude"
          :errors="{}"
        />
        <BaseInput
          id="nav-lng"
          name="longitude"
          :label="t('boats.show.position.longitude')"
          inputmode="decimal"
          v-model="longitude"
          :errors="{}"
        />
      </div>
      <BaseButton size="sm" :disabled="saving" @click="savePosition">
        {{ saving ? t('common.saving') : t('boats.show.position.saveGps') }}
      </BaseButton>
    </div>

    <!-- History list -->
    <div v-if="positionHistory.length > 0" class="space-y-2">
      <div
        v-for="entry in positionHistory"
        :key="entry.id"
        class="flex items-start justify-between rounded-md border border-border bg-surface-elevated px-4 py-3 text-sm"
      >
        <div class="space-y-0.5">
          <p class="font-medium text-fg">
            {{ entry.portName ?? entry.mouillageNom ?? entry.pontoonName ?? entry.spotName ?? '—' }}
          </p>
          <p v-if="entry.latitude !== null" class="text-xs text-fg-muted">
            {{ entry.latitude.toFixed(5) }}, {{ entry.longitude!.toFixed(5) }}
            <span class="ml-2 capitalize">· {{ entry.source }}</span>
          </p>
        </div>
        <div class="text-right text-xs text-fg-muted shrink-0 ml-4">
          <p>{{ entry.startedAt }}</p>
          <p v-if="entry.endedAt">→ {{ entry.endedAt }}</p>
        </div>
      </div>
    </div>
    <div v-else-if="!latestGpsPosition" class="text-sm text-fg-muted">
      {{ t('boats.show.position.noHistory') }}
    </div>
  </div>
</template>
