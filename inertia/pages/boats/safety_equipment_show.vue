<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { computed } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseTabs from '~/components/base/BaseTabs.vue'
import SafetyShowTabInfo from '~/components/boats/safety/show/tabs/SafetyShowTabInfo.vue'
import SafetyShowTabPhotos from '~/components/boats/safety/show/tabs/SafetyShowTabPhotos.vue'
import EquipmentTasksSection from '~/components/boats/maintenance/EquipmentTasksSection.vue'
import { useTabDeepLink } from '~/composables/use_tab_deep_link'
import { useT } from '~/composables/use_t'
import type { BoatSafetyEquipmentDetail, MaintenanceTaskRow } from '~/types/boat_show'
import type {
  MaintenanceTaskPermissions,
  TaskEquipmentRef,
  TaskEquipmentSource,
} from '#shared/types/maintenance'
import { safetyStatusVariant } from '~/utils/status_variants'

const { t } = useT()

const props = defineProps<{
  boat: { id: number; name: string }
  item: BoatSafetyEquipmentDetail
  canManage: boolean
  maintenanceTasks: MaintenanceTaskRow[]
  taskEquipment: TaskEquipmentSource
  taskPermissions: MaintenanceTaskPermissions
  /** `?tab=` vu par le serveur : le rendu SSR part du bon onglet (#463). */
  initialTab?: string | null
}>()

const taskRef = computed<TaskEquipmentRef>(() => ({ type: 'safety', id: props.item.id }))
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
</script>

<template>
  <Head :title="t(`boats.options.safetyEquipmentType.${item.equipmentType}`)" />

  <div class="w-full max-w-7xl px-6 py-10 sm:px-8">
    <BaseBreadcrumb
      :items="[
        { label: t('boats.index.title'), href: '/boats' },
        { label: boat.name, href: `/boats/${boat.id}` },
        { label: t('boats.safetyEquipment.title'), href: `/boats/${boat.id}?tab=safety` },
        { label: t(`boats.options.safetyEquipmentType.${item.equipmentType}`) },
      ]"
    />

    <header class="space-y-6">
      <div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-3">
            <BaseHeading level="1">
              {{ t(`boats.options.safetyEquipmentType.${item.equipmentType}`) }}
            </BaseHeading>
            <BaseBadge :variant="safetyStatusVariant(item.status)">
              {{ t(`boats.options.safetyEquipmentStatus.${item.status}`) }}
            </BaseBadge>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 justify-end">
          <BaseButton variant="secondary" size="sm" :href="`/boats/${boat.id}?tab=safety`">
            ← {{ t('boats.safetyEquipmentShow.back') }}
          </BaseButton>
        </div>
      </div>

      <BaseTabs
        v-model="tab"
        :tabs="[
          { key: 'info', label: t('boats.safetyEquipmentShow.tabs.info') },
          {
            key: 'tasks',
            label: t('boats.maintenance.tasks.sectionTitle'),
            badge: String(openTaskCount || ''),
          },
          {
            key: 'photos',
            label: t('boats.safetyEquipmentShow.tabs.photos'),
            badge: String(item.photos.length || ''),
          },
        ]"
      />
    </header>

    <Transition name="tab" mode="out-in">
      <div :key="tab" class="mt-8">
        <SafetyShowTabInfo v-if="tab === 'info'" :item="item" />
        <SafetyShowTabPhotos
          v-else-if="tab === 'photos'"
          :boat="boat"
          :item="item"
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
