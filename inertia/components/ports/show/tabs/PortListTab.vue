<script setup lang="ts">
import { ref } from 'vue'
import { PlusIcon } from '@heroicons/vue/24/outline'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import MouillageCard from '~/components/ports/show/MouillageCard.vue'
import MouillageFormModal from '~/components/ports/modals/MouillageFormModal.vue'
import PontoonCard from '~/components/ports/show/PontoonCard.vue'
import PontoonFormModal from '~/components/ports/modals/PontoonFormModal.vue'
import SpotsManager from '~/components/ports/show/SpotsManager.vue'
import { useT } from '~/composables/useT'
import type { PortShowDetail, PontoonRow, MouillageRow } from '~/types/port'

const props = defineProps<{
  port: PortShowDetail
}>()

const { t } = useT()

const showPontoonForm = ref(false)
const editingPontoon = ref<PontoonRow | null>(null)

const showMouillageForm = ref(false)
const editingMouillage = ref<MouillageRow | null>(null)

const managingSpotsPontoon = ref<PontoonRow | null>(null)
const managingSpotsMouillage = ref<MouillageRow | null>(null)

function handleAddPontoon() {
  editingPontoon.value = null
  showPontoonForm.value = true
}

function handleEditPontoon(pontoon: PontoonRow) {
  editingPontoon.value = pontoon
  showPontoonForm.value = true
}

function handlePontoonModalOpen(open: boolean) {
  showPontoonForm.value = open
  if (!open) editingPontoon.value = null
}

function handleAddMouillage() {
  editingMouillage.value = null
  showMouillageForm.value = true
}

function handleEditMouillage(mouillage: MouillageRow) {
  editingMouillage.value = mouillage
  showMouillageForm.value = true
}

function handleMouillageModalOpen(open: boolean) {
  showMouillageForm.value = open
  if (!open) editingMouillage.value = null
}

function handleManagePontoonSpots(pontoon: PontoonRow) {
  managingSpotsPontoon.value = pontoon
}

function handleManageMouillageSpots(mouillage: MouillageRow) {
  managingSpotsMouillage.value = mouillage
}

function closePontoonSpotsModal(open: boolean) {
  if (!open) managingSpotsPontoon.value = null
}

function closeMouillageSpotsModal(open: boolean) {
  if (!open) managingSpotsMouillage.value = null
}
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Info card -->
    <BaseCard padded>
      <dl class="space-y-3 text-sm">
        <div v-if="port.address">
          <dt class="text-fg-muted">{{ t('ports.fields.address') }}</dt>
          <dd class="font-medium text-fg whitespace-pre-line">{{ port.address }}</dd>
        </div>
        <div v-if="port.notes">
          <dt class="text-fg-muted">{{ t('ports.fields.notes') }}</dt>
          <dd class="font-medium text-fg whitespace-pre-line">{{ port.notes }}</dd>
        </div>
        <div v-if="!port.address && !port.notes" class="text-fg-subtle">
          {{ t('common.none') }}
        </div>
      </dl>
    </BaseCard>

    <!-- Pontoons section -->
    <div class="lg:col-span-2 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-fg">{{ t('ports.pontoons.title') }}</h2>
        <BaseButton size="sm" @click="handleAddPontoon">
          <PlusIcon class="h-4 w-4" />
          {{ t('ports.pontoons.add') }}
        </BaseButton>
      </div>

      <!-- Empty state -->
      <BaseCard v-if="port.pontoons.length === 0" padded>
        <p class="text-center text-sm text-fg-muted py-4">
          {{ t('ports.pontoons.empty') }}
        </p>
      </BaseCard>

      <!-- Pontoons list -->
      <div v-else class="space-y-4">
        <PontoonCard
          v-for="pontoon in port.pontoons"
          :key="pontoon.id"
          :pontoon="pontoon"
          :port-id="port.id"
          @edit="handleEditPontoon"
          @manage-spots="handleManagePontoonSpots"
        />
      </div>

      <!-- Mouillages section -->
      <div class="mt-8 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-fg">{{ t('ports.mouillages.title') }}</h2>
          <BaseButton size="sm" @click="handleAddMouillage">
            <PlusIcon class="h-4 w-4" />
            {{ t('ports.mouillages.add') }}
          </BaseButton>
        </div>

        <!-- Empty state -->
        <BaseCard v-if="port.mouillages.length === 0" padded>
          <p class="text-center text-sm text-fg-muted py-4">
            {{ t('ports.mouillages.empty') }}
          </p>
        </BaseCard>

        <!-- Mouillages list -->
        <div v-else class="space-y-4">
          <MouillageCard
            v-for="mouillage in port.mouillages"
            :key="mouillage.id"
            :mouillage="mouillage"
            :port-id="port.id"
            @edit="handleEditMouillage"
            @manage-spots="handleManageMouillageSpots"
          />
        </div>
      </div>
    </div>
  </div>

  <!-- Modals -->
  <PontoonFormModal
    :open="showPontoonForm"
    :port-id="port.id"
    :pontoon="editingPontoon"
    @update:open="handlePontoonModalOpen"
  />
  <MouillageFormModal
    :open="showMouillageForm"
    :port-id="port.id"
    :mouillage="editingMouillage"
    @update:open="handleMouillageModalOpen"
  />

  <!-- Spots manager modals -->
  <BaseModal
    :open="!!managingSpotsPontoon"
    :title="managingSpotsPontoon?.name ?? ''"
    size="md"
    @update:open="closePontoonSpotsModal"
  >
    <SpotsManager
      v-if="managingSpotsPontoon"
      :port-id="port.id"
      :pontoon-id="managingSpotsPontoon.id"
      :spots="managingSpotsPontoon.spots"
    />
  </BaseModal>

  <BaseModal
    :open="!!managingSpotsMouillage"
    :title="managingSpotsMouillage?.name ?? ''"
    size="md"
    @update:open="closeMouillageSpotsModal"
  >
    <SpotsManager
      v-if="managingSpotsMouillage"
      :port-id="port.id"
      :mouillage-id="managingSpotsMouillage.id"
      :spots="managingSpotsMouillage.spots"
    />
  </BaseModal>
</template>
