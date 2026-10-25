<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useT } from '~/composables/use_t'
import { msToKnots, normalizeDegrees, radToDegrees } from '~/lib/signalk/units'
import { BOAT_MARKER_HTML } from '~/utils/map_markers'
import { aisRisk } from '#shared/helpers/ais'
import type { AisRisk, AisTarget } from '#shared/types/ais'

const props = defineProps<{
  targets: AisTarget[]
  own: { latitude: number; longitude: number } | null
}>()

const { t } = useT()
const container = ref<HTMLElement | null>(null)

let map: import('leaflet').Map | null = null
let layer: import('leaflet').LayerGroup | null = null
let leaflet: typeof import('leaflet') | null = null
let fitted = false

const RISK_COLOR: Record<AisRisk, string> = {
  none: 'var(--color-fg-muted)',
  watch: 'var(--color-warning)',
  danger: 'var(--color-danger)',
}

/** Flèche orientée sur le cap fond ; un point quand le cap est inconnu. */
function targetHtml(target: AisTarget): string {
  const color = RISK_COLOR[aisRisk(target)]
  if (target.cogRad === null) {
    return `<div style="width:10px;height:10px;border-radius:50%;background:${color};"></div>`
  }
  const angle = Math.round(normalizeDegrees(radToDegrees(target.cogRad)))
  return `<div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:14px solid ${color};transform:rotate(${angle}deg);"></div>`
}

function popupText(target: AisTarget): string {
  const speed =
    target.sogMs === null
      ? ''
      : ` · ${msToKnots(target.sogMs).toFixed(1)} ${t('instruments.ais.knots')}`
  return `${target.name ?? target.mmsi}${speed}`
}

function draw() {
  if (!map || !layer || !leaflet) return
  layer.clearLayers()
  const points: [number, number][] = []
  if (props.own) {
    const icon = leaflet.divIcon({
      className: '',
      html: BOAT_MARKER_HTML,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    })
    leaflet.marker([props.own.latitude, props.own.longitude], { icon }).addTo(layer)
    points.push([props.own.latitude, props.own.longitude])
  }
  for (const target of props.targets) {
    const icon = leaflet.divIcon({
      className: '',
      html: targetHtml(target),
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    })
    leaflet
      .marker([target.latitude, target.longitude], { icon })
      .bindPopup(popupText(target))
      .addTo(layer)
    points.push([target.latitude, target.longitude])
  }
  // Le cadrage ne se refait pas à chaque rafraîchissement : l'utilisateur garde son zoom.
  if (!fitted && points.length > 0) {
    map.fitBounds(leaflet.latLngBounds(points), { padding: [24, 24], maxZoom: 13 })
    fitted = true
  }
}

onMounted(async () => {
  if (!container.value) return
  leaflet = await import('leaflet')
  map = leaflet.map(container.value, { zoomControl: true })
  leaflet
    .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    })
    .addTo(map)
  map.setView([0, 0], 2)
  layer = leaflet.layerGroup().addTo(map)
  draw()
})

watch(() => [props.targets, props.own], draw)

onBeforeUnmount(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <div
    ref="container"
    class="h-96 w-full overflow-hidden rounded-lg border border-border"
    role="img"
    :aria-label="t('instruments.ais.mapLabel')"
    data-testid="ais-map"
  />
</template>
