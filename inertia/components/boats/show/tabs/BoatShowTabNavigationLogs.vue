<script setup lang="ts">
import { ref } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import NavigationLogForm from '~/components/boats/show/tabs/NavigationLogForm.vue'
import NavigationLogCloseForm from '~/components/boats/show/tabs/NavigationLogCloseForm.vue'
import NavigationLogCrewPanel from '~/components/boats/show/tabs/NavigationLogCrewPanel.vue'
import { useT } from '~/composables/use_t'
import type { BoatShowDetail, NavigationLogRow, NavigationLogPortOption } from '~/types/boat_show'
import type { CrewMemberOption } from '../../../../../shared/types/crew'

const props = defineProps<{
  boat: BoatShowDetail
  navigationLogs: NavigationLogRow[]
  portOptions: NavigationLogPortOption[]
  crewMemberOptions: CrewMemberOption[]
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}>()

const { t } = useT()

const showCreateForm = ref(false)
const closingLogId = ref<number | null>(null)

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function portLabel(portId: number | null, portName: string | null): string {
  if (portId) {
    const found = props.portOptions.find((p) => p.id === portId)
    if (found) return found.name
  }
  return portName ?? '—'
}

function deleteLog(logId: number) {
  if (!window.confirm(t('navigation_logs.deleteConfirm'))) return
  router.delete(`/boats/${props.boat.id}/navigation-logs/${logId}`, { preserveScroll: true })
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <p class="text-sm text-fg-muted">
        {{ t('navigation_logs.count', { count: String(navigationLogs.length) }) }}
      </p>
      <BaseButton
        v-if="canCreate"
        variant="primary"
        size="sm"
        type="button"
        @click="showCreateForm = true"
      >
        {{ t('navigation_logs.add') }}
      </BaseButton>
    </div>

    <!-- Create form -->
    <NavigationLogForm
      v-if="showCreateForm"
      :boat="boat"
      :port-options="portOptions"
      @close="showCreateForm = false"
    />

    <!-- Logs list -->
    <div v-if="navigationLogs.length > 0" class="space-y-4">
      <div
        v-for="log in navigationLogs"
        :key="log.id"
        class="rounded-lg border border-border bg-surface-elevated p-4 space-y-3"
      >
        <!-- Close form for in-progress trips -->
        <NavigationLogCloseForm
          v-if="closingLogId === log.id"
          :boat-id="boat.id"
          :log="log"
          :port-options="portOptions"
          @close="closingLogId = null"
        />

        <template v-else>
          <!-- Top row: date + status + actions -->
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0 flex-1 space-y-1">
              <!-- Status badge + departure -->
              <div class="flex flex-wrap items-center gap-2">
                <BaseBadge :variant="log.status === 'in_progress' ? 'warning' : 'success'">
                  {{
                    log.status === 'in_progress'
                      ? t('navigation_logs.inProgress')
                      : t('navigation_logs.completed')
                  }}
                </BaseBadge>
                <span class="font-semibold text-fg text-sm">
                  {{ formatDateTime(log.departedAt) }}
                </span>
                <span v-if="log.arrivedAt" class="text-sm text-fg-muted">
                  → {{ formatDateTime(log.arrivedAt) }}
                </span>
              </div>

              <!-- Ports -->
              <div class="text-sm text-fg-muted">
                <span>{{ portLabel(log.departurePortId, log.departurePortName) }}</span>
                <span v-if="log.arrivalPortId || log.arrivalPortName" class="mx-1">→</span>
                <span v-if="log.arrivalPortId || log.arrivalPortName">
                  {{ portLabel(log.arrivalPortId, log.arrivalPortName) }}
                </span>
              </div>

              <!-- Metrics -->
              <div class="flex flex-wrap items-center gap-3 text-xs text-fg-muted">
                <span v-if="log.distanceNm !== null" class="font-medium text-brand">
                  {{ log.distanceNm.toFixed(1) }} {{ t('navigation_logs.distanceSuffix') }}
                </span>
                <span v-if="log.engineHoursEnd !== null && log.engineHoursStart !== null">
                  {{ log.engineHoursStart.toFixed(1) }} → {{ log.engineHoursEnd.toFixed(1) }}
                  {{ t('navigation_logs.engineHoursSuffix') }}
                </span>
                <span v-else-if="log.engineHoursStart !== null">
                  {{ t('navigation_logs.engineHoursStartLabel') }}
                  {{ log.engineHoursStart.toFixed(1) }}
                </span>
                <span v-if="log.fuelConsumedLiters !== null">
                  {{ log.fuelConsumedLiters.toFixed(1) }} L
                </span>
                <span v-if="log.windForceBeaufort !== null">
                  {{ log.windForceBeaufort }} {{ t('navigation_logs.beaufortSuffix') }}
                </span>
                <span v-if="log.seaState">
                  {{ t(`navigation_logs.seaState.${log.seaState}`) }}
                </span>
                <span v-if="log.crewCount !== null">
                  {{ t('navigation_logs.crew', { count: String(log.crewCount) }) }}
                </span>
              </div>

              <!-- Notes -->
              <p v-if="log.notes" class="text-sm text-fg-muted whitespace-pre-wrap">
                {{ log.notes }}
              </p>

              <!-- Crew -->
              <NavigationLogCrewPanel
                :boat-id="boat.id"
                :log-id="log.id"
                :crew="log.crew"
                :crew-member-options="crewMemberOptions"
                :can-update="canUpdate"
              />
            </div>

            <!-- Actions -->
            <div class="flex shrink-0 items-center gap-2">
              <BaseButton
                v-if="canUpdate && log.status === 'in_progress'"
                type="button"
                variant="secondary"
                size="sm"
                @click="closingLogId = log.id"
              >
                {{ t('navigation_logs.close') }}
              </BaseButton>
              <BaseButton
                v-if="canDelete"
                type="button"
                variant="ghost"
                size="sm"
                @click="deleteLog(log.id)"
              >
                {{ t('navigation_logs.form.delete') }}
              </BaseButton>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!showCreateForm"
      class="rounded-lg border border-dashed border-border bg-surface-muted/30 p-8 text-center"
    >
      <p class="text-fg-muted">{{ t('navigation_logs.empty') }}</p>
      <BaseButton
        v-if="canCreate"
        variant="secondary"
        size="sm"
        type="button"
        class="mt-4"
        @click="showCreateForm = true"
      >
        {{ t('navigation_logs.add') }}
      </BaseButton>
    </div>
  </div>
</template>
