<script setup lang="ts">
import { DocumentTextIcon } from '@heroicons/vue/24/outline'
import { computed, ref, watch } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseSegmentedControl from '~/components/base/BaseSegmentedControl.vue'
import { subjectLabel, targetDescription } from '~/components/boats/maintenance/utils'
import BoatMaintenanceEventModal from '~/components/boats/show/modals/BoatMaintenanceEventModal.vue'
import { useT } from '~/composables/use_t'
import type { BoatShowDetail, MaintenanceEventRow } from '~/types/boat_show'

const props = defineProps<{
  boat: BoatShowDetail
  maintenanceEvents: MaintenanceEventRow[]
  canManageMaintenance: boolean
  createEventNonce?: number
}>()

const { t } = useT()

const isEventModalOpen = ref(false)

watch(
  () => props.createEventNonce,
  (v) => {
    if (!v) return
    if (!props.canManageMaintenance) return
    isEventModalOpen.value = true
  }
)

const historyFilter = ref<'all' | 'engine' | 'sail' | 'rig' | 'boat'>('all')
const historySearch = ref('')
const expandedEventId = ref<number | null>(null)

const filterOptions = computed(() => [
  { value: 'all', label: t('boats.show.historyTab.filterAll') },
  { value: 'engine', label: t('boats.show.historyTab.filterEngine') },
  { value: 'sail', label: t('boats.show.historyTab.filterSail') },
  { value: 'rig', label: t('boats.show.historyTab.filterRig') },
  { value: 'boat', label: t('boats.show.historyTab.filterHull') },
])

const filteredEvents = computed(() => {
  let events = props.maintenanceEvents
  if (historyFilter.value !== 'all') {
    events = events.filter((e) => e.subject === historyFilter.value)
  }
  if (historySearch.value.trim()) {
    const q = historySearch.value.toLowerCase()
    events = events.filter((e) => e.title.toLowerCase().includes(q))
  }
  return events.sort((a, b) => String(b.performedAt).localeCompare(String(a.performedAt)))
})

const filteredEventsByMonth = computed(() => {
  const groups: Record<string, MaintenanceEventRow[]> = {}
  for (const ev of filteredEvents.value) {
    const monthKey = ev.performedAt.slice(0, 7)
    if (!groups[monthKey]) groups[monthKey] = []
    groups[monthKey].push(ev)
  }
  return groups
})

const historyStats = computed(() => {
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)
  const cutoff = twelveMonthsAgo.toISOString().slice(0, 10)
  const recentEvents = props.maintenanceEvents.filter((e) => e.performedAt >= cutoff)
  const totalParts = recentEvents.reduce((sum, e) => sum + e.parts.length, 0)
  return { eventCount: recentEvents.length, partCount: totalParts }
})

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function toggleEventDetails(eventId: number) {
  expandedEventId.value = expandedEventId.value === eventId ? null : eventId
}

function getSubjectLink(ev: MaintenanceEventRow): string {
  if (ev.subject === 'engine' && ev.boatEngineId) {
    return `/boats/${props.boat.id}/engines/${ev.boatEngineId}`
  }
  if (ev.subject === 'sail' || ev.subject === 'rig') {
    return `/boats/${props.boat.id}?tab=equipment`
  }
  return `/boats/${props.boat.id}`
}
</script>

<template>
  <BoatMaintenanceEventModal
    v-model:open="isEventModalOpen"
    :boat="boat"
    :can-manage-maintenance="canManageMaintenance"
  />

  <div class="flex flex-col lg:flex-row gap-6">
    <!-- Main content -->
    <div class="flex-1 space-y-6">
      <!-- Header with action button -->
      <div v-if="canManageMaintenance" class="flex items-center justify-end">
        <BaseButton variant="secondary" size="sm" type="button" @click="isEventModalOpen = true">
          {{ t('boats.show.historyTab.addEvent') }}
        </BaseButton>
      </div>

      <!-- Search and filters -->
      <div class="flex flex-wrap items-center gap-4">
        <input
          v-model="historySearch"
          type="text"
          :placeholder="t('boats.show.historyTab.search')"
          class="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <BaseSegmentedControl v-model="historyFilter" :options="filterOptions" />
      </div>

      <!-- Events grouped by month -->
      <div v-if="Object.keys(filteredEventsByMonth).length === 0" class="text-sm text-fg-muted">
        {{ t('boats.show.historyTab.noEvents') }}
      </div>
      <div v-else class="space-y-8">
        <div v-for="(events, monthKey) in filteredEventsByMonth" :key="monthKey">
          <h3 class="text-sm font-semibold text-fg-muted uppercase tracking-wider mb-4">
            {{ formatMonth(monthKey) }}
          </h3>
          <ul class="space-y-3">
            <li
              v-for="ev in events"
              :key="ev.id"
              class="rounded-lg border border-border bg-surface-elevated p-4"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="flex items-start gap-4">
                  <div
                    class="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center text-sm font-bold text-fg"
                  >
                    {{ new Date(ev.performedAt).getDate() }}
                  </div>
                  <div>
                    <p class="font-semibold text-fg">{{ ev.title }}</p>
                    <p class="text-sm text-fg-muted">
                      <a
                        :href="getSubjectLink(ev)"
                        class="hover:text-brand hover:underline transition-colors"
                      >
                        {{ subjectLabel(ev.subject) }}
                        <span v-if="targetDescription(ev) !== subjectLabel(ev.subject)">
                          · {{ targetDescription(ev) }}
                        </span>
                      </a>
                    </p>
                    <div v-if="ev.parts.length > 0" class="mt-2 flex items-center gap-2">
                      <BaseBadge variant="neutral">
                        {{ t('boats.show.historyTab.pieces', { count: String(ev.parts.length) }) }}
                      </BaseBadge>
                      <button
                        type="button"
                        class="text-xs font-semibold text-brand hover:underline"
                        @click="toggleEventDetails(ev.id)"
                      >
                        {{
                          expandedEventId === ev.id
                            ? t('boats.show.historyTab.toggleHide')
                            : t('boats.show.historyTab.toggleShow')
                        }}
                      </button>
                    </div>
                    <!-- Expanded parts list -->
                    <div
                      v-if="expandedEventId === ev.id && ev.parts.length > 0"
                      class="mt-3 pl-4 border-l-2 border-border"
                    >
                      <ul class="space-y-1 text-sm">
                        <li v-for="part in ev.parts" :key="part.id" class="text-fg-muted">
                          {{ part.name }}
                          <span v-if="part.quantity" class="text-fg-subtle"
                            >(x{{ part.quantity }})</span
                          >
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Right sidebar (w-56) -->
    <div class="w-full lg:w-56 space-y-6">
      <BaseCard padded>
        <p class="text-sm font-semibold text-fg">{{ t('boats.show.historyTab.sidebarTitle') }}</p>
        <dl class="mt-3 space-y-2 text-sm">
          <div class="flex items-center justify-between">
            <dt class="text-fg-muted">{{ t('boats.show.historyTab.sidebarEvents') }}</dt>
            <dd class="font-semibold text-fg">{{ historyStats.eventCount }}</dd>
          </div>
          <div class="flex items-center justify-between">
            <dt class="text-fg-muted">{{ t('boats.show.historyTab.sidebarParts') }}</dt>
            <dd class="font-semibold text-fg">{{ historyStats.partCount }}</dd>
          </div>
        </dl>
      </BaseCard>
      <!-- TODO: implement PDF export for maintenance history (e.g. GET /boats/:id/maintenance/history.pdf) -->
      <BaseButton variant="secondary" size="sm" class="w-full" disabled>
        <DocumentTextIcon class="h-4 w-4 mr-2" />
        {{ t('boats.show.historyTab.exportPdf') }}
      </BaseButton>
    </div>
  </div>
</template>
