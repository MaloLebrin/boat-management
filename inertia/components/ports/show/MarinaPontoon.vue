<script setup lang="ts">
import { computed } from 'vue'
import type { PontoonRow, SpotRow } from '~/types/port'

const PIER_H = 24
const SLOT_W = 44
const SLOT_H = 60
const SLOT_GAP = 6
const PIER_MIN_W = 260
const MAX_VISIBLE_SPOTS = 6

const props = defineProps<{
  pontoon: PontoonRow
  x: number
  y: number
  editMode: boolean
  selectedBoatId: number | null
}>()

const emit = defineEmits<{
  mousedown: [e: MouseEvent]
  'spot-click': [info: { spotId: number; boat: { id: number; name: string } | null }]
  'pier-click': []
}>()

const visibleSpots = computed(() => props.pontoon.spots.slice(0, MAX_VISIBLE_SPOTS))

const pierWidth = computed(() =>
  Math.max(PIER_MIN_W, visibleSpots.value.length * (SLOT_W + SLOT_GAP) + SLOT_GAP)
)

function getSpotFill(spot: SpotRow): string {
  if (!spot.boat) return 'none'
  if (props.selectedBoatId === spot.boat.id) return '#1A237E'
  return '#1565C0'
}

function getSpotStroke(spot: SpotRow): string {
  if (!spot.boat) return '#5D4037'
  if (props.selectedBoatId === spot.boat.id) return '#FFD700'
  return 'white'
}

function getNameColor(spot: SpotRow): string {
  return spot.boat ? 'white' : '#5D4037'
}

function handleSpotClick(spot: SpotRow) {
  emit('spot-click', { spotId: spot.id, boat: spot.boat })
}
</script>

<template>
  <g
    :transform="`translate(${x}, ${y})`"
    :style="{ cursor: editMode ? 'grab' : 'pointer' }"
    @mousedown="$emit('mousedown', $event)"
  >
    <!-- Pontoon body -->
    <rect
      :width="pierWidth"
      :height="PIER_H"
      rx="4"
      fill="#5D4037"
      @click.stop="$emit('pier-click')"
    />
    <text x="10" y="16" font-size="12" fill="white" font-weight="600" pointer-events="none">
      {{ pontoon.name }}
    </text>

    <!-- Spot slots -->
    <g
      v-for="(spot, i) in visibleSpots"
      :key="spot.id"
      :transform="`translate(${SLOT_GAP + i * (SLOT_W + SLOT_GAP)}, ${PIER_H + 5})`"
      style="cursor: pointer"
      @click.stop="handleSpotClick(spot)"
    >
      <rect
        :width="SLOT_W"
        :height="SLOT_H"
        rx="3"
        :fill="getSpotFill(spot)"
        :stroke="getSpotStroke(spot)"
        :stroke-dasharray="spot.boat ? 'none' : '4 3'"
        stroke-width="1.5"
      />
      <!-- Spot name -->
      <text
        :x="SLOT_W / 2"
        y="18"
        text-anchor="middle"
        font-size="10"
        font-weight="700"
        :fill="getNameColor(spot)"
        pointer-events="none"
      >
        {{ spot.name }}
      </text>
      <!-- Divider (only if occupied) -->
      <line
        v-if="spot.boat"
        :x1="6"
        :y1="24"
        :x2="SLOT_W - 6"
        y2="24"
        stroke="rgba(255,255,255,0.3)"
        stroke-width="1"
      />
      <!-- Boat name (if occupied) -->
      <text
        v-if="spot.boat"
        :x="SLOT_W / 2"
        y="38"
        text-anchor="middle"
        font-size="8"
        fill="rgba(255,255,255,0.85)"
        pointer-events="none"
      >
        {{ spot.boat.name.slice(0, 6) }}
      </text>
    </g>

    <!-- Empty slot placeholder (if no spots) -->
    <g
      v-if="visibleSpots.length === 0"
      :transform="`translate(${SLOT_GAP}, ${PIER_H + 5})`"
    >
      <rect
        :width="SLOT_W"
        :height="SLOT_H"
        rx="3"
        fill="none"
        stroke="rgba(93,64,55,0.4)"
        stroke-width="1"
        stroke-dasharray="4 3"
      />
    </g>

    <!-- "+N" if more than MAX_VISIBLE_SPOTS -->
    <text
      v-if="pontoon.spots.length > MAX_VISIBLE_SPOTS"
      :x="SLOT_GAP + MAX_VISIBLE_SPOTS * (SLOT_W + SLOT_GAP) + 4"
      :y="PIER_H + 36"
      font-size="11"
      fill="#5D4037"
    >
      +{{ pontoon.spots.length - MAX_VISIBLE_SPOTS }}
    </text>
  </g>
</template>
