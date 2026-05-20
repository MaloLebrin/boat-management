<script setup lang="ts">
import { ref } from 'vue'
import MarinaPontoon from '~/components/ports/show/MarinaPontoon.vue'
import MarinaMouillage from '~/components/ports/show/MarinaMouillage.vue'
import type { PontoonRow, MouillageRow } from '~/types/port'

type PontoonWithPos = PontoonRow & { x: number; y: number }
type MouillageWithPos = MouillageRow & { x: number; y: number }

const props = defineProps<{
  pontoons: PontoonWithPos[]
  mouillages: MouillageWithPos[]
  editMode: boolean
  selectedBoatId: number | null
}>()

const emit = defineEmits<{
  'pontoon-drag-end': [id: number, x: number, y: number]
  'mouillage-drag-end': [id: number, x: number, y: number]
  'boat-select': [boat: { id: number; name: string }]
  'pontoon-click': [id: number]
  'mouillage-click': [id: number]
  'canvas-click': []
}>()

const svgRef = ref<SVGSVGElement | null>(null)

type DragState = { kind: 'pontoon' | 'mouillage'; id: number; offsetX: number; offsetY: number }
const drag = ref<DragState | null>(null)
const dragPos = ref<Record<number, { x: number; y: number }>>({})

function svgCoords(e: MouseEvent) {
  const rect = svgRef.value!.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function currentPos(kind: 'pontoon' | 'mouillage', item: { id: number; x: number; y: number }) {
  const key = kind === 'pontoon' ? item.id : item.id + 100000
  return dragPos.value[key] ?? { x: item.x, y: item.y }
}

function onBgMouseDown() {
  if (drag.value) return
  emit('canvas-click')
}

function onSvgMouseMove(e: MouseEvent) {
  if (!drag.value) return
  const { x, y } = svgCoords(e)
  const key = drag.value.kind === 'pontoon' ? drag.value.id : drag.value.id + 100000
  dragPos.value[key] = {
    x: Math.max(0, x - drag.value.offsetX),
    y: Math.max(0, y - drag.value.offsetY),
  }
}

function onSvgMouseUp() {
  if (!drag.value) return
  const key = drag.value.kind === 'pontoon' ? drag.value.id : drag.value.id + 100000
  const pos = dragPos.value[key]
  if (pos) {
    if (drag.value.kind === 'pontoon') {
      emit('pontoon-drag-end', drag.value.id, pos.x, pos.y)
    } else {
      emit('mouillage-drag-end', drag.value.id, pos.x, pos.y)
    }
  }
  drag.value = null
}

function startPontoonDrag(e: MouseEvent, pontoon: { id: number; x: number; y: number }) {
  if (!props.editMode) return
  e.stopPropagation()
  const { x, y } = svgCoords(e)
  drag.value = { kind: 'pontoon', id: pontoon.id, offsetX: x - pontoon.x, offsetY: y - pontoon.y }
}

function startMouillageDrag(e: MouseEvent, mouillage: { id: number; x: number; y: number }) {
  if (!props.editMode) return
  e.stopPropagation()
  const { x, y } = svgCoords(e)
  drag.value = {
    kind: 'mouillage',
    id: mouillage.id,
    offsetX: x - mouillage.x,
    offsetY: y - mouillage.y,
  }
}

function handleBoatSelect(boat: { id: number; name: string }) {
  emit('boat-select', boat)
}

function handlePontoonClick(id: number) {
  emit('pontoon-click', id)
}

function handleMouillageClick(id: number) {
  emit('mouillage-click', id)
}
</script>

<template>
  <svg
    ref="svgRef"
    width="1400"
    height="900"
    viewBox="0 0 1400 900"
    :style="{ cursor: drag ? 'grabbing' : editMode ? 'grab' : 'default' }"
    @mousemove="onSvgMouseMove"
    @mouseup="onSvgMouseUp"
    @mouseleave="onSvgMouseUp"
  >
    <!-- Water background -->
    <rect width="1400" height="900" fill="#D6EAF8" @mousedown="onBgMouseDown" />

    <!-- Grid dots -->
    <defs>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <circle cx="20" cy="20" r="1" fill="#B0C9DD" />
      </pattern>
    </defs>
    <rect width="1400" height="900" fill="url(#grid)" pointer-events="none" />

    <!-- Mouillages (behind pontoons) -->
    <MarinaMouillage
      v-for="m in mouillages"
      :key="m.id"
      :mouillage="m"
      :x="currentPos('mouillage', m).x"
      :y="currentPos('mouillage', m).y"
      :edit-mode="editMode"
      :selected-boat-id="selectedBoatId"
      @mousedown="
        (e: MouseEvent) =>
          startMouillageDrag(e, {
            id: m.id,
            x: currentPos('mouillage', m).x,
            y: currentPos('mouillage', m).y,
          })
      "
      @boat-select="handleBoatSelect"
      @zone-click="() => handleMouillageClick(m.id)"
    />

    <!-- Pontoons -->
    <MarinaPontoon
      v-for="pt in pontoons"
      :key="pt.id"
      :pontoon="pt"
      :x="currentPos('pontoon', pt).x"
      :y="currentPos('pontoon', pt).y"
      :edit-mode="editMode"
      :selected-boat-id="selectedBoatId"
      @mousedown="
        (e: MouseEvent) =>
          startPontoonDrag(e, {
            id: pt.id,
            x: currentPos('pontoon', pt).x,
            y: currentPos('pontoon', pt).y,
          })
      "
      @boat-select="handleBoatSelect"
      @pier-click="() => handlePontoonClick(pt.id)"
    />
  </svg>
</template>
