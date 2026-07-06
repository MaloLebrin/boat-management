<script setup lang="ts">
import BaseCard from '~/components/base/BaseCard.vue'
import { useT } from '~/composables/use_t'
import type { InspectionWithPhotos } from '~/types/inspection'

defineProps<{
  checkout: InspectionWithPhotos | null
  checkin: InspectionWithPhotos | null
}>()

const { t } = useT()
</script>

<template>
  <BaseCard class="space-y-4 p-5">
    <h3 class="font-semibold text-fg">{{ t('inspections.comparison.title') }}</h3>

    <p v-if="!checkout || !checkin" class="text-sm text-fg-muted">
      {{ t('inspections.comparison.unavailable') }}
    </p>

    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div class="rounded-lg border border-border p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-fg-muted">
          {{ t('inspections.comparison.fuelLevel') }}
        </p>
        <p class="mt-2 text-sm text-fg">
          {{ checkout.fuelLevel ?? '—' }}% → {{ checkin.fuelLevel ?? '—' }}%
        </p>
      </div>
      <div class="rounded-lg border border-border p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-fg-muted">
          {{ t('inspections.comparison.engineHours') }}
        </p>
        <p class="mt-2 text-sm text-fg">
          {{ checkout.engineHours ?? '—' }} → {{ checkin.engineHours ?? '—' }}
        </p>
      </div>
    </div>
  </BaseCard>
</template>
