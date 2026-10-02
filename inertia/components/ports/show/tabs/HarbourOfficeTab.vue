<script setup lang="ts">
import { computed, ref } from 'vue'
import { PlusIcon } from '@heroicons/vue/24/outline'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseStatCard from '~/components/base/BaseStatCard.vue'
import MarinaStayFormModal from '~/components/ports/modals/MarinaStayFormModal.vue'
import MooringContractFormModal from '~/components/ports/modals/MooringContractFormModal.vue'
import HarbourTodayCard from '~/components/ports/show/harbour/HarbourTodayCard.vue'
import MarinaStaysList from '~/components/ports/show/harbour/MarinaStaysList.vue'
import MooringContractsList from '~/components/ports/show/harbour/MooringContractsList.vue'
import { useMarina } from '~/composables/use_marina'
import { useNumberFormat } from '~/composables/use_number_format'
import { usePermissions } from '~/composables/use_permissions'
import { useT } from '~/composables/use_t'
import type { ClientOption } from '../../../../../shared/types/client'
import type { HarbourOfficeData } from '../../../../../shared/types/marina'
import type { BoatOption, PortShowDetail } from '~/types/port'

/**
 * Capitainerie (#891) : occupation, arrivées/départs du jour, escales
 * (flotte et visiteurs) et contrats d'amarrage du port.
 */
const props = defineProps<{
  port: PortShowDetail
  boats: BoatOption[]
  clients: ClientOption[]
  harbour: HarbourOfficeData
}>()

const { t } = useT()
const { can } = usePermissions()
const { portSpotOptions } = useMarina()
const { formatNumber } = useNumberFormat()
const percent = (rate: number) => formatNumber(rate / 100, { style: 'percent' })

const showStayForm = ref(false)
const showContractForm = ref(false)
const spots = computed(() => portSpotOptions(props.port))

const kpis = computed(() => {
  const o = props.harbour.occupancy
  return [
    {
      key: 'occupiedNow',
      value: String(o.occupiedNow),
      delta: t('ports.harbour.kpis.ofSpots', { total: String(o.totalSpots) }),
    },
    { key: 'rateNow', value: percent(o.rateNow) },
    { key: 'rateMonth', value: percent(o.rateMonth) },
    { key: 'arrivals', value: String(props.harbour.arrivalsToday.length) },
    { key: 'departures', value: String(props.harbour.departuresToday.length) },
  ]
})
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <BaseStatCard
        v-for="kpi in kpis"
        :key="kpi.key"
        :label="t(`ports.harbour.kpis.${kpi.key}`)"
        :value="kpi.value"
        :delta="kpi.delta"
      />
    </div>

    <HarbourTodayCard :harbour="harbour" />

    <BaseCard padded>
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-sm font-semibold text-fg">{{ t('ports.harbour.stays.title') }}</h3>
        <BaseButton
          v-if="can('spots.edit') && spots.length > 0"
          size="sm"
          variant="secondary"
          @click="showStayForm = true"
        >
          <PlusIcon class="h-4 w-4" />
          {{ t('ports.harbour.stays.add') }}
        </BaseButton>
      </div>
      <MarinaStaysList :port-id="port.id" :stays="harbour.stays" />
    </BaseCard>

    <BaseCard padded>
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-sm font-semibold text-fg">{{ t('ports.harbour.contracts.title') }}</h3>
        <BaseButton
          v-if="can('spots.edit') && spots.length > 0 && clients.length > 0"
          size="sm"
          variant="secondary"
          @click="showContractForm = true"
        >
          <PlusIcon class="h-4 w-4" />
          {{ t('ports.harbour.contracts.add') }}
        </BaseButton>
      </div>
      <MooringContractsList :port-id="port.id" :contracts="harbour.contracts" />
    </BaseCard>

    <MarinaStayFormModal
      :open="showStayForm"
      :port-id="port.id"
      :spots="spots"
      :boats="boats"
      :clients="clients"
      @update:open="showStayForm = $event"
    />
    <MooringContractFormModal
      :open="showContractForm"
      :port-id="port.id"
      :spots="spots"
      :boats="boats"
      :clients="clients"
      @update:open="showContractForm = $event"
    />
  </div>
</template>
