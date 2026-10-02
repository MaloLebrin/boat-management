<script setup lang="ts">
import { computed } from 'vue'
import BaseCard from '~/components/base/BaseCard.vue'
import { useT } from '~/composables/use_t'
import type { HarbourOfficeData, MarinaStayRow } from '../../../../../shared/types/marina'

/** « Aujourd'hui » à la capitainerie (#891) : qui arrive, qui part. */
const props = defineProps<{ harbour: HarbourOfficeData }>()

const { t } = useT()

const byId = computed(() => new Map(props.harbour.stays.map((s) => [s.id, s])))
const pick = (ids: number[]) =>
  ids.map((id) => byId.value.get(id)).filter((s): s is MarinaStayRow => s !== undefined)

const columns = computed(() => [
  {
    key: 'arrivals',
    title: t('ports.harbour.today.arrivals'),
    stays: pick(props.harbour.arrivalsToday),
  },
  {
    key: 'departures',
    title: t('ports.harbour.today.departures'),
    stays: pick(props.harbour.departuresToday),
  },
])
</script>

<template>
  <BaseCard padded>
    <h3 class="text-sm font-semibold text-fg">{{ t('ports.harbour.today.title') }}</h3>
    <div class="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div v-for="column in columns" :key="column.key" :data-testid="`harbour-today-${column.key}`">
        <p class="text-xs font-medium uppercase tracking-wide text-fg-subtle">{{ column.title }}</p>
        <p v-if="column.stays.length === 0" class="mt-1 text-sm text-fg-muted">
          {{ t('ports.harbour.today.none') }}
        </p>
        <ul v-else class="mt-1 space-y-1">
          <li v-for="stay in column.stays" :key="stay.id" class="text-sm text-fg">
            {{ stay.guestName }} <span class="text-fg-muted">· {{ stay.spotName }}</span>
          </li>
        </ul>
      </div>
    </div>
  </BaseCard>
</template>
