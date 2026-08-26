<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { ref } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import type { MaintenanceEventRow } from '#shared/types/maintenance'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'

defineProps<{
  event: MaintenanceEventRow
  equipmentCaption: string | null
  subjectLink: string
}>()

const { t } = useT()
const { formatDate } = useDateFormat()

const expanded = ref(false)
</script>

<template>
  <!-- Repli carte mobile d'un événement de la timeline (#493) — la rangée
       desktop garde ses badges en ligne, ici tout empile et rien ne déborde -->
  <div class="rounded-lg border border-border bg-surface-elevated p-4 space-y-2">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="font-semibold text-fg">{{ event.title }}</p>
        <p v-if="equipmentCaption" class="text-sm text-fg-muted mt-0.5">{{ equipmentCaption }}</p>
      </div>
      <span class="text-sm text-fg-muted shrink-0">{{ formatDate(event.performedAt) }}</span>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <Link :href="`/boats/${event.boatId}`" class="inline-flex">
        <BaseBadge variant="neutral">{{ event.boatName }}</BaseBadge>
      </Link>
      <Link :href="subjectLink" class="inline-flex">
        <BaseBadge variant="info">{{
          t(`maintenance.history.subjects.${event.subject}`)
        }}</BaseBadge>
      </Link>
      <span v-if="event.parts.length > 0" class="text-sm text-fg-muted">
        {{ t('maintenance.history.timeline.pieces', { count: String(event.parts.length) }) }}
      </span>
    </div>

    <button type="button" class="text-sm text-brand hover:underline" @click="expanded = !expanded">
      {{
        expanded ? t('maintenance.history.timeline.hide') : t('maintenance.history.timeline.show')
      }}
    </button>

    <div v-if="expanded" class="pt-3 border-t border-border space-y-3">
      <div v-if="event.notes">
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
            <span v-if="part.quantity" class="text-fg-muted">(x{{ part.quantity }})</span>
          </li>
        </ul>
      </div>

      <div v-if="!event.notes && event.parts.length === 0" class="text-sm text-fg-muted">
        {{ t('maintenance.history.timeline.noDetails') }}
      </div>
    </div>
  </div>
</template>
