<script setup lang="ts">
import BoatShowEnginesCard from '~/components/boats/engine/BoatShowEnginesCard.vue'
import BoatShowMaintenanceSection from '~/components/boats/maintenance/BoatShowMaintenanceSection.vue'
import BoatShowRigCard from '~/components/boats/rig/BoatShowRigCard.vue'
import BoatShowSailsCard from '~/components/boats/sail/BoatShowSailsCard.vue'
import BoatShowSpecsCard from '~/components/boats/hull/BoatShowSpecsCard.vue'
import type { BoatShowDetail, MaintenanceEventRow, MaintenanceTaskRow } from '~/types/boat_show'

defineProps<{
  boat: BoatShowDetail
  maintenanceEvents: MaintenanceEventRow[]
  maintenanceTasks: MaintenanceTaskRow[]
  canManageMaintenance: boolean
  canManageEquipment: boolean
}>()
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-8 py-10">
    <div class="flex items-start justify-between gap-6">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-zinc-900">{{ boat.name }}</h1>
        <p class="mt-2 text-base text-zinc-600">
          Registration: <span class="font-medium text-zinc-900">{{ boat.registrationNumber ?? '—' }}</span>
        </p>
        <p class="mt-1 text-base text-zinc-600">
          Type: <span class="font-medium text-zinc-900">{{ boat.type ?? '—' }}</span>
        </p>
        <p class="mt-1 text-base text-zinc-600">
          Propulsion: <span class="font-medium text-zinc-900">{{ boat.propulsionType ?? '—' }}</span>
        </p>
      </div>

      <div class="flex items-center gap-3">
        <a
          :href="`/boats/${boat.id}/edit`"
          class="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800"
        >
          Edit
        </a>
        <a href="/boats" class="text-sm font-medium text-zinc-700 hover:underline">Back</a>
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
