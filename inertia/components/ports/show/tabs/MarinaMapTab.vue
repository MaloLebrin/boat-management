<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { router } from '@inertiajs/vue3'
import { PlusIcon } from '@heroicons/vue/24/outline'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import MouillageFormModal from '~/components/ports/modals/MouillageFormModal.vue'
import PontoonFormModal from '~/components/ports/modals/PontoonFormModal.vue'
import MarinaCanvas from '~/components/ports/show/MarinaCanvas.vue'
import { useT } from '~/composables/useT'
import type { PortShowDetail, PontoonRow, MouillageRow } from '~/types/port'

type LocalPontoon = PontoonRow & { x: number; y: number }
type LocalMouillage = MouillageRow & { x: number; y: number }

const props = defineProps<{
  port: PortShowDetail
}>()

const { t } = useT()

const editMode = ref(false)
const localPontoons = ref<LocalPontoon[]>([])
const localMouillages = ref<LocalMouillage[]>([])
const selectedBoat = ref<{ id: number; name: string } | null>(null)
const showPontoonForm = ref(false)
const showMouillageForm = ref(false)

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
      return updated ? { ...lp, spots: updated.spots } : lp
    })
    const existingPIds = new Set(localPontoons.value.map((lp) => lp.id))
    newPort.pontoons
      .filter((p) => !existingPIds.has(p.id))
      .forEach((pt, i) => {
        const idx = localPontoons.value.length + i
        localPontoons.value.push({
          ...pt,
          x: pt.positionX ?? 80 + (idx % 3) * 300,
          y: pt.positionY ?? 80 + Math.floor(idx / 3) * 200,
        })
      })

    localMouillages.value = localMouillages.value.map((lm) => {
      const updated = newPort.mouillages.find((m) => m.id === lm.id)
      return updated ? { ...lm, spots: updated.spots } : lm
    })
    const existingMIds = new Set(localMouillages.value.map((lm) => lm.id))
    newPort.mouillages
      .filter((m) => !existingMIds.has(m.id))
      .forEach((m, i) => {
        const idx = localMouillages.value.length + i
        localMouillages.value.push({
          ...m,
          x: m.positionX ?? 80 + (idx % 3) * 300,
          y: m.positionY ?? 80 + Math.floor(idx / 3) * 200,
        })
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

function handleCanvasClick() {
  selectedBoat.value = null
}

async function handleSpotClick(info: { spotId: number; boat: { id: number; name: string } | null }) {
  if (info.boat && selectedBoat.value?.id === info.boat.id) {
    selectedBoat.value = null
    return
  }
  if (info.boat && !selectedBoat.value) {
    selectedBoat.value = info.boat
    return
  }
  if (!info.boat && selectedBoat.value) {
    const ok = await patchJSON(`/boats/${selectedBoat.value.id}/assignment`, { spotId: info.spotId })
    if (ok) {
      selectedBoat.value = null
      router.reload({ only: ['port'], preserveScroll: true })
    }
    return
  }
  if (info.boat && selectedBoat.value && info.boat.id !== selectedBoat.value.id) {
    const ok = await patchJSON(`/boats/${selectedBoat.value.id}/assignment`, { spotId: info.spotId })
    if (ok) {
      selectedBoat.value = null
      router.reload({ only: ['port'], preserveScroll: true })
    }
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div class="flex items-center gap-2">
        <BaseButton size="sm" variant="secondary" @click="showPontoonForm = !showPontoonForm">
          <PlusIcon class="h-4 w-4" />
          {{ t('ports.pontoons.add') }}
        </BaseButton>
        <BaseButton size="sm" variant="secondary" @click="showMouillageForm = !showMouillageForm">
          <PlusIcon class="h-4 w-4" />
          {{ t('ports.mouillages.add') }}
        </BaseButton>
      </div>
      <BaseButton
        :variant="editMode ? 'primary' : 'secondary'"
        size="sm"
        @click="editMode = !editMode"
      >
        {{ editMode ? t('ports.plan.viewOnly') : t('ports.plan.editLayout') }}
      </BaseButton>
    </div>

    <!-- Add modals -->
    <PontoonFormModal
      :open="showPontoonForm"
      :port-id="port.id"
      @update:open="showPontoonForm = $event"
    />
    <MouillageFormModal
      :open="showMouillageForm"
      :port-id="port.id"
      @update:open="showMouillageForm = $event"
    />

    <!-- Hint / selected boat indicator -->
    <p v-if="selectedBoat" class="text-sm text-brand font-medium">
      {{ t('ports.plan.boatSelected', { name: selectedBoat.name }) }}
    </p>
    <p v-else class="text-sm text-fg-muted">{{ t('ports.plan.hint') }}</p>

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
        @spot-click="handleSpotClick"
        @canvas-click="handleCanvasClick"
      />
    </div>
  </div>
</template>
