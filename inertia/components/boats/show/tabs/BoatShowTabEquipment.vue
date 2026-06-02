<script setup lang="ts">
import { sortEnginesByStatus } from '#shared/helpers/engine'
import { ref } from 'vue'
import BoatShowEnginesCard from '~/components/boats/engine/BoatShowEnginesCard.vue'
import BoatShowRigCard from '~/components/boats/rig/BoatShowRigCard.vue'
import BoatSafetyEquipmentCard from '~/components/boats/safety/BoatSafetyEquipmentCard.vue'
import BoatShowSailsCard from '~/components/boats/sail/BoatShowSailsCard.vue'
import BoatEquipmentAddModal from '~/components/boats/show/modals/BoatEquipmentAddModal.vue'
import { useT } from '~/composables/use_t'
import type { BoatShowDetail } from '~/types/boat_show'

const props = defineProps<{
  boat: BoatShowDetail
  canManageEquipment: boolean
}>()

const { t } = useT()

const equipmentFilter = ref<'all' | 'engine' | 'sail' | 'rig' | 'safety'>('all')
const isAddModalOpen = ref(false)
</script>

<template>
  <BoatEquipmentAddModal
    v-model:open="isAddModalOpen"
    :boat="boat"
    :can-manage-equipment="canManageEquipment"
  />

  <div class="space-y-6">
    <!-- Header row with filter pills and add button -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="filter in [
            { key: 'all', label: t('common.all') },
            { key: 'engine', label: t('boats.equipmentAddModal.categories.engine') },
            { key: 'sail', label: t('boats.equipmentAddModal.categories.sail') },
            { key: 'rig', label: t('boats.equipmentAddModal.categories.rig') },
            { key: 'safety', label: t('boats.safetyEquipment.title') },
          ]"
          :key="filter.key"
          type="button"
          :class="[
            'rounded-full px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer',
            equipmentFilter === filter.key
              ? 'bg-brand text-white'
              : 'bg-surface-muted text-fg-muted hover:bg-surface-elevated hover:text-fg',
          ]"
          @click="equipmentFilter = filter.key as typeof equipmentFilter"
        >
          {{ filter.label }}
        </button>
      </div>
      <button
        v-if="canManageEquipment"
        type="button"
        class="rounded-lg border border-brand px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand hover:text-white transition-colors"
        @click="isAddModalOpen = true"
      >
        + {{ t('boats.equipmentAddModal.title') }}
      </button>
    </div>

    <!-- Engine cards -->
    <div v-if="equipmentFilter === 'all' || equipmentFilter === 'engine'">
      <BoatShowEnginesCard
        :boat-id="boat.id"
        :engines="sortEnginesByStatus(boat.engines)"
        :can-manage="canManageEquipment"
      />
    </div>

    <!-- Sail cards -->
    <div v-if="equipmentFilter === 'all' || equipmentFilter === 'sail'">
      <BoatShowSailsCard :boat-id="boat.id" :sails="boat.sails" :can-manage="canManageEquipment" />
    </div>

    <!-- Rig card -->
    <div v-if="equipmentFilter === 'all' || equipmentFilter === 'rig'">
      <BoatShowRigCard :boat-id="boat.id" :rig="boat.rig" :can-manage="canManageEquipment" />
    </div>

    <!-- Safety equipment card -->
    <div v-if="equipmentFilter === 'all' || equipmentFilter === 'safety'">
      <BoatSafetyEquipmentCard
        :boat-id="boat.id"
        :items="boat.safetyEquipment"
        :can-manage="canManageEquipment"
      />
    </div>
  </div>
</template>
