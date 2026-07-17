<script setup lang="ts">
import { computed } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import type { BoatListItem } from './types'
import { useT } from '~/composables/use_t'
import { propulsionLabel } from '~/utils/boat_propulsion_label'

const { t } = useT()

const props = defineProps<{
  boats: BoatListItem[]
}>()

// Colonnes masquées quand aucun bateau affiché ne renseigne la donnée,
// pour éviter une colonne remplie uniquement de « — ».
const showRegistration = computed(() => props.boats.some((b) => b.registrationNumber))
const showType = computed(() => props.boats.some((b) => b.type))

function maintenanceVariant(b: BoatListItem) {
  if (b.maintenance.urgentCount > 0) return 'warning'
  if (b.maintenance.upcomingCount > 0) return 'info'
  return 'neutral'
}

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
          <th v-if="showType" class="px-4 py-3 font-semibold">
            {{ t('boats.list.table.type') }}
          </th>
          <th class="px-4 py-3 font-semibold">{{ t('boats.list.table.propulsion') }}</th>
          <th class="px-4 py-3 font-semibold">{{ t('boats.list.table.maintenance') }}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        <tr
          v-for="boat in boats"
          :key="boat.id"
          class="transition-colors duration-(--motion-fast) ease-premium hover:bg-lilac-50/60"
        >
          <td class="px-4 py-3">
            <a :href="`/boats/${boat.id}`" class="font-semibold text-fg hover:underline">
              {{ boat.name }}
            </a>
          </td>
          <td v-if="showRegistration" class="px-4 py-3 text-fg-muted">
            {{ boat.registrationNumber ?? '—' }}
          </td>
          <td v-if="showType" class="px-4 py-3 text-fg-muted">{{ boat.type ?? '—' }}</td>
          <td class="px-4 py-3 text-fg-muted">
            {{ propulsionLabel(t, boat.propulsionType) ?? '—' }}
          </td>
          <td class="px-4 py-3">
            <BaseBadge :variant="maintenanceVariant(boat)">
              {{ maintenanceLabel(boat) }}
            </BaseBadge>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
