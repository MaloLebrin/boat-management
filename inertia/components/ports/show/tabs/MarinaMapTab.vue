<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BoatAssignModal from '~/components/ports/modals/BoatAssignModal.vue'
import MarinaCanvas from '~/components/ports/show/MarinaCanvas.vue'
import { useT } from '~/composables/useT'
import type { PortShowDetail, PontoonRow, MouillageRow } from '~/types/port'

type LocalPontoon = PontoonRow & { x: number; y: number }
type LocalMouillage = MouillageRow & { x: number; y: number }
type AssignTarget = { type: 'pontoon'; id: number } | { type: 'mouillage'; id: number }

const props = defineProps<{
  port: PortShowDetail
}>()

const { t } = useT()

const editMode = ref(false)
const localPontoons = ref<LocalPontoon[]>([])
const localMouillages = ref<LocalMouillage[]>([])
const selectedBoat = ref<{ id: number; name: string } | null>(null)
const assignTarget = ref<AssignTarget | null>(null)
const assignModalOpen = ref(false)

onMounted(() => {
  localPontoons.value = props.port.pontoons.map((pt, i) => ({
    ...pt,
    x: pt.positionX ?? 80 + (i % 3) * 300,
    y: pt.positionY ?? 80 + Math.floor(i / 3) * 200,
  }))
  localMouillages.value = props.port.mouillages.map((m, i) => ({
    ...m,
    x: m.positionX ?? 80 + ((i + props.port.pontoons.length) % 3) * 300,
    y: m.positionY ?? 80 + Math.floor((i + props.port.pontoons.length) / 3) * 200,
  }))
})

watch(
  () => props.port,
  (newPort) => {
    localPontoons.value = localPontoons.value.map((lp) => {
      const updated = newPort.pontoons.find((p) => p.id === lp.id)
      return updated ? { ...lp, boats: updated.boats } : lp
    })
    localMouillages.value = localMouillages.value.map((lm) => {
      const updated = newPort.mouillages.find((m) => m.id === lm.id)
      return updated ? { ...lm, boats: updated.boats } : lm
    })
  },
  { deep: true }
)

function getCsrf() {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

async function patchJSON(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': getCsrf() },
    body: JSON.stringify(body),
  })
  return res.ok
}

async function handlePontoonDragEnd(pontoonId: number, x: number, y: number) {
  const pt = localPontoons.value.find((p) => p.id === pontoonId)
  if (!pt) return
  pt.x = x
  pt.y = y
  await patchJSON(`/ports/${props.port.id}/pontoons/${pontoonId}/position`, { x, y })
}

async function handleMouillageDragEnd(mouillageId: number, x: number, y: number) {
  const m = localMouillages.value.find((mo) => mo.id === mouillageId)
  if (!m) return
  m.x = x
  m.y = y
  await patchJSON(`/ports/${props.port.id}/mouillages/${mouillageId}/position`, { x, y })
}

function handleBoatSelect(boat: { id: number; name: string }) {
  selectedBoat.value = selectedBoat.value?.id === boat.id ? null : boat
}

function handlePontoonClick(pontoonId: number) {
  if (!selectedBoat.value) return
  assignTarget.value = { type: 'pontoon', id: pontoonId }
  assignModalOpen.value = true
}

async function handleMouillageClick(mouillageId: number) {
  if (!selectedBoat.value) return
  const ok = await patchJSON(`/boats/${selectedBoat.value.id}/assignment`, { mouillageId })
  if (ok) {
    selectedBoat.value = null
    router.reload({ only: ['port'], preserveScroll: true })
  }
}

function handleCanvasClick() {
  selectedBoat.value = null
}

async function handleAssignConfirm(spotIdentifier: string) {
  if (!selectedBoat.value || !assignTarget.value || assignTarget.value.type !== 'pontoon') return
  const ok = await patchJSON(`/boats/${selectedBoat.value.id}/assignment`, {
    pontoonId: assignTarget.value.id,
    spotIdentifier: spotIdentifier || null,
  })
  assignModalOpen.value = false
  assignTarget.value = null
  if (ok) {
    selectedBoat.value = null
    router.reload({ only: ['port'], preserveScroll: true })
  }
}

function handleCloseAssignModal(v: boolean) {
  if (!v) {
    assignModalOpen.value = false
    assignTarget.value = null
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <div class="flex items-center justify-between">
      <p class="text-sm text-fg-muted">{{ t('ports.plan.hint') }}</p>
      <BaseButton
        :variant="editMode ? 'primary' : 'secondary'"
        size="sm"
        @click="editMode = !editMode"
      >
        {{ editMode ? t('ports.plan.viewOnly') : t('ports.plan.editLayout') }}
      </BaseButton>
    </div>

    <!-- Empty state -->
    <BaseCard v-if="localPontoons.length === 0 && localMouillages.length === 0" padded>
      <p class="text-center text-sm text-fg-muted py-8">{{ t('ports.plan.empty') }}</p>
    </BaseCard>

    <!-- SVG Canvas -->
    <div v-else class="overflow-auto rounded-xl border border-border bg-surface">
      <MarinaCanvas
        :pontoons="localPontoons"
        :mouillages="localMouillages"
        :edit-mode="editMode"
        :selected-boat-id="selectedBoat?.id ?? null"
        @pontoon-drag-end="handlePontoonDragEnd"
        @mouillage-drag-end="handleMouillageDragEnd"
        @boat-select="handleBoatSelect"
        @pontoon-click="handlePontoonClick"
        @mouillage-click="handleMouillageClick"
        @canvas-click="handleCanvasClick"
      />
    </div>

    <!-- Selected boat indicator -->
    <p v-if="selectedBoat" class="text-sm text-brand font-medium">
      {{ t('ports.plan.boatSelected', { name: selectedBoat.name }) }}
    </p>

    <!-- Boat assign modal -->
    <BoatAssignModal
      :open="assignModalOpen"
      :boat-name="selectedBoat?.name ?? ''"
      @confirm="handleAssignConfirm"
      @update:open="handleCloseAssignModal"
    />
  </div>
</template>
