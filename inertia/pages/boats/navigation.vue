<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseTabs from '~/components/base/BaseTabs.vue'
import BoatModeSwitcher from '~/components/boats/show/BoatModeSwitcher.vue'
import BoatShowTabFuelLogs from '~/components/boats/show/tabs/BoatShowTabFuelLogs.vue'
import BoatShowTabIncidents from '~/components/boats/show/tabs/BoatShowTabIncidents.vue'
import BoatShowTabNavigationLogs from '~/components/boats/show/tabs/BoatShowTabNavigationLogs.vue'
import { useT } from '~/composables/use_t'
import type {
  BoatIncidentRow,
  BoatShowDetail,
  FuelLogRow,
  NavigationLogPortOption,
  NavigationLogRow,
} from '~/types/boat_show'
import type { CrewMemberOption } from '../../../shared/types/crew'

const { t } = useT()

const props = defineProps<{
  boat: BoatShowDetail
  incidents: BoatIncidentRow[]
  fuelLogs: FuelLogRow[]
  navigationLogs: NavigationLogRow[]
  portOptions: NavigationLogPortOption[]
  crewMemberOptions: CrewMemberOption[]
  canManageMaintenance: boolean
  canDeleteIncidents: boolean
  canCreateFuelLogs: boolean
  canDeleteFuelLogs: boolean
  canCreateNavigationLogs: boolean
  canUpdateNavigationLogs: boolean
  canDeleteNavigationLogs: boolean
}>()

type TabKey = 'navigation-logs' | 'fuel' | 'incidents'

const tab = ref<TabKey>('navigation-logs')

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search)
  const fromUrl = urlParams.get('tab') as TabKey | null
  if (fromUrl) tab.value = fromUrl
})

watch(tab, (newTab) => {
  const url = new URL(window.location.href)
  if (newTab === 'navigation-logs') {
    url.searchParams.delete('tab')
  } else {
    url.searchParams.set('tab', newTab)
  }
  window.history.replaceState(window.history.state, '', url.pathname + url.search)
})

const openIncidents = computed(() =>
  props.incidents.filter((i) => i.status === 'open' || i.status === 'in_progress')
)

const tabs = computed(() => [
  { key: 'navigation-logs', label: t('navigation_logs.tab') },
  { key: 'fuel', label: t('fuel_logs.tab') },
  {
    key: 'incidents',
    label: t('incidents.tab'),
    badge: openIncidents.value.length > 0 ? String(openIncidents.value.length) : undefined,
  },
])
</script>

<template>
  <div class="w-full max-w-7xl px-6 py-10 sm:px-8">
    <BaseBreadcrumb
      :items="[
        { label: t('boats.show.breadcrumbFleet'), href: '/boats' },
        { label: t('nav.boats') },
        { label: boat.name },
      ]"
    />

    <!-- Header -->
    <header class="space-y-6">
      <div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-3">
            <BaseHeading level="1">{{ boat.name }}</BaseHeading>
            <BaseBadge v-if="openIncidents.length > 0" variant="warning">
              {{ openIncidents.length }}
            </BaseBadge>
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
            <span v-if="boat.type">{{ boat.type }}</span>
            <span v-if="boat.type && boat.registrationNumber" class="text-fg-subtle">·</span>
            <span v-if="boat.registrationNumber">{{ boat.registrationNumber }}</span>
            <span
              v-if="(boat.type || boat.registrationNumber) && boat.propulsionType"
              class="text-fg-subtle"
              >·</span
            >
            <span v-if="boat.propulsionType">{{ boat.propulsionType }}</span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 justify-end">
          <a :href="`/boats/${boat.id}/edit`">
            <BaseButton variant="secondary" size="sm">{{ t('boats.show.editBoat') }}</BaseButton>
          </a>
        </div>
      </div>

      <!-- Mode switcher + Tab bar -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <BoatModeSwitcher :boat-id="boat.id" mode="navigation" />
        <BaseTabs v-model="tab" :tabs="tabs" />
      </div>
    </header>

    <Transition name="tab" mode="out-in">
      <div :key="tab" class="mt-8">
        <BoatShowTabNavigationLogs
          v-if="tab === 'navigation-logs'"
          :boat="boat"
          :navigation-logs="navigationLogs"
          :port-options="portOptions"
          :crew-member-options="crewMemberOptions"
          :can-create="canCreateNavigationLogs"
          :can-update="canUpdateNavigationLogs"
          :can-delete="canDeleteNavigationLogs"
        />

        <BoatShowTabFuelLogs
          v-else-if="tab === 'fuel'"
          :boat="boat"
          :fuel-logs="fuelLogs"
          :can-manage="canCreateFuelLogs"
          :can-delete="canDeleteFuelLogs"
        />

        <BoatShowTabIncidents
          v-else-if="tab === 'incidents'"
          :boat="boat"
          :incidents="incidents"
          :can-manage="canManageMaintenance"
          :can-delete="canDeleteIncidents"
        />
      </div>
    </Transition>
  </div>
</template>
