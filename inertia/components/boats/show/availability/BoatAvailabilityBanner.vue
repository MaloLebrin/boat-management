<script setup lang="ts">
import { computed } from 'vue'
import BaseAlert from '~/components/base/BaseAlert.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { BoatAvailabilitySummary, BoatUnavailabilityWindow } from '#shared/types/boat_status'

/**
 * Bandeau d'indisponibilité (#870) : statut immobilisant avec son motif, puis
 * les tâches datées et incidents ouverts qui bloquent une réservation
 * confirmée. Rien n'est rendu pour un bateau disponible sans fenêtre à venir.
 */
const props = defineProps<{ availability: BoatAvailabilitySummary }>()

const { t } = useT()
const { formatDate } = useDateFormat()

const immobilized = computed(() => props.availability.status !== 'available')
const otherWindows = computed(() => props.availability.windows.filter((w) => w.source !== 'status'))
const visible = computed(() => immobilized.value || otherWindows.value.length > 0)

const title = computed(() =>
  immobilized.value
    ? t('boats.availability.banner.immobilized', {
        status: t(`boats.availability.status.${props.availability.status}`),
      })
    : t('boats.availability.banner.upcoming')
)

function describe(window: BoatUnavailabilityWindow): string {
  if (window.source === 'task') {
    return t('boats.availability.banner.task', {
      title: window.label,
      date: formatDate(window.startsAt?.slice(0, 10) ?? null),
    })
  }
  return t('boats.availability.banner.incident', {
    type: t(`incidents.type.${window.label}`),
    date: formatDate(window.startsAt),
  })
}
</script>

<template>
  <BaseAlert
    v-if="visible"
    :variant="immobilized ? 'warning' : 'info'"
    :title="title"
    data-testid="boat-availability-banner"
  >
    <p v-if="immobilized && availability.statusChangedAt">
      {{ t('boats.availability.banner.since', { date: formatDate(availability.statusChangedAt) }) }}
    </p>
    <p v-if="immobilized && availability.statusReason">
      {{ t('boats.availability.banner.reason', { reason: availability.statusReason }) }}
    </p>
    <ul v-if="otherWindows.length > 0" class="mt-1 list-disc space-y-0.5 pl-5">
      <li v-for="window in otherWindows" :key="`${window.source}-${window.refId}`">
        {{ describe(window) }}
      </li>
    </ul>
    <p class="mt-1 text-xs">{{ t('boats.availability.banner.rule') }}</p>
  </BaseAlert>
</template>
