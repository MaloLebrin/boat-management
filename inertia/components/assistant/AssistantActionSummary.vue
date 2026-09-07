<script setup lang="ts">
import { computed } from 'vue'
import AssistantActionRow from '~/components/assistant/AssistantActionRow.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { AssistantPendingAction } from '#shared/types/assistant'

/**
 * Renders a <dl> summary of an assistant action proposal. Each kind shows
 * relevant fields as label/value pairs. Used by AssistantActionCard.
 */
const props = defineProps<{ action: AssistantPendingAction }>()

const { t } = useT()
const { formatDate, formatDateTime } = useDateFormat()

const taskDueLabel = computed(() => {
  if (props.action.kind !== 'create_task') return null
  if (props.action.dueAt !== null) return formatDate(props.action.dueAt)
  if (props.action.dueEngineHours !== null) {
    return t('assistant.proposal.dueHours', { hours: String(props.action.dueEngineHours) })
  }
  return null
})

const taskRecurrenceLabel = computed(() => {
  if (props.action.kind !== 'create_task') return null
  if (props.action.recurrenceIntervalMonths !== null) {
    return t('assistant.proposal.recurrenceMonths', {
      count: String(props.action.recurrenceIntervalMonths),
    })
  }
  if (props.action.recurrenceIntervalEngineHours !== null) {
    return t('assistant.proposal.recurrenceHours', {
      hours: String(props.action.recurrenceIntervalEngineHours),
    })
  }
  return null
})
</script>

<template>
  <dl class="mt-1 space-y-0.5 text-xs text-navy-200">
    <!-- create_task -->
    <template v-if="action.kind === 'create_task'">
      <div class="flex gap-1">
        <dt>{{ t('assistant.proposal.boat') }}</dt>
        <dd class="font-medium text-navy-100">
          {{ action.boatName
          }}<template v-if="action.engineLabel"> — {{ action.engineLabel }}</template>
        </dd>
      </div>
      <AssistantActionRow :label="t('assistant.proposal.due')" :value="taskDueLabel" />
      <AssistantActionRow
        :label="t('assistant.proposal.recurrence')"
        :value="taskRecurrenceLabel"
      />
      <p v-if="action.notes" class="pt-1 text-navy-200">{{ action.notes }}</p>
    </template>

    <!-- add_engine_hours -->
    <template v-else-if="action.kind === 'add_engine_hours'">
      <AssistantActionRow :label="t('assistant.proposal.boat')" :value="action.boatName" />
      <AssistantActionRow :label="t('assistant.proposal.engine')" :value="action.engineLabel" />
      <div class="flex gap-1">
        <dt>{{ t('assistant.proposal.increment', { hours: String(action.incrementBy) }) }}</dt>
      </div>
      <AssistantActionRow
        v-if="action.currentHours !== null"
        :label="t('assistant.proposal.currentHours')"
        :value="`${action.currentHours} h`"
      />
    </template>

    <!-- start_trip -->
    <template v-else-if="action.kind === 'start_trip'">
      <AssistantActionRow :label="t('assistant.proposal.boat')" :value="action.boatName" />
      <AssistantActionRow
        :label="t('assistant.proposal.departedAt')"
        :value="formatDateTime(action.departedAt)"
      />
      <AssistantActionRow
        :label="t('assistant.proposal.departurePort')"
        :value="action.departurePortName"
      />
      <AssistantActionRow
        v-if="action.crewCount !== null"
        :label="t('assistant.proposal.crew')"
        :value="t('assistant.proposal.crewCount', { count: String(action.crewCount) })"
      />
      <p v-if="action.notes" class="pt-1 text-navy-200">{{ action.notes }}</p>
    </template>

    <!-- close_trip -->
    <template v-else-if="action.kind === 'close_trip'">
      <AssistantActionRow :label="t('assistant.proposal.boat')" :value="action.boatName" />
      <AssistantActionRow
        :label="t('assistant.proposal.arrivedAt')"
        :value="formatDateTime(action.arrivedAt)"
      />
      <AssistantActionRow
        :label="t('assistant.proposal.arrivalPort')"
        :value="action.arrivalPortName"
      />
      <AssistantActionRow
        v-if="action.distanceNm !== null"
        :label="t('assistant.proposal.distance')"
        :value="t('assistant.proposal.distanceNm', { distance: String(action.distanceNm) })"
      />
      <AssistantActionRow
        v-if="action.engineHoursEnd !== null && action.engineLabel"
        :label="t('assistant.proposal.engineHoursEnd')"
        :value="`${action.engineHoursEnd} h (${action.engineLabel})`"
      />
      <AssistantActionRow
        v-if="action.fuelConsumedLiters !== null"
        :label="t('assistant.proposal.fuelConsumed')"
        :value="
          t('assistant.proposal.fuelConsumedLiters', { liters: String(action.fuelConsumedLiters) })
        "
      />
      <p v-if="action.notes" class="pt-1 text-navy-200">{{ action.notes }}</p>
    </template>

    <!-- log_fuel -->
    <template v-else-if="action.kind === 'log_fuel'">
      <AssistantActionRow :label="t('assistant.proposal.boat')" :value="action.boatName" />
      <AssistantActionRow
        :label="t('assistant.proposal.date')"
        :value="formatDateTime(action.fueledAt)"
      />
      <AssistantActionRow
        :label="t('assistant.proposal.quantity')"
        :value="t('assistant.proposal.quantityLiters', { liters: String(action.quantityLiters) })"
      />
      <AssistantActionRow
        v-if="action.pricePerLiter !== null"
        :label="t('assistant.proposal.pricePerLiter')"
        :value="`${action.pricePerLiter} EUR/L`"
      />
      <AssistantActionRow
        v-if="action.totalCost !== null"
        :label="t('assistant.proposal.totalCost')"
        :value="`${action.totalCost} EUR`"
      />
      <AssistantActionRow :label="t('assistant.proposal.engine')" :value="action.engineLabel" />
      <AssistantActionRow :label="t('assistant.proposal.supplier')" :value="action.supplier" />
      <p v-if="action.notes" class="pt-1 text-navy-200">{{ action.notes }}</p>
    </template>

    <!-- report_incident -->
    <template v-else-if="action.kind === 'report_incident'">
      <AssistantActionRow :label="t('assistant.proposal.boat')" :value="action.boatName" />
      <AssistantActionRow
        :label="t('assistant.proposal.date')"
        :value="formatDateTime(action.occurredAt)"
      />
      <AssistantActionRow
        :label="t('assistant.proposal.type')"
        :value="t(`assistant.proposal.incidentTypes.${action.incidentType}`)"
      />
      <AssistantActionRow :label="t('assistant.proposal.location')" :value="action.location" />
      <AssistantActionRow
        :label="t('assistant.proposal.description')"
        :value="action.description"
      />
    </template>

    <!-- create_reservation -->
    <template v-else-if="action.kind === 'create_reservation'">
      <AssistantActionRow :label="t('assistant.proposal.boat')" :value="action.boatName" />
      <AssistantActionRow
        :label="t('assistant.proposal.from')"
        :value="formatDateTime(action.startsAt)"
      />
      <AssistantActionRow
        :label="t('assistant.proposal.to')"
        :value="formatDateTime(action.endsAt)"
      />
      <div class="flex gap-1">
        <dt>{{ t('assistant.proposal.client') }}</dt>
        <dd class="font-medium text-navy-100">
          {{ action.clientName
          }}<template v-if="action.clientEmail"> ({{ action.clientEmail }})</template>
          <template v-else-if="action.clientPhone"> ({{ action.clientPhone }})</template>
        </dd>
      </div>
      <AssistantActionRow
        v-if="action.reservationType"
        :label="t('assistant.proposal.type')"
        :value="t(`assistant.proposal.reservationTypes.${action.reservationType}`)"
      />
      <p v-if="action.notes" class="pt-1 text-navy-200">{{ action.notes }}</p>
    </template>

    <!-- create_client -->
    <template v-else-if="action.kind === 'create_client'">
      <AssistantActionRow
        :label="t('assistant.proposal.name')"
        :value="`${action.firstName} ${action.lastName}`"
      />
      <AssistantActionRow :label="t('assistant.proposal.email')" :value="action.email" />
      <AssistantActionRow :label="t('assistant.proposal.phone')" :value="action.phone" />
      <p v-if="action.notes" class="pt-1 text-navy-200">{{ action.notes }}</p>
    </template>

    <!-- set_part_stock -->
    <template v-else-if="action.kind === 'set_part_stock'">
      <AssistantActionRow :label="t('assistant.proposal.boat')" :value="action.boatName" />
      <AssistantActionRow :label="t('assistant.proposal.engine')" :value="action.engineLabel" />
      <div class="flex gap-1">
        <dt>{{ t('assistant.proposal.part') }}</dt>
        <dd class="font-medium text-navy-100">
          {{ action.designation
          }}<template v-if="action.reference"> ({{ action.reference }})</template>
        </dd>
      </div>
      <AssistantActionRow
        :label="t('assistant.proposal.stock')"
        :value="
          t('assistant.proposal.stockChange', {
            old: String(action.oldStock ?? 0),
            new: String(action.newStock),
          })
        "
      />
    </template>
  </dl>
</template>
