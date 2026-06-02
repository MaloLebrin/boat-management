<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { PlusIcon, QuestionMarkCircleIcon } from '@heroicons/vue/24/outline'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import MarinaCanvas from '~/components/ports/show/MarinaCanvas.vue'
import MarinaHelpModal from '~/components/ports/modals/MarinaHelpModal.vue'
import MouillageFormModal from '~/components/ports/modals/MouillageFormModal.vue'
import PontoonFormModal from '~/components/ports/modals/PontoonFormModal.vue'
import {
  useMarinaInteractions,
  type LocalPontoon,
  type LocalMouillage,
} from '~/composables/use_marina_interactions'
import { useT } from '~/composables/use_t'
import type { PortShowDetail } from '~/types/port'

const props = defineProps<{
  port: PortShowDetail
}>()

const { t } = useT()

const editMode = ref(false)
const localPontoons = ref<LocalPontoon[]>([])
const localMouillages = ref<LocalMouillage[]>([])
const showPontoonForm = ref(false)
const showMouillageForm = ref(false)
const showHelp = ref(false)

const portId = computed(() => props.port.id)
const {
  selectedBoat,
  handlePontoonDragEnd,
  handleMouillageDragEnd,
  handleCanvasClick,
  handleSpotClick,
} = useMarinaInteractions(portId, localPontoons, localMouillages)

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
      <div class="flex items-center gap-2">
        <BaseButton
          :variant="editMode ? 'primary' : 'secondary'"
          size="sm"
          @click="editMode = !editMode"
        >
          {{ editMode ? t('ports.plan.viewOnly') : t('ports.plan.editLayout') }}
        </BaseButton>
        <button
          type="button"
          :class="[
            'flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
            showHelp
              ? 'bg-brand/10 text-brand'
              : 'text-fg-muted hover:text-fg hover:bg-surface-hover',
          ]"
          @click="showHelp = !showHelp"
        >
          <QuestionMarkCircleIcon class="h-4 w-4" />
          {{ t('ports.plan.help.toggle') }}
        </button>
      </div>
    </div>

    <MarinaHelpModal :open="showHelp" @update:open="showHelp = $event" />

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
