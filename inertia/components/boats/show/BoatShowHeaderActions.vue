<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { computed } from 'vue'
import BaseDropdown from '~/components/base/BaseDropdown.vue'
import { useT } from '~/composables/use_t'

const props = defineProps<{
  boatId: number
  canManageMaintenance: boolean
  canManageEquipment: boolean
  canCreateNavigationLogs: boolean
  canExport: boolean
}>()

const emit = defineEmits<{
  addEntry: []
  addTask: []
  addEquipment: []
  addNavigationLog: []
}>()

const { t } = useT()

const hasAddMenuItems = computed(
  () => props.canManageMaintenance || props.canCreateNavigationLogs || props.canManageEquipment
)

const menuItemClass =
  'w-full rounded-(--radius-control) px-3 py-2 text-left text-sm font-semibold text-fg-muted transition-colors duration-(--motion-fast) ease-premium hover:bg-surface-muted hover:text-fg'
</script>

<template>
  <BaseDropdown v-if="hasAddMenuItems" variant="primary">
    <template #trigger>+ {{ t('boats.show.addMenu.label') }}</template>
    <template #default="{ close }">
      <button
        v-if="canManageMaintenance"
        type="button"
        role="menuitem"
        :class="menuItemClass"
        @click="
          emit('addEntry')
          close()
        "
      >
        {{ t('boats.show.addMenu.entry') }}
      </button>
      <button
        v-if="canManageMaintenance"
        type="button"
        role="menuitem"
        :class="menuItemClass"
        @click="
          emit('addTask')
          close()
        "
      >
        {{ t('boats.show.addMenu.task') }}
      </button>
      <button
        v-if="canManageEquipment"
        type="button"
        role="menuitem"
        :class="menuItemClass"
        @click="
          emit('addEquipment')
          close()
        "
      >
        {{ t('boats.show.addMenu.equipment') }}
      </button>
      <button
        v-if="canCreateNavigationLogs"
        type="button"
        role="menuitem"
        :class="menuItemClass"
        @click="
          emit('addNavigationLog')
          close()
        "
      >
        {{ t('boats.show.addMenu.navigationLog') }}
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
    </template>
  </BaseDropdown>
</template>
