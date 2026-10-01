<script setup lang="ts">
import { computed } from 'vue'
import { Link } from '@adonisjs/inertia/vue'
import CrewMemberStatusBadge from '~/components/crew/CrewMemberStatusBadge.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import { entriesOnDay, planningDays } from '~/utils/crew_planning_days'
import type { CrewPlanning, CrewPlanningEntry } from '#shared/types/crew'

/**
 * Calendrier d'équipage (#883) : une ligne par équipier, une colonne par
 * jour. Embarquement en couleur de marque, indisponibilité en ambre, deux
 * occupations le même jour en rouge — un chevauchement à résoudre.
 */
const props = defineProps<{
  planning: CrewPlanning
}>()

const { t } = useT()
const { formatWeekdayShort, formatDayMonth } = useDateFormat()

const days = computed(() => planningDays(props.planning.from, props.planning.to))

function cellClass(entries: CrewPlanningEntry[]): string {
  if (entries.length > 1) return 'bg-danger-soft text-danger'
  if (entries.length === 0) return ''
  return entries[0].kind === 'reservation'
    ? 'bg-brand-soft text-brand'
    : 'bg-amber-100 text-amber-800'
}

function cellTitle(entries: CrewPlanningEntry[]): string {
  return entries
    .map((entry) =>
      entry.kind === 'reservation'
        ? t('crew.planning.calendar.boarding', {
            boat: entry.boatName ?? '',
            client: entry.label ?? '',
            role: t(`crew.planning.roles.${entry.role ?? 'crew'}`),
          })
        : t('crew.planning.calendar.unavailable', {
            reason: entry.label ?? t('crew.planning.conflict.noReason'),
          })
    )
    .join(' · ')
}

function cellText(entries: CrewPlanningEntry[]): string {
  if (entries.length === 0) return ''
  const first = entries[0]
  return first.kind === 'reservation'
    ? (first.boatName ?? '').slice(0, 3)
    : t('crew.planning.calendar.offShort')
}
</script>

<template>
  <div class="overflow-x-auto rounded-lg border border-border" data-testid="crew-planning-grid">
    <table class="min-w-full border-collapse text-xs">
      <thead class="bg-surface-muted">
        <tr>
          <th scope="col" class="sticky left-0 z-10 bg-surface-muted px-3 py-2 text-left text-fg">
            {{ t('crew.planning.calendar.member') }}
          </th>
          <th
            v-for="day in days"
            :key="day"
            scope="col"
            class="min-w-10 px-1 py-2 text-center font-normal text-fg-muted"
          >
            <span class="block">{{ formatWeekdayShort(day) }}</span>
            <span class="block font-medium text-fg">{{ formatDayMonth(day) }}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in planning.rows" :key="row.crewMemberId" class="border-t border-border">
          <th
            scope="row"
            class="sticky left-0 z-10 bg-surface px-3 py-2 text-left font-medium whitespace-nowrap"
          >
            <Link :href="`/crew/${row.crewMemberId}`" class="text-fg hover:text-brand">
              {{ row.fullName }}
            </Link>
            <CrewMemberStatusBadge :status="row.certificationStatus" class="ml-1" />
          </th>
          <td
            v-for="day in days"
            :key="day"
            :class="[
              'h-9 border-l border-border text-center',
              cellClass(entriesOnDay(row.entries, day)),
            ]"
            :title="cellTitle(entriesOnDay(row.entries, day))"
            :data-testid="`crew-cell-${row.crewMemberId}-${day}`"
          >
            {{ cellText(entriesOnDay(row.entries, day)) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
