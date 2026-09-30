<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { computed } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BoatStatusBadge from '~/components/boats/BoatStatusBadge.vue'
import BoatTrashActions from '~/components/boats/list/BoatTrashActions.vue'
import type { BoatListItem } from './types'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import { maintenanceVariant } from '~/utils/status_variants'
import { boatCategoryLabel, propulsionLabel } from '~/utils/boat_enum_labels'

const { t } = useT()
const { formatDate } = useDateFormat()

const props = defineProps<{
  boats: BoatListItem[]
  trashed?: boolean
}>()

// Colonnes masquées quand aucun bateau affiché ne renseigne la donnée,
// pour éviter une colonne remplie uniquement de « — ».
const showRegistration = computed(() => props.boats.some((b) => b.registrationNumber))
const showCategory = computed(() => props.boats.some((b) => b.category))

function maintenanceLabel(b: BoatListItem) {
  if (b.maintenance.urgentCount > 0)
    return t('boats.list.maintenance.urgent', { count: b.maintenance.urgentCount })
  if (b.maintenance.upcomingCount > 0)
    return t('boats.list.maintenance.upcoming', { count: b.maintenance.upcomingCount })
  return t('boats.list.maintenance.ok')
}
</script>

<template>
  <div
    class="overflow-hidden rounded-(--radius-card) border border-border bg-surface-elevated shadow-(--shadow-card)"
  >
    <table class="w-full text-left text-sm">
      <thead class="bg-surface-muted text-fg-muted">
        <tr>
          <th class="px-4 py-3 font-semibold">{{ t('boats.list.table.name') }}</th>
          <th v-if="showRegistration" class="px-4 py-3 font-semibold">
            {{ t('boats.list.table.registration') }}
          </th>
          <th v-if="showCategory" class="px-4 py-3 font-semibold">
            {{ t('boats.list.table.category') }}
          </th>
          <th class="px-4 py-3 font-semibold">{{ t('boats.list.table.propulsion') }}</th>
          <th class="px-4 py-3 font-semibold">{{ t('boats.list.table.status') }}</th>
          <th v-if="!trashed" class="px-4 py-3 font-semibold">
            {{ t('boats.list.table.maintenance') }}
          </th>
          <th v-else class="px-4 py-3 font-semibold">{{ t('boats.trash.purgeColumn') }}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        <tr
          v-for="boat in boats"
          :key="boat.id"
          class="transition-colors duration-(--motion-fast) ease-premium hover:bg-lilac-50/60"
        >
          <td class="px-4 py-3">
            <Link
              v-if="!trashed"
              :href="`/boats/${boat.id}`"
              class="font-semibold text-fg hover:underline"
            >
              {{ boat.name }}
            </Link>
            <span v-else class="font-semibold text-fg">{{ boat.name }}</span>
          </td>
          <td v-if="showRegistration" class="px-4 py-3 text-fg-muted">
            {{ boat.registrationNumber ?? '—' }}
          </td>
          <td v-if="showCategory" class="px-4 py-3 text-fg-muted">
            {{ boatCategoryLabel(t, boat.category) ?? '—' }}
          </td>
          <td class="px-4 py-3 text-fg-muted">
            {{ propulsionLabel(t, boat.propulsionType) ?? '—' }}
          </td>
          <td class="px-4 py-3">
            <BoatStatusBadge :status="boat.status" />
          </td>
          <td v-if="!trashed" class="px-4 py-3">
            <BaseBadge :variant="maintenanceVariant(boat.maintenance)">
              {{ maintenanceLabel(boat) }}
            </BaseBadge>
          </td>
          <td v-else class="px-4 py-3">
            <p class="text-fg-muted">
              {{ t('boats.trash.purgeAt', { date: formatDate(boat.purgeAt) }) }}
            </p>
            <BoatTrashActions class="mt-2" :boat-id="boat.id" :name="boat.name" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
