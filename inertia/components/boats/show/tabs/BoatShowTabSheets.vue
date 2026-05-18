<script setup lang="ts">
import BoatMaintenanceSheetsPanel from '~/components/boats/sheets/BoatMaintenanceSheetsPanel.vue'
import type { BoatShowDetail, MaintenanceSheetRow } from '~/types/boat_show'

defineProps<{
  boat: BoatShowDetail
  sheets: MaintenanceSheetRow[]
  canManage: boolean
}>()
</script>

<template>
  <BoatMaintenanceSheetsPanel :boat="boat" :sheets="sheets" :can-manage="canManage" />
</template>
