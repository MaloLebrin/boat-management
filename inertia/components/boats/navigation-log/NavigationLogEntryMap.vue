<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { NavigationLogEntryRow } from '~/types/boat_show'

const props = defineProps<{
  entries: NavigationLogEntryRow[]
}>()

const { t } = useT()
const { formatDateTime } = useDateFormat()

const gpsEntries = computed(() =>
  props.entries.filter((e) => e.latitude !== null && e.longitude !== null)
)

let map: import('leaflet').Map | null = null

async function initMap() {
  const points = gpsEntries.value
  if (points.length === 0) return

  const L = await import('leaflet')

  map = L.map('navigation-log-entry-map', { zoomControl: true })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)

  const latlngs = points.map((p) => [p.latitude!, p.longitude!] as [number, number])

  if (latlngs.length > 1) {
    L.polyline(latlngs, { color: 'var(--color-brand, #2563eb)', weight: 2, opacity: 0.7 }).addTo(
      map
    )
  }

  const dotIcon = L.divIcon({
    className: '',
    html: '<div style="width:10px;height:10px;border-radius:50%;background:var(--color-brand,#2563eb);border:2px solid #fff;box-shadow:0 0 2px rgba(0,0,0,0.4);"></div>',
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  })

  const lastIcon = L.divIcon({
    className: '',
    html: '<div class="boat-marker">⚓</div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })

  points.forEach((p, index) => {
    const isLast = index === points.length - 1
    const details = [
      formatDateTime(p.recordedAt),
      p.cogDeg !== null ? `${t('navigation_logs.entries.cog')} ${p.cogDeg}°` : null,
      p.sogKn !== null
        ? `${t('navigation_logs.entries.sog')} ${p.sogKn.toFixed(1)} ${t('navigation_logs.entries.knSuffix')}`
        : null,
    ]
      .filter(Boolean)
      .join(' · ')

    L.marker([p.latitude!, p.longitude!], { icon: isLast ? lastIcon : dotIcon })
      .addTo(map!)
      .bindPopup(details)
  })

  map.fitBounds(L.latLngBounds(latlngs), { padding: [24, 24], maxZoom: 14 })
}

onMounted(() => {
  initMap()
})

onUnmounted(() => {
  map?.remove()
  map = null
})

watch(gpsEntries, () => {
  map?.remove()
  map = null
  initMap()
})
</script>

<template>
  <div v-if="gpsEntries.length > 0">
    <div
      id="navigation-log-entry-map"
      class="h-96 w-full overflow-hidden rounded-lg border border-border"
    />
  </div>
  <div
    v-else
    class="flex h-40 items-center justify-center rounded-lg border border-dashed border-border bg-surface-muted/30"
  >
    <p class="text-sm text-fg-muted">{{ t('navigation_logs.entries.mapEmpty') }}</p>
  </div>
</template>
