<script setup lang="ts">
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import type { BoatListItem } from './types'
import { useT } from '~/composables/useT'

const { t } = useT()

defineProps<{
  boats: BoatListItem[]
}>()

function maintenanceVariant(b: BoatListItem) {
  if (b.maintenance.urgentCount > 0) return 'warning'
  if (b.maintenance.upcomingCount > 0) return 'info'
  return 'neutral'
}

function maintenanceLabel(b: BoatListItem) {
  if (b.maintenance.urgentCount > 0) return t('boats.list.maintenance.urgent', { count: b.maintenance.urgentCount })
  if (b.maintenance.upcomingCount > 0) return t('boats.list.maintenance.upcoming', { count: b.maintenance.upcomingCount })
  return t('boats.list.maintenance.ok')
}
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <a
      v-for="boat in boats"
      :key="boat.id"
      :href="`/boats/${boat.id}`"
      class="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 rounded-(--radius-card)"
    >
      <BaseCard padded>
        <template #header>
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-display text-sm font-semibold text-fg truncate">
                {{ boat.name }}
              </p>
              <p class="mt-1 text-xs font-semibold text-fg-subtle truncate">
                {{ boat.registrationNumber ?? '—' }}
              </p>
            </div>
            <BaseBadge :variant="maintenanceVariant(boat)">
              {{ maintenanceLabel(boat) }}
            </BaseBadge>
          </div>
        </template>

        <div class="flex flex-wrap gap-2">
          <span
            class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-surface-muted text-fg-muted ring-1 ring-border"
          >
            {{ boat.type ?? t('boats.list.cards.unknownType') }}
          </span>
          <span
            class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-surface-muted text-fg-muted ring-1 ring-border"
          >
            {{ boat.propulsionType ?? t('boats.list.cards.unknownPropulsion') }}
          </span>
        </div>
      </BaseCard>
    </a>
  </div>
</template>

