<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import type { MaintenanceEventRow } from '#shared/types/maintenance'
import { useT } from '~/composables/use_t'

const props = defineProps<{
  events: MaintenanceEventRow[]
}>()

const { t, locale } = useT()

const expandedIds = ref<Set<number>>(new Set())

const eventsByMonth = computed(() => {
  const groups: Record<string, MaintenanceEventRow[]> = {}
  for (const event of props.events) {
    const key = event.performedAt.slice(0, 7)
    if (!groups[key]) groups[key] = []
    groups[key].push(event)
  }
  return groups
})

function formatMonthHeader(yearMonth: string): string {
  return new Date(yearMonth + '-01').toLocaleDateString(locale.value, {
    month: 'long',
    year: 'numeric',
  })
}

function getDayNumber(iso: string): string {
  return new Date(iso).getDate().toString()
}

function toggleExpand(id: number) {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id)
  } else {
    expandedIds.value.add(id)
  }
}

function isExpanded(id: number): boolean {
  return expandedIds.value.has(id)
}

function getEquipmentCaption(event: MaintenanceEventRow): string | null {
  return event.engineCaption || event.sailCaption || null
}

function getSubjectLink(event: MaintenanceEventRow): string {
  if (event.subject === 'engine' && event.boatEngineId) {
    return `/boats/${event.boatId}/engines/${event.boatEngineId}`
  }
  if (event.subject === 'sail' || event.subject === 'rig') {
    return `/boats/${event.boatId}?tab=equipment`
  }
  return `/boats/${event.boatId}`
}
</script>

<template>
  <div class="space-y-8">
    <div v-for="(monthEvents, yearMonth) in eventsByMonth" :key="yearMonth">
      <!-- Month header -->
      <div class="flex items-center gap-4 mb-4">
        <h2 class="text-lg font-semibold text-fg capitalize">
          {{ formatMonthHeader(yearMonth) }}
        </h2>
        <span class="text-sm text-fg-muted">{{
          t('maintenance.history.timeline.events', { count: String(monthEvents.length) })
        }}</span>
      </div>

      <!-- Events -->
      <div class="space-y-3">
        <div
          v-for="(event, index) in monthEvents"
          :key="event.id"
          :class="[
            'rounded-lg border border-border p-4',
            index % 2 === 0 ? 'bg-surface-elevated' : 'bg-surface',
          ]"
        >
          <div class="flex items-start gap-4">
            <!-- Date -->
            <div class="shrink-0 w-12 text-center">
              <p class="text-2xl font-bold text-fg">{{ getDayNumber(event.performedAt) }}</p>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="font-semibold text-fg">{{ event.title }}</p>
                  <p v-if="getEquipmentCaption(event)" class="text-sm text-fg-muted mt-1">
                    {{ getEquipmentCaption(event) }}
                  </p>
                </div>

                <div class="flex items-center gap-3 shrink-0">
                  <a :href="`/boats/${event.boatId}`" class="inline-flex">
                    <BaseBadge variant="neutral">{{ event.boatName }}</BaseBadge>
                  </a>
                  <a :href="getSubjectLink(event)" class="inline-flex">
                    <BaseBadge variant="info">{{
                      t(`maintenance.history.subjects.${event.subject}`)
                    }}</BaseBadge>
                  </a>
                  <span v-if="event.parts.length > 0" class="text-sm text-fg-muted">
                    {{
                      t('maintenance.history.timeline.pieces', {
                        count: String(event.parts.length),
                      })
                    }}
                  </span>
                  <button
                    type="button"
                    class="text-sm text-brand hover:underline"
                    @click="toggleExpand(event.id)"
                  >
                    {{
                      isExpanded(event.id)
                        ? t('maintenance.history.timeline.hide')
                        : t('maintenance.history.timeline.show')
                    }}
                  </button>
                </div>
              </div>

              <!-- Expanded details -->
              <div v-if="isExpanded(event.id)" class="mt-4 pt-4 border-t border-border">
                <div v-if="event.notes" class="mb-4">
                  <p class="text-sm font-medium text-fg-muted mb-1">
                    {{ t('maintenance.history.timeline.notes') }}
                  </p>
                  <p class="text-sm text-fg">{{ event.notes }}</p>
                </div>

                <div v-if="event.parts.length > 0">
                  <p class="text-sm font-medium text-fg-muted mb-2">
                    {{ t('maintenance.history.timeline.partsUsed') }}
                  </p>
                  <ul class="space-y-1">
                    <li
                      v-for="part in event.parts"
                      :key="part.id"
                      class="text-sm text-fg flex items-center gap-2"
                    >
                      <span class="w-2 h-2 rounded-full bg-brand shrink-0" />
                      {{ part.name }}
                      <span v-if="part.quantity" class="text-fg-muted">
                        (x{{ part.quantity }})
                      </span>
                    </li>
                  </ul>
                </div>

                <div v-if="!event.notes && event.parts.length === 0" class="text-sm text-fg-muted">
                  {{ t('maintenance.history.timeline.noDetails') }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
