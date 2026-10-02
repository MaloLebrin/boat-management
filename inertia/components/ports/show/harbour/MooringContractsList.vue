<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useHarbourActions } from '~/composables/use_harbour_actions'
import { useNumberFormat } from '~/composables/use_number_format'
import { usePermissions } from '~/composables/use_permissions'
import { useT } from '~/composables/use_t'
import type { MooringContractRow } from '../../../../../shared/types/marina'

/** Contrats d'amarrage du port (#891) : titulaire, période, échéance, renouvellement. */
const props = defineProps<{
  portId: number
  contracts: MooringContractRow[]
}>()

const { t } = useT()
const { formatDate } = useDateFormat()
const { formatCurrency } = useNumberFormat()
const { can } = usePermissions()
const actions = useHarbourActions(() => props.portId)

function period(contract: MooringContractRow): string {
  const from = formatDate(contract.startsOn)
  return contract.endsOn
    ? t('ports.harbour.contracts.period', { from, to: formatDate(contract.endsOn) })
    : t('ports.harbour.contracts.since', { from })
}
</script>

<template>
  <p v-if="contracts.length === 0" class="py-6 text-center text-sm text-fg-muted">
    {{ t('ports.harbour.contracts.empty') }}
  </p>
  <ul v-else class="divide-y divide-border">
    <li
      v-for="contract in contracts"
      :key="contract.id"
      class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
      :data-testid="`mooring-contract-${contract.id}`"
    >
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <p class="font-medium text-fg">{{ contract.clientName ?? '—' }}</p>
          <BaseBadge :variant="contract.status === 'active' ? 'success' : 'empty'">
            {{ t(`ports.harbour.contracts.status.${contract.status}`) }}
          </BaseBadge>
          <BaseBadge v-if="contract.renewalDue" variant="warning">
            {{ t('ports.harbour.contracts.renewalDue') }}
          </BaseBadge>
        </div>
        <p class="text-xs text-fg-muted">
          {{ contract.spotName }}
          <template v-if="contract.boatName"> · {{ contract.boatName }}</template>
          · {{ period(contract) }} ·
          {{ formatCurrency(contract.amount) }}
          ({{ t(`ports.harbour.contracts.periodicity.${contract.periodicity}`) }})
        </p>
        <p v-if="contract.nextInvoiceOn" class="text-xs text-fg-subtle">
          {{
            t('ports.harbour.contracts.nextInvoice', { date: formatDate(contract.nextInvoiceOn) })
          }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-1">
        <Link
          v-if="contract.lastInvoiceId !== null && can('invoices.view')"
          :href="`/invoices/${contract.lastInvoiceId}`"
          class="px-2 text-sm text-brand hover:underline"
        >
          {{ t('ports.harbour.contracts.actions.viewInvoice') }}
        </Link>
        <BaseButton
          v-if="can('spots.edit') && contract.status === 'active'"
          size="sm"
          variant="secondary"
          @click="actions.terminateContract(contract)"
        >
          {{ t('ports.harbour.contracts.actions.terminate') }}
        </BaseButton>
        <BaseButton
          v-if="can('spots.delete') && contract.lastInvoiceId === null"
          size="sm"
          variant="ghost"
          @click="actions.deleteContract(contract)"
        >
          <span class="text-danger">{{ t('ports.harbour.contracts.actions.delete') }}</span>
        </BaseButton>
      </div>
    </li>
  </ul>
</template>
