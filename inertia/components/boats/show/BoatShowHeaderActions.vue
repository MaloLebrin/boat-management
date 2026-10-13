<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { computed, ref } from 'vue'
import BaseDropdown from '~/components/base/BaseDropdown.vue'
import PassagePreparationModal from '~/components/boats/show/PassagePreparationModal.vue'
import { useT } from '~/composables/use_t'
import type { BoatShowEngine } from '~/types/boat_show'

const props = defineProps<{
  boatId: number
  canManageMaintenance: boolean
  canManageEquipment: boolean
  canCreateNavigationLogs: boolean
  /** Droit `incidents.create` : entrée « Un incident » (#813). */
  canCreateIncidents?: boolean
  canExport: boolean
  /** Moteurs du bateau, pour pré-charger leur diagnostic de panne (#981). */
  engines?: BoatShowEngine[]
}>()

const emit = defineEmits<{
  addEvent: []
  addTask: []
  addEquipment: []
  addNavigationLog: []
  addIncident: []
}>()

const { t } = useT()

// « Préparer la traversée » (#967) : ouverte depuis le menu « ⋯ »
const passageOpen = ref(false)

const hasAddMenuItems = computed(
  () =>
    props.canManageMaintenance ||
    props.canCreateNavigationLogs ||
    props.canManageEquipment ||
    props.canCreateIncidents
)

const menuItemClass =
  'w-full rounded-(--radius-control) px-3 py-2 text-left text-sm font-semibold text-fg-muted transition-colors duration-(--motion-fast) ease-premium hover:bg-surface-muted hover:text-fg'
</script>

<template>
  <BaseDropdown v-if="hasAddMenuItems" variant="primary">
    <template #trigger>{{ t('boats.show.addMenu.label') }}</template>
    <template #default="{ close }">
      <button
        v-if="canManageMaintenance"
        type="button"
        role="menuitem"
        :class="menuItemClass"
        @click="(emit('addEvent'), close())"
      >
        {{ t('boats.show.addMenu.event') }}
      </button>
      <button
        v-if="canManageMaintenance"
        type="button"
        role="menuitem"
        :class="menuItemClass"
        @click="(emit('addTask'), close())"
      >
        {{ t('boats.show.addMenu.task') }}
      </button>
      <button
        v-if="canManageEquipment"
        type="button"
        role="menuitem"
        :class="menuItemClass"
        @click="(emit('addEquipment'), close())"
      >
        {{ t('boats.show.addMenu.equipment') }}
      </button>
      <button
        v-if="canCreateNavigationLogs"
        type="button"
        role="menuitem"
        :class="menuItemClass"
        @click="(emit('addNavigationLog'), close())"
      >
        {{ t('boats.show.addMenu.navigationLog') }}
      </button>
      <button
        v-if="canCreateIncidents"
        type="button"
        role="menuitem"
        :class="menuItemClass"
        @click="(emit('addIncident'), close())"
      >
        {{ t('boats.show.addMenu.incident') }}
      </button>
    </template>
  </BaseDropdown>

  <BaseDropdown align="right">
    <template #trigger>
      <span aria-hidden="true">{{ t('boats.show.moreMenu.label') }}</span>
      <span class="sr-only">{{ t('boats.show.moreMenu.aria') }}</span>
    </template>
    <template #default="{ close }">
      <Link
        route="boats.budget"
        :params="{ id: boatId }"
        role="menuitem"
        :class="menuItemClass"
        @click="close"
      >
        {{ t('boats.show.budget') }}
      </Link>
      <Link
        route="boats.edit"
        :params="{ id: boatId }"
        role="menuitem"
        :class="menuItemClass"
        @click="close"
      >
        {{ t('boats.show.editBoat') }}
      </Link>
      <button
        type="button"
        role="menuitem"
        :class="menuItemClass"
        data-testid="passage-open"
        @click="((passageOpen = true), close())"
      >
        {{ t('boats.show.passage.open') }}
      </button>
      <!-- eslint-disable vue/no-restricted-v-bind -- téléchargement PDF : une visite Inertia rendrait le binaire comme une page -->
      <a
        v-if="canExport"
        :href="`/boats/${boatId}/maintenance-log.pdf`"
        target="_blank"
        rel="noopener"
        role="menuitem"
        :class="menuItemClass"
        @click="close"
      >
        {{ t('boats.maintenanceLog.download') }}
      </a>
      <!-- eslint-enable vue/no-restricted-v-bind -->
    </template>
  </BaseDropdown>

  <PassagePreparationModal v-model:open="passageOpen" :boat-id="boatId" :engines="engines" />
</template>
