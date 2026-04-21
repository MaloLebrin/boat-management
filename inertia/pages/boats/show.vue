<script setup lang="ts">
import BoatShowEnginesCard from '~/components/boats/engine/BoatShowEnginesCard.vue'
import BoatShowMaintenanceSection from '~/components/boats/maintenance/BoatShowMaintenanceSection.vue'
import BoatShowRigCard from '~/components/boats/rig/BoatShowRigCard.vue'
import BoatShowSailsCard from '~/components/boats/sail/BoatShowSailsCard.vue'
import BoatShowSpecsCard from '~/components/boats/hull/BoatShowSpecsCard.vue'
import type { BoatShowDetail, MaintenanceEventRow, MaintenanceTaskRow } from '~/types/boat_show'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'

defineProps<{
  boat: BoatShowDetail
  maintenanceEvents: MaintenanceEventRow[]
  maintenanceTasks: MaintenanceTaskRow[]
  canManageMaintenance: boolean
  canManageEquipment: boolean
}>()
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-6 py-10 sm:px-8">
    <div class="flex items-start justify-between gap-6">
      <div>
        <BaseHeading level="1">{{ boat.name }}</BaseHeading>
        <p class="mt-2 text-base text-fg-muted">
          Registration: <span class="font-semibold text-fg">{{ boat.registrationNumber ?? '—' }}</span>
        </p>
        <p class="mt-1 text-base text-fg-muted">
          Type: <span class="font-semibold text-fg">{{ boat.type ?? '—' }}</span>
        </p>
        <p class="mt-1 text-base text-fg-muted">
          Propulsion: <span class="font-semibold text-fg">{{ boat.propulsionType ?? '—' }}</span>
        </p>
      </div>

      <div class="flex items-center gap-3">
        <a :href="`/boats/${boat.id}/edit`">
          <BaseButton>Edit</BaseButton>
        </a>
        <a href="/boats" class="text-sm font-semibold text-fg-muted hover:text-fg hover:underline">Back</a>
      </div>
    </div>

    <div class="mt-8 grid grid-cols-1 gap-6">
      <BoatShowSpecsCard :boat="boat" />
      <BoatShowEnginesCard :boat-id="boat.id" :engines="boat.engines" :can-manage="canManageEquipment" />
      <BoatShowSailsCard :boat-id="boat.id" :sails="boat.sails" :can-manage="canManageEquipment" />
      <BoatShowRigCard :boat-id="boat.id" :rig="boat.rig" :can-manage="canManageEquipment" />
      <BoatShowMaintenanceSection
        :boat="boat"
        :maintenance-events="maintenanceEvents"
        :maintenance-tasks="maintenanceTasks"
        :can-manage-maintenance="canManageMaintenance"
      />
    </div>
  </div>
</template>
