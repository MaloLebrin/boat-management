<script setup lang="ts">
import { computed } from 'vue'
import { Form } from '@adonisjs/inertia/vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import { useT } from '~/composables/use_t'
import type { BoatShowEngine, MaintenanceEventRow, MaintenanceTaskRow } from '~/types/boat_show'

const { t } = useT()

const props = defineProps<{
  boat: { id: number; name: string }
  engine: BoatShowEngine
  maintenanceEvents: MaintenanceEventRow[]
  openTasks: MaintenanceTaskRow[]
  sortedOpenTasks: MaintenanceTaskRow[]
  totalParts: number
  canManage: boolean
  eventsByYearMonth: Record<string, MaintenanceEventRow[]>
}>()

const todayIso = computed(() => new Date().toISOString().slice(0, 10))

function getTaskStatus(task: MaintenanceTaskRow): 'overdue' | 'soon' | 'scheduled' {
  if (
    task.dueEngineHours !== null &&
    props.engine.hours !== null &&
    props.engine.hours >= task.dueEngineHours
  ) {
    return 'overdue'
  }
  if (task.dueAt && task.dueAt <= todayIso.value) {
    return 'overdue'
  }
  if (task.dueEngineHours !== null && props.engine.hours !== null) {
    const remaining = task.dueEngineHours - props.engine.hours
    if (remaining <= 50) return 'soon'
  }
  return 'scheduled'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
</script>

<template>
  <div class="flex flex-col lg:flex-row gap-6">
    <div class="flex-1 space-y-8">
      <!-- A venir -->
      <section>
        <h2 class="text-lg font-semibold text-fg mb-4">
          {{ t('boats.engineShow.maintenance.upcoming') }}
        </h2>
        <div v-if="openTasks.length === 0" class="text-sm text-fg-muted">
          {{ t('boats.engineShow.maintenance.noUpcoming') }}
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="task in sortedOpenTasks"
            :key="task.id"
            class="rounded-lg border border-border bg-surface-elevated p-4"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="flex items-center gap-2">
                  <p class="font-semibold text-fg">{{ task.title }}</p>
                  <BaseBadge
                    :variant="
                      getTaskStatus(task) === 'overdue'
                        ? 'warning'
                        : getTaskStatus(task) === 'soon'
                          ? 'info'
                          : 'neutral'
                    "
                  >
                    {{
                      getTaskStatus(task) === 'overdue'
                        ? t('boats.engineShow.maintenance.taskStatus.overdue')
                        : getTaskStatus(task) === 'soon'
                          ? t('boats.engineShow.maintenance.taskStatus.soon')
                          : t('boats.engineShow.maintenance.taskStatus.planned')
                    }}
                  </BaseBadge>
                </div>
                <p class="text-sm text-fg-muted mt-1">
                  <span v-if="task.dueAt">{{
                    t('boats.engineShow.maintenance.dueAt', { date: formatDate(task.dueAt) })
                  }}</span>
                  <span v-if="task.dueAt && task.dueEngineHours"> | </span>
                  <span v-if="task.dueEngineHours">{{
                    t('boats.engineShow.maintenance.dueHours', {
                      hours: String(task.dueEngineHours),
                    })
                  }}</span>
                </p>
              </div>
              <div v-if="canManage" class="flex items-center gap-2">
                <BaseButton variant="ghost" size="sm" href="/planning">
                  {{ t('boats.engineShow.actions.schedule') }}
                </BaseButton>
                <Form
                  :action="`/boats/${boat.id}/maintenance-tasks/${task.id}/done`"
                  method="put"
                  class="inline"
                >
                  <BaseButton variant="secondary" size="sm" type="submit">
                    {{ t('boats.engineShow.actions.markDone') }}
                  </BaseButton>
                </Form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Historique -->
      <section>
        <h2 class="text-lg font-semibold text-fg mb-4">
          {{ t('boats.engineShow.maintenance.history') }}
        </h2>
        <div v-if="maintenanceEvents.length === 0" class="text-sm text-fg-muted">
          {{ t('boats.engineShow.maintenance.noHistory') }}
        </div>
        <div v-else class="space-y-6">
          <div v-for="(events, yearMonth) in eventsByYearMonth" :key="yearMonth">
            <p class="text-sm font-semibold text-fg-muted mb-3">
              {{
                new Date(yearMonth + '-01').toLocaleDateString('fr-FR', {
                  month: 'long',
                  year: 'numeric',
                })
              }}
            </p>
            <div class="space-y-2">
              <div
                v-for="event in events"
                :key="event.id"
                class="flex items-center justify-between rounded-lg border border-border bg-surface-elevated p-3"
              >
                <div class="flex items-center gap-4">
                  <span class="text-sm text-fg-muted">{{ formatDate(event.performedAt) }}</span>
                  <span class="font-medium text-fg">{{ event.title }}</span>
                </div>
                <span v-if="event.parts.length > 0" class="text-sm text-fg-muted">
                  {{
                    t('boats.engineShow.maintenance.parts', { count: String(event.parts.length) })
                  }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Right stats -->
    <div class="w-full lg:w-56 space-y-4">
      <BaseCard>
        <dl class="space-y-4 text-sm">
          <div class="flex items-center justify-between">
            <dt class="text-fg-muted">{{ t('boats.engineShow.maintenance.totalEvents') }}</dt>
            <dd class="font-semibold text-fg">{{ maintenanceEvents.length }}</dd>
          </div>
          <div class="flex items-center justify-between">
            <dt class="text-fg-muted">{{ t('boats.engineShow.maintenance.totalParts') }}</dt>
            <dd class="font-semibold text-fg">{{ totalParts }}</dd>
          </div>
        </dl>
      </BaseCard>
      <BaseButton variant="secondary" size="sm" class="w-full" disabled>
        {{ t('boats.engineShow.actions.exportPdf') }}
      </BaseButton>
    </div>
  </div>
</template>
