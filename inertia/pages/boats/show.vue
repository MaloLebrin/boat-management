<script setup lang="ts">
import BoatShowEnginesCard from '~/components/boats/engine/BoatShowEnginesCard.vue'
import BoatShowMaintenanceSection from '~/components/boats/maintenance/BoatShowMaintenanceSection.vue'
import BoatShowRigCard from '~/components/boats/rig/BoatShowRigCard.vue'
import BoatShowSailsCard from '~/components/boats/sail/BoatShowSailsCard.vue'
import BoatShowSpecsCard from '~/components/boats/hull/BoatShowSpecsCard.vue'
import type { BoatShowDetail, MaintenanceEventRow, MaintenanceTaskRow } from '~/types/boat_show'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseTabs from '~/components/base/BaseTabs.vue'
import { computed, ref } from 'vue'

const props = defineProps<{
  boat: BoatShowDetail
  maintenanceEvents: MaintenanceEventRow[]
  maintenanceTasks: MaintenanceTaskRow[]
  canManageMaintenance: boolean
  canManageEquipment: boolean
}>()

type TabKey = 'maintenance' | 'overview' | 'equipment'
const tab = ref<TabKey>('maintenance')
const createTaskNonce = ref(0)

const todayIso = computed(() => new Date().toISOString().slice(0, 10))

function isOverdue(t: MaintenanceTaskRow) {
  return t.status === 'open' && Boolean(t.dueAt) && String(t.dueAt) <= todayIso.value
}

const openTasks = computed(() => props.maintenanceTasks.filter((t) => t.status === 'open'))
const overdueTasks = computed(() => openTasks.value.filter(isOverdue))

const nextTasks = computed(() => {
  const withDueAt = openTasks.value.filter((t) => Boolean(t.dueAt))
  withDueAt.sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt)))
  return withDueAt.slice(0, 5)
})

const statusBadge = computed(() => {
  if (overdueTasks.value.length > 0) return { variant: 'warning' as const, label: 'Urgent' }
  if (openTasks.value.length > 0) return { variant: 'info' as const, label: 'Upcoming' }
  return { variant: 'success' as const, label: 'OK' }
})

function goToMaintenance(section: 'tasks' | 'events') {
  tab.value = 'maintenance'
  queueMicrotask(() => {
    if (section === 'tasks') {
      createTaskNonce.value += 1
      return
    }
    const id = 'maintenance-add-entry'
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
    <header class="space-y-6">
      <div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-3">
            <BaseHeading level="1">{{ boat.name }}</BaseHeading>
            <BaseBadge :variant="statusBadge.variant">
              {{ statusBadge.label }}
            </BaseBadge>
          </div>
          <div class="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-fg-muted">
            <p>
              Registration:
              <span class="font-semibold text-fg">{{ boat.registrationNumber ?? '—' }}</span>
            </p>
            <p>
              Type:
              <span class="font-semibold text-fg">{{ boat.type ?? '—' }}</span>
            </p>
            <p>
              Propulsion:
              <span class="font-semibold text-fg">{{ boat.propulsionType ?? '—' }}</span>
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 justify-end">
          <BaseButton
            v-if="canManageMaintenance"
            variant="secondary"
            size="sm"
            type="button"
            aria-label="Add a maintenance task"
            @click="goToMaintenance('tasks')"
          >
            Add task
          </BaseButton>
          <BaseButton
            v-if="canManageMaintenance"
            variant="secondary"
            size="sm"
            type="button"
            aria-label="Log a maintenance entry"
            @click="goToMaintenance('events')"
          >
            Log maintenance
          </BaseButton>
          <a :href="`/boats/${boat.id}/edit`">
            <BaseButton size="sm">Edit</BaseButton>
          </a>
          <a href="/boats" class="text-sm font-semibold text-fg-muted hover:text-fg hover:underline">
            Back
          </a>
        </div>
      </div>

      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <BaseTabs
          v-model="tab"
          :tabs="[
            { key: 'maintenance', label: 'Maintenance', badge: String(openTasks.length) },
            { key: 'overview', label: 'Overview' },
            { key: 'equipment', label: 'Equipment' },
          ]"
        />

        <div v-if="nextTasks.length" class="text-sm text-fg-muted">
          <span class="font-semibold text-fg">Next:</span>
          <span class="ml-2">
            {{ nextTasks[0]!.title }}
            <span v-if="nextTasks[0]!.dueAt" class="text-fg-subtle">· {{ nextTasks[0]!.dueAt }}</span>
          </span>
        </div>
      </div>
    </header>

    <div class="mt-8">
      <div v-if="tab === 'maintenance'" class="grid grid-cols-1 gap-6">
        <BoatShowMaintenanceSection
          :boat="boat"
          :maintenance-events="maintenanceEvents"
          :maintenance-tasks="maintenanceTasks"
          :can-manage-maintenance="canManageMaintenance"
          :create-task-nonce="createTaskNonce"
        />
      </div>

      <div v-else-if="tab === 'overview'" class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div class="space-y-6 lg:col-span-2">
          <BoatShowSpecsCard :boat="boat" />

          <div class="rounded-(--radius-card) border border-border bg-surface-elevated p-6 shadow-(--shadow-xs)">
            <p class="text-sm font-semibold text-fg">Next tasks</p>
            <p class="mt-1 text-sm text-fg-muted">What’s coming up for this boat.</p>
            <div v-if="nextTasks.length === 0" class="mt-4 text-sm text-fg-muted">No planned tasks.</div>
            <ul v-else class="mt-4 space-y-2 text-sm">
              <li v-for="t in nextTasks" :key="t.id" class="flex items-start justify-between gap-3">
                <span class="font-semibold text-fg">{{ t.title }}</span>
                <span class="text-fg-subtle">{{ t.dueAt ?? '—' }}</span>
              </li>
            </ul>
            <div class="mt-4">
              <BaseButton
                v-if="canManageMaintenance"
                variant="secondary"
                size="sm"
                type="button"
                aria-label="Add a maintenance task"
                @click="goToMaintenance('tasks')"
              >
                Add a task
              </BaseButton>
            </div>
          </div>
        </div>

        <div class="space-y-6">
          <div class="rounded-(--radius-card) border border-border bg-surface-elevated p-6 shadow-(--shadow-xs)">
            <p class="text-sm font-semibold text-fg">Equipment</p>
            <dl class="mt-3 grid gap-3 text-sm">
              <div class="flex items-center justify-between">
                <dt class="text-fg-muted">Engines</dt>
                <dd class="font-semibold text-fg">{{ boat.engines.length }}</dd>
              </div>
              <div class="flex items-center justify-between">
                <dt class="text-fg-muted">Sails</dt>
                <dd class="font-semibold text-fg">{{ boat.sails.length }}</dd>
              </div>
              <div class="flex items-center justify-between">
                <dt class="text-fg-muted">Rig</dt>
                <dd class="font-semibold text-fg">{{ boat.rig ? 'Yes' : 'No' }}</dd>
              </div>
            </dl>
            <div class="mt-4">
              <BaseButton variant="secondary" size="sm" type="button" @click="tab = 'equipment'">
                View equipment
              </BaseButton>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="grid grid-cols-1 gap-6">
        <BoatShowEnginesCard :boat-id="boat.id" :engines="boat.engines" :can-manage="canManageEquipment" />
        <BoatShowSailsCard :boat-id="boat.id" :sails="boat.sails" :can-manage="canManageEquipment" />
        <BoatShowRigCard :boat-id="boat.id" :rig="boat.rig" :can-manage="canManageEquipment" />
      </div>
    </div>
  </div>
</template>
