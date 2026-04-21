<script setup lang="ts">
import BaseBadge from '~/components/base/BaseBadge.vue'
import type { BoatListItem } from './types'

defineProps<{
  boats: BoatListItem[]
}>()

function maintenanceVariant(b: BoatListItem) {
  if (b.maintenance.urgentCount > 0) return 'warning'
  if (b.maintenance.upcomingCount > 0) return 'info'
  return 'neutral'
}

function maintenanceLabel(b: BoatListItem) {
  if (b.maintenance.urgentCount > 0) return `${b.maintenance.urgentCount} urgent`
  if (b.maintenance.upcomingCount > 0) return `${b.maintenance.upcomingCount} upcoming`
  return 'OK'
}
</script>

<template>
  <div class="overflow-hidden rounded-(--radius-card) border border-border bg-surface-elevated shadow-(--shadow-card)">
    <table class="w-full text-left text-sm">
      <thead class="bg-surface-muted text-fg-muted">
        <tr>
          <th class="px-4 py-3 font-semibold">Name</th>
          <th class="px-4 py-3 font-semibold">Registration</th>
          <th class="px-4 py-3 font-semibold">Type</th>
          <th class="px-4 py-3 font-semibold">Propulsion</th>
          <th class="px-4 py-3 font-semibold">Maintenance</th>
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
          <td class="px-4 py-3 text-fg-muted">{{ boat.registrationNumber ?? '—' }}</td>
          <td class="px-4 py-3 text-fg-muted">{{ boat.type ?? '—' }}</td>
          <td class="px-4 py-3 text-fg-muted">{{ boat.propulsionType ?? '—' }}</td>
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

