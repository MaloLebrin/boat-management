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
      <!-- Occupied: filled rect + badge + boat icon + name -->
      <template v-if="spot.boat">
        <rect
          :width="SLOT_W"
          :height="SLOT_H"
          rx="3"
          :fill="getSpotFill(spot)"
          :stroke="getSpotStroke(spot)"
          stroke-width="1.5"
        />
        <rect x="4" y="4" width="36" height="14" rx="3" fill="rgba(255,255,255,0.2)" pointer-events="none" />
        <text
          :x="SLOT_W / 2"
          y="14"
          text-anchor="middle"
          font-size="9"
          font-weight="700"
          fill="white"
          pointer-events="none"
        >
          {{ spot.name }}
        </text>
        <text
          :x="SLOT_W / 2"
          y="42"
          text-anchor="middle"
          font-size="20"
          pointer-events="none"
        >
          ⛵
        </text>
        <text
          :x="SLOT_W / 2"
          y="57"
          text-anchor="middle"
          font-size="8"
          fill="rgba(255,255,255,0.9)"
          pointer-events="none"
        >
          {{ spot.boat.name.slice(0, 6) }}
        </text>
      </template>
      <!-- Empty: dashed rect + spot name -->
      <template v-else>
        <rect
          :width="SLOT_W"
          :height="SLOT_H"
          rx="3"
          fill="none"
          stroke="#5D4037"
          stroke-dasharray="4 3"
          stroke-width="1.5"
        />
        <text
          :x="SLOT_W / 2"
          y="18"
          text-anchor="middle"
          font-size="10"
          font-weight="700"
          fill="#5D4037"
          pointer-events="none"
        >
          {{ spot.name }}
        </text>
      </template>
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
