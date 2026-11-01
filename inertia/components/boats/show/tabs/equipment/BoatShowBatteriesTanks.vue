<script setup lang="ts">
import BoatShowBatteriesSection from '~/components/boats/show/tabs/equipment/BoatShowBatteriesSection.vue'
import BoatShowTanksSection from '~/components/boats/show/tabs/equipment/BoatShowTanksSection.vue'
import type { BoatBatteryRow, BoatTankRow } from '~/types/boat_show'

/** Batteries puis réservoirs de l'onglet Équipements (#1037). */
defineProps<{
  boatId: number
  batteries: BoatBatteryRow[]
  tanks: BoatTankRow[]
  canManage: boolean
}>()
</script>

<template>
  <div class="space-y-6">
    <BoatShowBatteriesSection :boat-id="boatId" :batteries="batteries" :can-manage="canManage" />
    <BoatShowTanksSection :boat-id="boatId" :tanks="tanks" :can-manage="canManage" />
  </div>
</template>
