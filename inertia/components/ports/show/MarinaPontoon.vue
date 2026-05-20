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
      <!-- Boat hull shape (if occupied) -->
      <path
        v-if="spot.boat"
        d="M 22 2 C 40 2, 42 18, 42 32 C 42 48, 36 57, 28 59 L 16 59 C 8 57, 2 48, 2 32 C 2 18, 4 2, 22 2 Z"
        :fill="getSpotFill(spot)"
        :stroke="getSpotStroke(spot)"
        stroke-width="1.5"
      />
      <!-- Empty spot rect -->
      <rect
        v-else
        :width="SLOT_W"
        :height="SLOT_H"
        rx="3"
        fill="none"
        stroke="#5D4037"
        stroke-dasharray="4 3"
        stroke-width="1.5"
      />
      <!-- Mast line (if occupied) -->
      <line
        v-if="spot.boat"
        x1="22" y1="10" x2="22" y2="52"
        stroke="rgba(255,255,255,0.2)"
        stroke-width="1"
        pointer-events="none"
      />
      <!-- Boom (if occupied) -->
      <line
        v-if="spot.boat"
        x1="12" y1="30" x2="32" y2="30"
        stroke="rgba(255,255,255,0.2)"
        stroke-width="1"
        pointer-events="none"
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
        :x1="8"
        :y1="24"
        :x2="SLOT_W - 8"
        y2="24"
        stroke="rgba(255,255,255,0.3)"
        stroke-width="1"
      />
      <!-- Boat name (if occupied) -->
      <text
        v-if="spot.boat"
        :x="SLOT_W / 2"
        y="44"
        text-anchor="middle"
        font-size="8"
        fill="rgba(255,255,255,0.9)"
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
