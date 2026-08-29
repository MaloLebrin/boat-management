<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { computed } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import NavigationLogEntryList from '~/components/boats/navigation-log/NavigationLogEntryList.vue'
import NavigationLogEntryMap from '~/components/boats/navigation-log/NavigationLogEntryMap.vue'
import NavigationLogEntryQuickAdd from '~/components/boats/show/tabs/NavigationLogEntryQuickAdd.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { NavigationLogEntryRow, NavigationLogRow } from '~/types/boat_show'

const props = defineProps<{
  boat: { id: number; name: string }
  log: NavigationLogRow
  entries: NavigationLogEntryRow[]
  canUpdate: boolean
  canCorrectCompleted: boolean
}>()

const { t } = useT()
const { formatDateTime } = useDateFormat()

const isInProgress = computed(() => props.log.status === 'in_progress')

/** Les points restent éditables sur une sortie en cours ; après clôture, seule la correction admin. */
const canEditEntries = computed(
  () => props.canUpdate && (isInProgress.value || props.canCorrectCompleted)
)

const title = computed(() => {
  const departure = props.log.departurePortName ?? ''
  const arrival = props.log.arrivalPortName ?? ''
  if (departure && arrival) return `${departure} → ${arrival}`
  if (departure) return departure
  return t('navigation_logs.entries.detailTitle')
})
</script>

<template>
  <Head :title="title" />

  <div class="w-full max-w-7xl px-6 py-10 sm:px-8">
    <BaseBreadcrumb
      :items="[
        { label: t('boats.index.title'), href: '/boats' },
        { label: boat.name, href: `/boats/${boat.id}` },
        {
          label: t('navigation_logs.tab'),
          href: `/boats/${boat.id}?tab=navigation-logs`,
        },
        { label: title },
      ]"
    />

    <header class="space-y-3">
      <div class="flex flex-wrap items-center gap-3">
        <BaseHeading level="1">{{ title }}</BaseHeading>
        <BaseBadge :variant="isInProgress ? 'warning' : 'success'">
          {{ isInProgress ? t('navigation_logs.inProgress') : t('navigation_logs.completed') }}
        </BaseBadge>
      </div>
      <div class="flex flex-wrap gap-x-6 gap-y-1 text-sm text-fg-muted">
        <p>{{ t('navigation_logs.fields.departedAt') }} : {{ formatDateTime(log.departedAt) }}</p>
        <p v-if="log.arrivedAt">
          {{ t('navigation_logs.fields.arrivedAt') }} : {{ formatDateTime(log.arrivedAt) }}
        </p>
        <p v-if="log.distanceNm !== null">
          {{ log.distanceNm }} {{ t('navigation_logs.distanceSuffix') }}
        </p>
        <p>{{ t('navigation_logs.entries.pointCount', { count: String(entries.length) }) }}</p>
      </div>
    </header>

    <div class="mt-8 space-y-8">
      <!-- Carte du tracé -->
      <section>
        <NavigationLogEntryMap :entries="entries" />
      </section>

      <!-- Ajout d'un point (sortie en cours, ou correction admin) -->
      <section v-if="canEditEntries">
        <NavigationLogEntryQuickAdd :boat-id="boat.id" :log-id="log.id" />
      </section>

      <!-- Liste chronologique -->
      <section class="space-y-3">
        <h2 class="text-sm font-semibold text-fg">
          {{ t('navigation_logs.entries.listTitle') }}
        </h2>
        <NavigationLogEntryList
          :boat-id="boat.id"
          :log-id="log.id"
          :entries="entries"
          :can-edit="canEditEntries"
        />
      </section>
    </div>
  </div>
</template>
