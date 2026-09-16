<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { computed } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseTabs from '~/components/base/BaseTabs.vue'
import RigShowTabInfo from '~/components/boats/rig/show/tabs/RigShowTabInfo.vue'
import RigShowTabPhotos from '~/components/boats/rig/show/tabs/RigShowTabPhotos.vue'
import EquipmentTasksSection from '~/components/boats/maintenance/EquipmentTasksSection.vue'
import { useTabDeepLink } from '~/composables/use_tab_deep_link'
import { useT } from '~/composables/use_t'
import type { BoatRigDetail, MaintenanceTaskRow } from '~/types/boat_show'
import type {
  MaintenanceTaskPermissions,
  TaskEquipmentRef,
  TaskEquipmentSource,
} from '#shared/types/maintenance'

const { t } = useT()

const props = defineProps<{
  boat: { id: number; name: string }
  rig: BoatRigDetail
  canManage: boolean
  maintenanceTasks: MaintenanceTaskRow[]
  taskEquipment: TaskEquipmentSource
  taskPermissions: MaintenanceTaskPermissions
  /** `?tab=` vu par le serveur : le rendu SSR part du bon onglet (#463). */
  initialTab?: string | null
}>()

const taskRef = computed<TaskEquipmentRef>(() => ({ type: 'rig', id: props.rig.id }))
const openTaskCount = computed(
  () => props.maintenanceTasks.filter((t) => t.status === 'open').length
)

type TabKey = 'info' | 'tasks' | 'photos'
const TABS: readonly TabKey[] = ['info', 'tasks', 'photos']
const tab = useTabDeepLink<TabKey>({
  tabs: TABS,
  defaultTab: 'info',
  initialTabParam: props.initialTab,
})

function statusVariant(status: string): 'success' | 'info' | 'warning' | 'neutral' {
  if (status === 'operational') return 'success'
  if (status === 'in_maintenance') return 'info'
  if (status === 'out_of_service') return 'warning'
  return 'neutral'
}
</script>

<template>
  <Head :title="t(`boats.options.rigType.${rig.rigType}`)" />

  <div class="w-full max-w-7xl px-6 py-10 sm:px-8">
    <BaseBreadcrumb
      :items="[
        { label: t('boats.index.title'), href: '/boats' },
        { label: boat.name, href: `/boats/${boat.id}` },
        {
          label: t('boats.engineShow.breadcrumb.equipment'),
          href: `/boats/${boat.id}?tab=equipment`,
        },
        { label: t('boats.rigShow.title') },
      ]"
    />

    <header class="space-y-6">
      <div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-3">
            <BaseHeading level="1">{{ t(`boats.options.rigType.${rig.rigType}`) }}</BaseHeading>
            <BaseBadge :variant="statusVariant(rig.status)">
              {{ t(`equipment.status.${rig.status}`) }}
            </BaseBadge>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 justify-end">
          <BaseButton variant="secondary" size="sm" :href="`/boats/${boat.id}?tab=equipment`">
            ← {{ t('boats.rigShow.back') }}
          </BaseButton>
          <BaseButton v-if="canManage" size="sm" :href="`/boats/${boat.id}/rig/edit`">
            {{ t('boats.rigShow.edit') }}
          </BaseButton>
        </div>
      </div>

      <BaseTabs
        v-model="tab"
        :tabs="[
          { key: 'info', label: t('boats.rigShow.tabs.info') },
          {
            key: 'tasks',
            label: t('boats.maintenance.tasks.sectionTitle'),
            badge: String(openTaskCount || ''),
          },
          {
            key: 'photos',
            label: t('boats.rigShow.tabs.photos'),
            badge: String(rig.photos.length || ''),
          },
        ]"
      />
    </header>

    <Transition name="tab" mode="out-in">
      <div :key="tab" class="mt-8">
        <RigShowTabInfo v-if="tab === 'info'" :rig="rig" />
        <RigShowTabPhotos
          v-else-if="tab === 'photos'"
          :boat="boat"
          :rig="rig"
          :can-manage="canManage"
        />
        <EquipmentTasksSection
          v-else
          :boat-id="boat.id"
          :equipment-ref="taskRef"
          :equipment="taskEquipment"
          :tasks="maintenanceTasks"
          :permissions="taskPermissions"
        />
      </div>
    </Transition>
  </div>
</template>
