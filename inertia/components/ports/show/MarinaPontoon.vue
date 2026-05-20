<script setup lang="ts">
import { computed } from 'vue'
import type { PontoonRow } from '~/types/port'

const PIER_H = 24
const SLOT_W = 44
const SLOT_H = 56
const SLOT_GAP = 6
const PIER_MIN_W = 260
const MAX_VISIBLE_BOATS = 6

const props = defineProps<{
  pontoon: PontoonRow
  x: number
  y: number
  editMode: boolean
  selectedBoatId: number | null
}>()

const emit = defineEmits<{
  mousedown: [e: MouseEvent]
  'boat-select': [boat: { id: number; name: string }]
  'pier-click': []
}>()

const visibleBoats = computed(() => props.pontoon.boats.slice(0, MAX_VISIBLE_BOATS))

const pierWidth = computed(() =>
  Math.max(PIER_MIN_W, visibleBoats.value.length * (SLOT_W + SLOT_GAP) + SLOT_GAP)
)
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

    <!-- Boat slots (filled) -->
    <g
      v-for="(boat, i) in visibleBoats"
      :key="boat.id"
      :transform="`translate(${SLOT_GAP + i * (SLOT_W + SLOT_GAP)}, ${PIER_H + 5})`"
      style="cursor: pointer"
      @click.stop="$emit('boat-select', { id: boat.id, name: boat.name })"
    >
      <rect
        :width="SLOT_W"
        :height="SLOT_H"
        rx="3"
        :fill="selectedBoatId === boat.id ? '#1A237E' : '#1565C0'"
        :stroke="selectedBoatId === boat.id ? '#FFD700' : 'white'"
        stroke-width="1.5"
      />
      <!-- Spot identifier (primary) -->
      <text
        :x="SLOT_W / 2"
        y="18"
        text-anchor="middle"
        font-size="10"
        font-weight="700"
        fill="white"
        pointer-events="none"
      >
        {{ boat.spotIdentifier ?? '—' }}
      </text>
      <!-- Divider -->
      <line :x1="6" :y1="24" :x2="SLOT_W - 6" y2="24" stroke="rgba(255,255,255,0.3)" stroke-width="1" />
      <!-- Boat name -->
      <text
        :x="SLOT_W / 2"
        y="38"
        text-anchor="middle"
        font-size="8"
        fill="rgba(255,255,255,0.85)"
        pointer-events="none"
      >
        {{ boat.name.slice(0, 6) }}
      </text>
    </g>

    <!-- Empty slot placeholders (no boat) -->
    <g
      v-if="visibleBoats.length === 0"
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

    <!-- "+N" if more than MAX_VISIBLE_BOATS -->
    <text
      v-if="pontoon.boats.length > MAX_VISIBLE_BOATS"
      :x="SLOT_GAP + MAX_VISIBLE_BOATS * (SLOT_W + SLOT_GAP) + 4"
      :y="PIER_H + 36"
      font-size="11"
      fill="#5D4037"
    >
      +{{ pontoon.boats.length - MAX_VISIBLE_BOATS }}
    </text>
  </g>
</template>
