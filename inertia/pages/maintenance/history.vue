<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'

interface HistoryEvent {
  id: number
  boatId: number
  boatName: string
  subject: string
  title: string
  notes: string | null
  performedAt: string
  engineCaption: string | null
  sailCaption: string | null
  parts: Array<{ id: number; name: string; quantity: number | null }>
}

const props = defineProps<{
  events: HistoryEvent[]
  stats: {
    totalEvents: number
    totalParts: number
    totalBoats: number
  }
}>()

const search = ref('')
const subjectFilter = ref<string | null>(null)
const expandedIds = ref<Set<number>>(new Set())

const subjectFilters = [
  { key: null, label: 'Tous' },
  { key: 'engine', label: 'Moteur' },
  { key: 'sail', label: 'Voile' },
  { key: 'rig', label: 'Greement' },
  { key: 'hull', label: 'Coque' },
]

const filteredEvents = computed(() => {
  let result = props.events

  if (subjectFilter.value) {
    result = result.filter((e) => e.subject === subjectFilter.value)
  }

  if (search.value.trim()) {
    const query = search.value.toLowerCase()
    result = result.filter(
      (e) =>
        e.title.toLowerCase().includes(query) ||
        e.boatName.toLowerCase().includes(query)
    )
  }

  return result.sort((a, b) => b.performedAt.localeCompare(a.performedAt))
})

const eventsByMonth = computed(() => {
  const groups: Record<string, HistoryEvent[]> = {}
  for (const event of filteredEvents.value) {
    const key = event.performedAt.slice(0, 7)
    if (!groups[key]) groups[key] = []
    groups[key].push(event)
  }
  return groups
})

function formatMonthHeader(yearMonth: string): string {
  return new Date(yearMonth + '-01').toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
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

function getEquipmentCaption(event: HistoryEvent): string | null {
  return event.engineCaption || event.sailCaption || null
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
    <!-- Header -->
    <header class="space-y-4">
      <div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <BaseHeading level="1">Historique de maintenance</BaseHeading>
          <p class="mt-2 text-fg-muted">Toutes les interventions de votre flotte</p>
        </div>
        <!-- TODO: implement PDF export for full maintenance history — GET /maintenance/history.pdf with current filters as query params -->
        <BaseButton variant="secondary" size="sm" disabled>
          Exporter PDF
        </BaseButton>
      </div>
    </header>

    <!-- Filter bar -->
    <div class="mt-8 flex flex-col sm:flex-row gap-4">
      <div class="relative flex-1">
        <input
          v-model="search"
          type="text"
          placeholder="Rechercher par titre ou bateau..."
          class="w-full rounded-lg border border-border bg-surface-elevated px-4 py-2 text-sm text-fg placeholder-fg-muted focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="filter in subjectFilters"
          :key="filter.key ?? 'all'"
          type="button"
          :class="[
            'rounded-full px-4 py-2 text-sm font-medium transition-colors',
            subjectFilter === filter.key
              ? 'bg-brand text-white'
              : 'bg-surface-muted text-fg-muted hover:bg-surface-elevated hover:text-fg',
          ]"
          @click="subjectFilter = filter.key"
        >
          {{ filter.label }}
        </button>
      </div>
    </div>

    <!-- Stats strip -->
    <div class="mt-6 grid grid-cols-3 gap-4">
      <div class="rounded-lg border border-border bg-surface-elevated p-4 text-center">
        <p class="text-2xl font-bold text-fg">{{ stats.totalEvents }}</p>
        <p class="text-sm text-fg-muted">Evenements</p>
      </div>
      <div class="rounded-lg border border-border bg-surface-elevated p-4 text-center">
        <p class="text-2xl font-bold text-fg">{{ stats.totalParts }}</p>
        <p class="text-sm text-fg-muted">Pieces changees</p>
      </div>
      <div class="rounded-lg border border-border bg-surface-elevated p-4 text-center">
        <p class="text-2xl font-bold text-fg">{{ stats.totalBoats }}</p>
        <p class="text-sm text-fg-muted">Bateaux</p>
      </div>
    </div>

    <!-- Timeline -->
    <div class="mt-8">
      <div v-if="filteredEvents.length === 0">
        <BaseEmptyState
          title="Aucun evenement de maintenance"
          description="Commencez par ajouter un bateau et enregistrer vos interventions."
          action-label="Voir les bateaux"
          @action="$inertia.visit('/boats')"
        />
      </div>

      <div v-else class="space-y-8">
        <div v-for="(monthEvents, yearMonth) in eventsByMonth" :key="yearMonth">
          <!-- Month header -->
          <div class="flex items-center gap-4 mb-4">
            <h2 class="text-lg font-semibold text-fg capitalize">
              {{ formatMonthHeader(yearMonth) }}
            </h2>
            <span class="text-sm text-fg-muted">{{ monthEvents.length }} evenement(s)</span>
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
                <div class="flex-shrink-0 w-12 text-center">
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

                    <div class="flex items-center gap-3 flex-shrink-0">
                      <a
                        :href="`/boats/${event.boatId}`"
                        class="inline-flex"
                      >
                        <BaseBadge variant="neutral">{{ event.boatName }}</BaseBadge>
                      </a>
                      <span v-if="event.parts.length > 0" class="text-sm text-fg-muted">
                        {{ event.parts.length }} piece(s)
                      </span>
                      <button
                        type="button"
                        class="text-sm text-brand hover:underline"
                        @click="toggleExpand(event.id)"
                      >
                        {{ isExpanded(event.id) ? 'Masquer' : 'Detail' }}
                      </button>
                    </div>
                  </div>

                  <!-- Expanded details -->
                  <div v-if="isExpanded(event.id)" class="mt-4 pt-4 border-t border-border">
                    <div v-if="event.notes" class="mb-4">
                      <p class="text-sm font-medium text-fg-muted mb-1">Notes</p>
                      <p class="text-sm text-fg">{{ event.notes }}</p>
                    </div>

                    <div v-if="event.parts.length > 0">
                      <p class="text-sm font-medium text-fg-muted mb-2">Pieces utilisees</p>
                      <ul class="space-y-1">
                        <li
                          v-for="part in event.parts"
                          :key="part.id"
                          class="text-sm text-fg flex items-center gap-2"
                        >
                          <span class="w-2 h-2 rounded-full bg-brand flex-shrink-0" />
                          {{ part.name }}
                          <span v-if="part.quantity" class="text-fg-muted">
                            (x{{ part.quantity }})
                          </span>
                        </li>
                      </ul>
                    </div>

                    <div v-if="!event.notes && event.parts.length === 0" class="text-sm text-fg-muted">
                      Aucun detail supplementaire
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
