<script setup lang="ts">
import { computed } from 'vue'
import InstrumentGauge from '~/components/boats/show/tabs/instruments/InstrumentGauge.vue'
import { useT } from '~/composables/use_t'
import { CATEGORY_ORDER, type InstrumentReading } from '~/lib/signalk/display'
import { resolveGaugeInstanceLabel } from '#shared/helpers/instrument_gauge_label'
import type { BoatBatteryRow, BoatTankRow } from '#shared/types/boat'

const props = withDefaults(
  defineProps<{
    readings: InstrumentReading[]
    now: number
    /** Noms FleetAi des batteries et cuves (#1037) : remplacent l'identifiant Signal K. */
    batteries?: BoatBatteryRow[]
    tanks?: BoatTankRow[]
  }>(),
  { batteries: () => [], tanks: () => [] }
)

function named(reading: InstrumentReading): InstrumentReading {
  if (!reading.instance) return reading
  return {
    ...reading,
    instance: resolveGaugeInstanceLabel(
      reading.path,
      reading.instance,
      props.batteries,
      props.tanks
    ),
  }
}

const { t } = useT()

/** Les alarmes ont leur propre liste ; le reste est rangé par catégorie. */
const groups = computed(() =>
  CATEGORY_ORDER.filter((category) => category !== 'notifications')
    .map((category) => ({
      category,
      readings: props.readings.filter((reading) => reading.category === category),
    }))
    .filter((group) => group.readings.length > 0)
)
</script>

<template>
  <div class="space-y-8">
    <section
      v-for="group in groups"
      :key="group.category"
      :data-testid="`category-${group.category}`"
    >
      <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-muted">
        {{ t(`instruments.category.${group.category}`) }}
      </h3>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <InstrumentGauge
          v-for="reading in group.readings"
          :key="reading.path"
          :reading="named(reading)"
          :now="now"
        />
      </div>
    </section>
  </div>
</template>
