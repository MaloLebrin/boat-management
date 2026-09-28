<script setup lang="ts">
import { computed, onMounted, useTemplateRef } from 'vue'
import type { PlanningReservation, PlanningTask } from '#shared/types/planning'
import BaseButton from '~/components/base/BaseButton.vue'
import MaintenanceTaskPostponeMenu from '~/components/boats/maintenance/MaintenanceTaskPostponeMenu.vue'
import { useT } from '~/composables/use_t'
import { useDateFormat } from '~/composables/use_date_format'
import { usePermissions } from '~/composables/use_permissions'
import { maintenanceSubjectLabel } from '~/utils/boat_enum_labels'
import { initialsOf } from '#shared/helpers/full_name'

const props = defineProps<{
  task: PlanningTask
  accentClass?: string
  badgeClass?: string
  done?: boolean
  /** Tâche ciblée par `/planning?task=<id>` (#473) : surlignée et amenée à l'écran. */
  highlighted?: boolean
  /** Glisser-déposer (#869) : la carte porte une poignée de déplacement. */
  draggable?: boolean
  /** La carte est en train d'être glissée : elle suit le pointeur. */
  dragging?: boolean
  dragOffset?: { x: number; y: number } | null
  /** Réservation confirmée du bateau pendant l'échéance (#869). */
  conflict?: PlanningReservation | null
}>()

const emit = defineEmits<{ dragStart: [event: PointerEvent] }>()

// La carte suit le pointeur ; `pointer-events: none` laisse `elementFromPoint`
// trouver la colonne *sous* elle, et non la carte elle-même.
const dragStyle = computed(() =>
  props.dragging && props.dragOffset
    ? {
        transform: `translate(${props.dragOffset.x}px, ${props.dragOffset.y}px)`,
        pointerEvents: 'none' as const,
      }
    : undefined
)

const root = useTemplateRef<HTMLElement>('root')

onMounted(() => {
  if (!props.highlighted) return
  root.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
})

const { t } = useT()
const { formatDate, formatDayMonth } = useDateFormat()
const { can } = usePermissions()

// /boats/:id passe par BoatPolicy.view → capability `boats.view`, que le rôle
// `mechanic` n'a pas alors que /planning lui est accessible : sans ce garde, la
// carte affiche un lien qui répond 403 (#473).
const canViewBoat = computed(() => can('boats.view'))

// Report en un clic depuis le planning (#867) : même capability que la clôture.
const canPostpone = computed(
  () => !props.done && props.task.kind === 'date' && !!props.task.dueAt && can('maintenance.edit')
)

function formatDue(task: PlanningTask): string {
  if (task.kind === 'date' && task.dueAt) return formatDate(task.dueAt)
  if (task.kind === 'hours' && task.dueEngineHours !== null) return `${task.dueEngineHours}h`
  return '—'
}
</script>

<template>
  <div
    :id="`planning-task-${task.id}`"
    ref="root"
    class="relative rounded-lg border border-border bg-surface-elevated p-3"
    :class="[
      accentClass ? `border-l-4 ${accentClass}` : '',
      highlighted ? 'ring-2 ring-brand ring-offset-2 ring-offset-surface' : '',
      dragging ? 'z-50 shadow-lg ring-2 ring-brand' : '',
    ]"
    :style="dragStyle"
    :data-testid="`planning-task-card-${task.id}`"
  >
    <div class="flex items-start justify-between gap-2">
      <!--
        Poignée ≥ 44 px (#494) : seule zone qui capte le glisser, pour que le
        reste de la carte défile normalement au doigt. Le chemin clavier est le
        menu « Reporter » : le glisser n'est jamais le seul.
      -->
      <span
        v-if="draggable"
        class="-my-2 -ml-2 flex h-11 w-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-fg-subtle hover:bg-surface-muted hover:text-fg active:cursor-grabbing"
        :title="t('planning.drag.handle')"
        :aria-label="t('planning.drag.handle')"
        role="img"
        data-testid="planning-task-drag-handle"
        @pointerdown="emit('dragStart', $event)"
      >
        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M7 4a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm6 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM7 11.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm6 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM7 19a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm6 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"
          />
        </svg>
      </span>
      <p class="mr-auto text-xs font-medium text-fg-muted">{{ task.boatName }}</p>
      <!-- Assigné (#868) : pastille d'initiales, nom complet au survol. -->
      <span
        v-if="task.assignee"
        role="img"
        class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-on-brand"
        :title="t('planning.assignedTo', { name: task.assignee.fullName })"
        :aria-label="t('planning.assignedTo', { name: task.assignee.fullName })"
        data-testid="planning-task-assignee"
      >
        {{ initialsOf(task.assignee.fullName) }}
      </span>
    </div>
    <p class="mt-1 text-sm font-semibold text-fg" :class="done ? 'line-through' : ''">
      {{ task.title }}
    </p>
    <p class="mt-1 text-xs text-fg-muted">{{ maintenanceSubjectLabel(t, task.subject) }}</p>
    <p v-if="task.providerName" class="mt-1 text-xs text-fg-subtle">
      {{ t('boats.maintenance.tasks.workOrder.providerShort', { name: task.providerName }) }}
    </p>
    <p
      v-if="conflict"
      class="mt-1 text-xs font-medium text-danger"
      data-testid="planning-task-conflict"
    >
      {{
        t('planning.drag.conflictBadge', {
          client: conflict.clientName,
          from: formatDayMonth(conflict.startsAt),
          to: formatDayMonth(conflict.endsAt),
        })
      }}
    </p>
    <p v-if="task.postponedCount > 0" class="mt-1 text-xs font-medium text-warning">
      {{ t('planning.postponedCount', { count: String(task.postponedCount) }) }}
    </p>
    <div class="mt-2 flex items-center justify-between">
      <span
        class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
        :class="badgeClass ?? 'bg-surface-muted text-fg-muted'"
      >
        {{ formatDue(task) }}
      </span>
      <MaintenanceTaskPostponeMenu
        v-if="canPostpone"
        :boat-id="task.boatId"
        :task-id="task.id"
        :due-at="task.dueAt!"
      />
      <BaseButton
        v-if="canViewBoat"
        variant="ghost"
        size="sm"
        route="boats.show"
        :params="{ id: task.boatId }"
      >
        {{ t('planning.taskKind.' + task.kind) }}
      </BaseButton>
      <span v-else class="px-3 text-xs font-semibold text-fg-muted">
        {{ t('planning.taskKind.' + task.kind) }}
      </span>
    </div>
  </div>
</template>
