<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useHarbourActions } from '~/composables/use_harbour_actions'
import { useMarina } from '~/composables/use_marina'
import { useNumberFormat } from '~/composables/use_number_format'
import { usePermissions } from '~/composables/use_permissions'
import { useT } from '~/composables/use_t'
import type { MarinaStayRow } from '../../../../../shared/types/marina'

/** Escales de la capitainerie (#891), chacune avec les gestes que son statut permet. */
const props = defineProps<{
  portId: number
  stays: MarinaStayRow[]
}>()

const { t } = useT()
const { formatDate } = useDateFormat()
const { formatCurrency, formatLength } = useNumberFormat()
const { can } = usePermissions()
const { stayBadge } = useMarina()
const actions = useHarbourActions(() => props.portId)
</script>

<template>
  <p v-if="stays.length === 0" class="py-6 text-center text-sm text-fg-muted">
    {{ t('ports.harbour.stays.empty') }}
  </p>
  <ul v-else class="divide-y divide-border">
    <li
      v-for="stay in stays"
      :key="stay.id"
      class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
      :data-testid="`marina-stay-${stay.id}`"
    >
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <p class="font-medium text-fg">{{ stay.guestName }}</p>
          <BaseBadge :variant="stay.isVisitor ? 'neutral' : 'info'">
            {{ stay.isVisitor ? t('ports.harbour.stays.visitor') : t('ports.harbour.stays.fleet') }}
          </BaseBadge>
          <BaseBadge :variant="stayBadge(stay.status)">
            {{ t(`ports.harbour.stays.status.${stay.status}`) }}
          </BaseBadge>
        </div>
        <p class="text-xs text-fg-muted">
          {{ stay.spotName }}
          <template v-if="stay.guestLengthM !== null">
            · {{ formatLength(stay.guestLengthM) }}</template
          >
          ·
          {{
            t('ports.harbour.stays.dates', {
              arrival: formatDate(stay.arrivalOn),
              departure: formatDate(stay.departureOn),
            })
          }}
          · {{ t('ports.harbour.stays.nights', { count: String(stay.nights) }) }} ·
          {{ formatCurrency(stay.totalAmount) }}
        </p>
        <p v-if="stay.clientName || stay.visitorContact" class="text-xs text-fg-subtle">
          {{ [stay.clientName, stay.visitorContact].filter(Boolean).join(' · ') }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-1">
        <template v-if="can('spots.edit')">
          <BaseButton
            v-if="stay.status === 'expected'"
            size="sm"
            variant="secondary"
            @click="actions.setStayStatus(stay, 'arrived')"
          >
            {{ t('ports.harbour.stays.actions.arrive') }}
          </BaseButton>
          <BaseButton
            v-if="stay.status === 'arrived'"
            size="sm"
            variant="secondary"
            @click="actions.setStayStatus(stay, 'departed')"
          >
            {{ t('ports.harbour.stays.actions.depart') }}
          </BaseButton>
          <BaseButton
            v-if="
              can('invoices.create') && (stay.status === 'arrived' || stay.status === 'departed')
            "
            size="sm"
            variant="primary"
            @click="actions.invoiceStay(stay)"
          >
            {{ t('ports.harbour.stays.actions.invoice') }}
          </BaseButton>
          <BaseButton
            v-if="stay.status === 'expected'"
            size="sm"
            variant="ghost"
            @click="actions.setStayStatus(stay, 'cancelled')"
          >
            {{ t('ports.harbour.stays.actions.cancel') }}
          </BaseButton>
        </template>
        <Link
          v-if="stay.invoiceId !== null && can('invoices.view')"
          :href="`/invoices/${stay.invoiceId}`"
          class="px-2 text-sm text-brand hover:underline"
        >
          {{ t('ports.harbour.stays.actions.viewInvoice') }}
        </Link>
        <BaseButton
          v-if="can('spots.delete') && stay.status !== 'invoiced'"
          size="sm"
          variant="ghost"
          @click="actions.deleteStay(stay)"
        >
          <span class="text-danger">{{ t('ports.harbour.stays.actions.delete') }}</span>
        </BaseButton>
      </div>
    </li>
  </ul>
</template>
