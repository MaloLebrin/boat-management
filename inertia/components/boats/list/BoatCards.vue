<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BoatStatusBadge from '~/components/boats/BoatStatusBadge.vue'
import BoatTrashActions from '~/components/boats/list/BoatTrashActions.vue'
import type { BoatListItem } from './types'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import { maintenanceVariant } from '~/utils/status_variants'
import { boatCategoryLabel, propulsionLabel } from '~/utils/boat_enum_labels'

const { t } = useT()
const { formatDate } = useDateFormat()

defineProps<{
  boats: BoatListItem[]
  trashed?: boolean
}>()

function maintenanceLabel(b: BoatListItem) {
  if (b.maintenance.urgentCount > 0)
    return t('boats.list.maintenance.urgent', { count: b.maintenance.urgentCount })
  if (b.maintenance.upcomingCount > 0)
    return t('boats.list.maintenance.upcoming', { count: b.maintenance.upcomingCount })
  return t('boats.list.maintenance.ok')
}
</script>

<template>
  <TransitionGroup name="list" tag="div" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <component
      :is="trashed ? 'div' : Link"
      v-for="(boat, i) in boats"
      :key="boat.id"
      :style="{ '--i': i }"
      v-bind="trashed ? {} : { href: `/boats/${boat.id}` }"
      class="block rounded-(--radius-card) focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
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
            <BaseBadge :variant="maintenanceVariant(boat.maintenance)">
              {{ maintenanceLabel(boat) }}
            </BaseBadge>
          </div>
        </template>

        <div class="flex flex-wrap gap-2">
          <!-- Disponibilité (#870) : on ne signale que l'écart à la normale. -->
          <BoatStatusBadge v-if="boat.status !== 'available'" :status="boat.status" />
          <span
            class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-surface-muted text-fg-muted ring-1 ring-border"
          >
            {{ boatCategoryLabel(t, boat.category) ?? t('boats.list.cards.unknownCategory') }}
          </span>
          <span
            class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-surface-muted text-fg-muted ring-1 ring-border"
          >
            {{ propulsionLabel(t, boat.propulsionType) ?? t('boats.list.cards.unknownPropulsion') }}
          </span>
        </div>
        <div v-if="trashed" class="mt-4 space-y-3">
          <p class="text-xs text-fg-muted">
            {{ t('boats.trash.purgeAt', { date: formatDate(boat.purgeAt) }) }}
          </p>
          <BoatTrashActions :boat-id="boat.id" :name="boat.name" />
        </div>
      </BaseCard>
    </component>
  </TransitionGroup>
</template>
