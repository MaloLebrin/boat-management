<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import CrewPlanningGrid from '~/components/crew/CrewPlanningGrid.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import { shiftDays } from '~/utils/crew_planning_days'
import type { CrewPlanning } from '#shared/types/crew'

/** Calendrier d'équipage (#883) : quatre semaines, une ligne par équipier. */
defineProps<{
  planning: CrewPlanning
}>()

const { t } = useT()
const { formatDateLong } = useDateFormat()
</script>

<template>
  <Head :title="t('crew.planning.title')" />

  <div class="w-full max-w-7xl px-6 py-10 sm:px-8">
    <BaseBreadcrumb
      :items="[{ label: t('crew.title'), href: '/crew' }, { label: t('crew.planning.title') }]"
    />

    <div class="mt-6 mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <BaseHeading level="1">{{ t('crew.planning.title') }}</BaseHeading>
        <p class="mt-1 text-sm text-fg-muted">
          {{
            t('crew.planning.calendar.range', {
              from: formatDateLong(planning.from),
              to: formatDateLong(planning.to),
            })
          }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <BaseButton
          variant="secondary"
          size="sm"
          :href="`/crew/planning?from=${shiftDays(planning.from, -7)}`"
          data-testid="crew-planning-prev"
        >
          {{ t('crew.planning.calendar.previous') }}
        </BaseButton>
        <BaseButton variant="ghost" size="sm" href="/crew/planning">
          {{ t('crew.planning.calendar.today') }}
        </BaseButton>
        <BaseButton
          variant="secondary"
          size="sm"
          :href="`/crew/planning?from=${shiftDays(planning.from, 7)}`"
          data-testid="crew-planning-next"
        >
          {{ t('crew.planning.calendar.next') }}
        </BaseButton>
      </div>
    </div>

    <CrewPlanningGrid v-if="planning.rows.length > 0" :planning="planning" />
    <p
      v-else
      class="rounded-lg border border-dashed border-border bg-surface-muted/30 p-8 text-center text-fg-muted"
    >
      {{ t('crew.planning.calendar.empty') }}
    </p>

    <p class="mt-4 text-sm text-fg-muted">{{ t('crew.planning.calendar.legend') }}</p>
  </div>
</template>
