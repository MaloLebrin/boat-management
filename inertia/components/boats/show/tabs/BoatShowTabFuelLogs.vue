<script setup lang="ts">
import { computed, ref } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BoatFuelLogForm from '~/components/boats/show/tabs/BoatFuelLogForm.vue'
import { useT } from '~/composables/use_t'
import type { BoatShowDetail, FuelLogRow } from '~/types/boat_show'

const props = defineProps<{
  boat: BoatShowDetail
  fuelLogs: FuelLogRow[]
  canManage: boolean
  canDelete: boolean
}>()

const { t } = useT()

const showForm = ref(false)

const totalLiters = computed(() => props.fuelLogs.reduce((sum, log) => sum + log.quantityLiters, 0))

function engineLabel(engineId: number | null): string {
  if (!engineId) return ''
  const engine = props.boat.engines.find((e) => e.id === engineId)
  if (!engine) return ''
  const parts = [engine.kind, engine.brand, engine.model].filter(Boolean)
  return parts.join(' — ')
}

function deleteFuelLog(logId: number) {
  if (!window.confirm(t('fuel_logs.form.confirmDelete'))) return
  router.delete(`/boats/${props.boat.id}/fuel-logs/${logId}`, { preserveScroll: true })
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <p class="text-sm text-fg-muted">
        {{ t('fuel_logs.count', { count: String(fuelLogs.length) }) }}
        <span v-if="fuelLogs.length > 0" class="ml-2">
          · {{ t('fuel_logs.totalLiters', { liters: totalLiters.toFixed(1) }) }}
        </span>
      </p>
      <BaseButton
        v-if="canManage"
        variant="primary"
        size="sm"
        type="button"
        @click="showForm = true"
      >
        {{ t('fuel_logs.add') }}
      </BaseButton>
    </div>

    <!-- Create form -->
    <BoatFuelLogForm v-if="showForm" :boat="boat" @close="showForm = false" />

    <!-- Logs list -->
    <div v-if="fuelLogs.length > 0" class="space-y-3">
      <div
        v-for="log in fuelLogs"
        :key="log.id"
        class="rounded-lg border border-border bg-surface-elevated p-4"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <!-- Date + quantity -->
            <div class="flex flex-wrap items-center gap-3">
              <span class="font-semibold text-fg">{{ log.fueledAt }}</span>
              <span class="text-sm font-medium text-brand"
                >{{ log.quantityLiters.toFixed(1) }} L</span
              >
              <span v-if="log.totalCost !== null" class="text-sm text-fg-muted">
                {{ log.totalCost.toFixed(2) }} €
              </span>
              <span v-else-if="log.pricePerLiter !== null" class="text-sm text-fg-muted">
                {{ log.pricePerLiter.toFixed(4) }} €/L
              </span>
            </div>

            <!-- Engine + hours -->
            <div class="mt-1 flex flex-wrap items-center gap-3 text-xs text-fg-muted">
              <span v-if="log.boatEngineId">{{ engineLabel(log.boatEngineId) }}</span>
              <span v-if="log.engineHoursAtFueling !== null">
                {{ log.engineHoursAtFueling.toFixed(1) }} {{ t('fuel_logs.engineHoursSuffix') }}
              </span>
              <span v-if="log.supplier">{{ log.supplier }}</span>
            </div>

            <!-- Notes -->
            <p v-if="log.notes" class="mt-1 text-sm text-fg-muted whitespace-pre-wrap">
              {{ log.notes }}
            </p>
          </div>

          <!-- Delete action -->
          <div v-if="canDelete" class="shrink-0">
            <BaseButton type="button" variant="ghost" size="sm" @click="deleteFuelLog(log.id)">
              {{ t('fuel_logs.form.delete') }}
            </BaseButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!showForm"
      class="rounded-lg border border-dashed border-border bg-surface-muted/30 p-8 text-center"
    >
      <p class="text-fg-muted">{{ t('fuel_logs.empty') }}</p>
      <BaseButton
        v-if="canManage"
        variant="secondary"
        size="sm"
        type="button"
        class="mt-4"
        @click="showForm = true"
      >
        {{ t('fuel_logs.add') }}
      </BaseButton>
    </div>
  </div>
</template>
