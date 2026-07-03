<script setup lang="ts">
import { computed, ref } from 'vue'
import { Form } from '@adonisjs/inertia/vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import NavigationLogUpdateForm from '~/components/boats/show/tabs/NavigationLogUpdateForm.vue'
import NavigationLogCloseForm from '~/components/boats/show/tabs/NavigationLogCloseForm.vue'
import { toNavigationEngineOptions } from '~/utils/navigation_engine_options'
import { useT } from '~/composables/use_t'
import type { BoatShowDetail, NavigationLogPortOption, NavigationLogRow } from '~/types/boat_show'

const props = defineProps<{
  boat: BoatShowDetail
  log: NavigationLogRow
  portOptions: NavigationLogPortOption[]
  canUpdate: boolean
  canCreateFuelLogs: boolean
}>()

const { t } = useT()

const engineOptions = computed(() => toNavigationEngineOptions(props.boat.engines))

const showUpdateForm = ref(false)
const showFuelForm = ref(false)
const showCloseForm = ref(false)

const today = new Date().toLocaleDateString('en-CA')
const fuelFueledAt = ref(today)

const elapsed = computed(() => {
  const departed = new Date(props.log.departedAt)
  const now = new Date()
  const diffMs = now.getTime() - departed.getTime()
  if (diffMs < 0) return ''
  const totalMinutes = Math.floor(diffMs / 60000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `${days}j ${hours}h${String(minutes).padStart(2, '0')}`
  return `${hours}h${String(minutes).padStart(2, '0')}`
})

function portLabel(portId: number | null, portName: string | null): string {
  if (portId) {
    const found = props.portOptions.find((p) => p.id === portId)
    if (found) return found.name
  }
  return portName ?? '—'
}

function toggleUpdate() {
  showUpdateForm.value = !showUpdateForm.value
  showFuelForm.value = false
  showCloseForm.value = false
}

function toggleFuel() {
  showFuelForm.value = !showFuelForm.value
  showUpdateForm.value = false
  showCloseForm.value = false
}

function toggleClose() {
  showCloseForm.value = !showCloseForm.value
  showUpdateForm.value = false
  showFuelForm.value = false
}
</script>

<template>
  <div class="rounded-lg border border-brand/40 bg-brand/5 p-5 space-y-4">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <BaseBadge variant="warning">{{ t('navigation_logs.active.title') }}</BaseBadge>
        <span v-if="elapsed" class="text-sm text-fg-muted">
          {{ t('navigation_logs.active.elapsed', { duration: elapsed }) }}
        </span>
      </div>

      <div v-if="canUpdate || canCreateFuelLogs" class="flex flex-wrap items-center gap-2">
        <BaseButton
          v-if="canUpdate"
          type="button"
          variant="secondary"
          size="sm"
          @click="toggleUpdate"
        >
          {{ t('navigation_logs.active.updateBtn') }}
        </BaseButton>
        <BaseButton
          v-if="canCreateFuelLogs"
          type="button"
          variant="secondary"
          size="sm"
          @click="toggleFuel"
        >
          {{ t('navigation_logs.active.fuelBtn') }}
        </BaseButton>
        <BaseButton v-if="canUpdate" type="button" variant="primary" size="sm" @click="toggleClose">
          {{ t('navigation_logs.active.closeBtn') }}
        </BaseButton>
      </div>
    </div>

    <!-- Summary -->
    <div v-if="!showCloseForm" class="space-y-1 text-sm text-fg-muted">
      <div class="font-medium text-fg">
        {{ portLabel(log.departurePortId, log.departurePortName) }}
        <span class="font-normal text-fg-muted ml-2">
          ·
          {{
            new Date(log.departedAt).toLocaleString(undefined, {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })
          }}
        </span>
      </div>
      <div class="flex flex-wrap items-center gap-3 text-xs">
        <span v-if="log.windForceBeaufort !== null">
          {{ log.windForceBeaufort }} {{ t('navigation_logs.beaufortSuffix') }}
        </span>
        <span v-if="log.seaState"> · {{ t(`navigation_logs.seaState.${log.seaState}`) }} </span>
        <span v-if="log.crewCount !== null">
          · {{ t('navigation_logs.crew', { count: String(log.crewCount) }) }}
        </span>
        <span v-if="log.engineHoursStart !== null">
          · {{ t('navigation_logs.engineHoursStartLabel') }}
          {{ log.engineHoursStart.toFixed(1) }}
        </span>
      </div>
      <p v-if="log.notes" class="whitespace-pre-wrap text-xs text-fg-muted mt-1">{{ log.notes }}</p>
    </div>

    <!-- Update form -->
    <NavigationLogUpdateForm
      v-if="showUpdateForm"
      :boat-id="boat.id"
      :log="log"
      @close="showUpdateForm = false"
    />

    <!-- Close form -->
    <NavigationLogCloseForm
      v-if="showCloseForm"
      :boat-id="boat.id"
      :log="log"
      :port-options="portOptions"
      :engine-options="engineOptions"
      @close="showCloseForm = false"
    />

    <!-- Quick fuel form -->
    <div
      v-if="showFuelForm"
      class="rounded-lg border border-border bg-surface-elevated p-5 space-y-4"
    >
      <h3 class="font-semibold text-fg text-sm">{{ t('navigation_logs.active.fuelTitle') }}</h3>
      <Form
        :action="{ url: `/boats/${boat.id}/fuel-logs`, method: 'post' }"
        #default="{ processing, errors }"
      >
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <BaseInput
            v-model="fuelFueledAt"
            type="date"
            id="fueledAt"
            name="fueledAt"
            :label="t('fuel_logs.fields.fueledAt')"
            :error="errors.fueledAt"
            required
          />

          <BaseInput
            type="number"
            id="quantityLiters"
            name="quantityLiters"
            step="0.001"
            min="0.001"
            :label="t('fuel_logs.fields.quantityLiters')"
            :error="errors.quantityLiters"
            required
          />

          <BaseInput
            type="number"
            id="pricePerLiter"
            name="pricePerLiter"
            step="0.0001"
            min="0"
            :label="t('fuel_logs.fields.pricePerLiter')"
          />

          <BaseInput
            type="text"
            id="supplier"
            name="supplier"
            :label="t('fuel_logs.fields.supplier')"
          />
        </div>

        <div class="mt-4 flex items-center justify-end gap-3">
          <BaseButton type="button" variant="ghost" size="sm" @click="showFuelForm = false">
            {{ t('navigation_logs.form.cancel') }}
          </BaseButton>
          <BaseButton type="submit" variant="primary" size="sm" :disabled="processing">
            {{ t('fuel_logs.form.submit') }}
          </BaseButton>
        </div>
      </Form>
    </div>
  </div>
</template>
