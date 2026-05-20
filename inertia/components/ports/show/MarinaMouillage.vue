<script setup lang="ts">
import { computed } from 'vue'
import type { MouillageRow } from '~/types/port'

const RX = 120
const RY = 75

const props = defineProps<{
  mouillage: MouillageRow
  x: number
  y: number
  editMode: boolean
  selectedBoatId: number | null
}>()

const emit = defineEmits<{
  mousedown: [e: MouseEvent]
  'boat-select': [boat: { id: number; name: string }]
  'zone-click': []
}>()

const boatPositions = computed(() =>
  props.mouillage.boats.map((b, i) => {
    const angle = (i / Math.max(props.mouillage.boats.length, 1)) * 2 * Math.PI - Math.PI / 2
    const bx = Math.cos(angle) * (RX - 20)
    const by = Math.sin(angle) * (RY - 20)
    return { ...b, bx, by }
  })
)

function handleMouseDown(e: MouseEvent) {
  emit('mousedown', e)
}

function handleZoneClick() {
  emit('zone-click')
}

function handleBoatClick(boat: { id: number; name: string }) {
  emit('boat-select', boat)
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

    <!-- Boats in ellipse -->
    <g
      v-for="boat in boatPositions"
      :key="boat.id"
      :transform="`translate(${boat.bx - 14}, ${boat.by - 14})`"
      style="cursor: pointer"
      @click.stop="handleBoatClick({ id: boat.id, name: boat.name })"
    >
      <rect
        width="28"
        height="28"
        rx="14"
        :fill="selectedBoatId === boat.id ? '#1A237E' : '#1565C0'"
        :stroke="selectedBoatId === boat.id ? '#FFD700' : 'white'"
        stroke-width="2"
      />
      <text x="14" y="18" text-anchor="middle" font-size="8" fill="white" pointer-events="none">
        {{ boat.name.slice(0, 4) }}
      </text>
    </g>
  </g>
</template>
