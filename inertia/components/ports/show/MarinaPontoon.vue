<script setup lang="ts">
import { computed } from 'vue'
import type { PontoonRow } from '~/types/port'

const PIER_W = 240
const PIER_H = 22
const SLOT_W = 34
const SLOT_H = 44
const SLOT_GAP = 6
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
  Math.max(PIER_W, visibleBoats.value.length * (SLOT_W + SLOT_GAP) + SLOT_GAP)
)

function handleMouseDown(e: MouseEvent) {
  emit('mousedown', e)
}

function handlePierClick() {
  emit('pier-click')
}

function handleBoatClick(boat: { id: number; name: string }) {
  emit('boat-select', boat)
}
</script>

<template>
  <g
    :transform="`translate(${x}, ${y})`"
    :style="{ cursor: editMode ? 'grab' : 'pointer' }"
    @mousedown="handleMouseDown"
  >
    <!-- Pontoon body -->
    <rect
      :width="pierWidth"
      :height="PIER_H"
      rx="4"
      fill="#5D4037"
      @click.stop="handlePierClick"
    />
    <text x="12" y="15" font-size="11" fill="white" font-weight="600" pointer-events="none">
      {{ pontoon.name }}
    </text>

    <!-- Boat slots -->
    <g
      v-for="(boat, i) in visibleBoats"
      :key="boat.id"
      :transform="`translate(${SLOT_GAP + i * (SLOT_W + SLOT_GAP)}, ${PIER_H + 4})`"
      style="cursor: pointer"
      @click.stop="handleBoatClick({ id: boat.id, name: boat.name })"
    >
      <rect
        :width="SLOT_W"
        :height="SLOT_H"
        rx="3"
        :fill="selectedBoatId === boat.id ? '#1A237E' : '#1565C0'"
        :stroke="selectedBoatId === boat.id ? '#FFD700' : 'none'"
        stroke-width="2"
      />
      <text x="4" y="16" font-size="8" fill="white" pointer-events="none">
        {{ boat.name.slice(0, 5) }}
      </text>
      <text x="4" y="28" font-size="7" fill="rgba(255,255,255,0.7)" pointer-events="none">
        {{ boat.spotIdentifier ?? '-' }}
      </text>
    </g>

    <!-- "+N" if more than MAX_VISIBLE_BOATS -->
    <text
      v-if="pontoon.boats.length > MAX_VISIBLE_BOATS"
      :x="SLOT_GAP + MAX_VISIBLE_BOATS * (SLOT_W + SLOT_GAP)"
      :y="PIER_H + 28"
      font-size="10"
      fill="#1565C0"
    >
      +{{ pontoon.boats.length - MAX_VISIBLE_BOATS }}
    </text>
  </g>
</template>
