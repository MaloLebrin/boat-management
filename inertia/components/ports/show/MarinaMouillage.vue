<script setup lang="ts">
import { computed } from 'vue'
import type { MouillageRow, SpotRow } from '~/types/port'

const RX = 120
const RY = 75
const SPOT_SIZE = 28

const props = defineProps<{
  mouillage: MouillageRow
  x: number
  y: number
  editMode: boolean
  selectedBoatId: number | null
}>()

const emit = defineEmits<{
  mousedown: [e: MouseEvent]
  'spot-click': [info: { spotId: number; boat: { id: number; name: string } | null }]
  'zone-click': []
}>()

const spotPositions = computed(() =>
  props.mouillage.spots.map((spot, i) => {
    const angle = (i / Math.max(props.mouillage.spots.length, 1)) * 2 * Math.PI - Math.PI / 2
    const sx = Math.cos(angle) * (RX - 24)
    const sy = Math.sin(angle) * (RY - 24)
    return { ...spot, sx, sy }
  })
)

function getSpotFill(spot: SpotRow): string {
  if (!spot.boat) return 'rgba(33,150,243,0.2)'
  if (props.selectedBoatId === spot.boat.id) return '#1A237E'
  return '#1565C0'
}

function getSpotStroke(spot: SpotRow): string {
  if (!spot.boat) return '#2196F3'
  if (props.selectedBoatId === spot.boat.id) return '#FFD700'
  return 'white'
}

function handleMouseDown(e: MouseEvent) {
  emit('mousedown', e)
}

function handleZoneClick() {
  emit('zone-click')
}

function handleSpotClick(spot: SpotRow) {
  emit('spot-click', { spotId: spot.id, boat: spot.boat })
}
</script>

<template>
  <g
    :transform="`translate(${x + RX}, ${y + RY})`"
    :style="{ cursor: editMode ? 'grab' : 'pointer' }"
    @mousedown="handleMouseDown"
  >
    <!-- Zone ellipse -->
    <ellipse
      :rx="RX"
      :ry="RY"
      fill="rgba(33,150,243,0.15)"
      stroke="#2196F3"
      stroke-width="1.5"
      stroke-dasharray="6 3"
      @click.stop="handleZoneClick"
    />
    <!-- Anchor icon -->
    <text x="0" y="-59" text-anchor="middle" font-size="14" fill="#1565C0" pointer-events="none">
      &#x2693;
    </text>
    <!-- Mouillage name -->
    <text
      x="0"
      y="-43"
      text-anchor="middle"
      font-size="11"
      fill="#1565C0"
      font-weight="600"
      pointer-events="none"
    >
      {{ mouillage.name }}
    </text>

    <!-- Spots in ellipse -->
    <g
      v-for="spot in spotPositions"
      :key="spot.id"
      :transform="`translate(${spot.sx - SPOT_SIZE / 2}, ${spot.sy - SPOT_SIZE / 2})`"
      style="cursor: pointer"
      @click.stop="handleSpotClick(spot)"
    >
      <rect
        :width="SPOT_SIZE"
        :height="SPOT_SIZE"
        :rx="SPOT_SIZE / 2"
        :fill="getSpotFill(spot)"
        :stroke="getSpotStroke(spot)"
        :stroke-dasharray="spot.boat ? 'none' : '4 2'"
        stroke-width="2"
      />
      <!-- Spot name -->
      <text
        :x="SPOT_SIZE / 2"
        y="14"
        text-anchor="middle"
        font-size="7"
        :fill="spot.boat ? 'white' : '#2196F3'"
        pointer-events="none"
      >
        {{ spot.name.slice(0, 3) }}
      </text>
      <!-- Boat name (if occupied) -->
      <text
        v-if="spot.boat"
        :x="SPOT_SIZE / 2"
        y="22"
        text-anchor="middle"
        font-size="6"
        fill="rgba(255,255,255,0.75)"
        pointer-events="none"
      >
        {{ spot.boat.name.slice(0, 4) }}
      </text>
    </g>
  </g>
</template>
