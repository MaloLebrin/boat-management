<script setup lang="ts">
import { ref } from 'vue'
import BoatShowEnginesCard from '~/components/boats/engine/BoatShowEnginesCard.vue'
import BoatShowRigCard from '~/components/boats/rig/BoatShowRigCard.vue'
import BoatShowSailsCard from '~/components/boats/sail/BoatShowSailsCard.vue'
import type { BoatShowDetail } from '~/types/boat_show'

defineProps<{
  boat: BoatShowDetail
  canManageEquipment: boolean
}>()

const equipmentFilter = ref<'all' | 'engine' | 'sail' | 'rig'>('all')
</script>

<template>
  <div class="space-y-6">
    <!-- Header row with filter pills -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex flex-wrap gap-2">
        <button v-for="filter in [
          { key: 'all', label: 'Tous' },
          { key: 'engine', label: 'Moteur' },
          { key: 'sail', label: 'Voiles' },
          { key: 'rig', label: 'Greement' },
        ]" :key="filter.key" type="button" :class="[
          'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
          equipmentFilter === filter.key
            ? 'bg-brand text-white'
            : 'bg-surface-muted text-fg-muted hover:bg-surface-elevated hover:text-fg',
        ]" @click="equipmentFilter = filter.key as typeof equipmentFilter">
          {{ filter.label }}
        </button>
      </div>
    </div>

    <!-- Engine cards -->
    <div v-if="equipmentFilter === 'all' || equipmentFilter === 'engine'">
      <BoatShowEnginesCard :boat-id="boat.id" :engines="boat.engines" :can-manage="canManageEquipment" />
    </div>

    <!-- Sail cards -->
    <div v-if="equipmentFilter === 'all' || equipmentFilter === 'sail'">
      <BoatShowSailsCard :boat-id="boat.id" :sails="boat.sails" :can-manage="canManageEquipment" />
    </div>

    <!-- Rig card -->
    <div v-if="equipmentFilter === 'all' || equipmentFilter === 'rig'">
      <BoatShowRigCard :boat-id="boat.id" :rig="boat.rig" :can-manage="canManageEquipment" />
    </div>
  </div>
</template>
