<script setup lang="ts">
import { computed } from 'vue'
import { Link } from '@adonisjs/inertia/vue'
import BaseCard from '~/components/base/BaseCard.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { InvoiceDetail } from '#shared/types/invoice'

/** Bloc « Détails » de la fiche d'une pièce : dates, paiement, client, réservation. */
const props = defineProps<{ invoice: InvoiceDetail }>()

const { t } = useT()
const { formatDate } = useDateFormat()

// Sur un avoir (#877), le paiement est le remboursement du client.
const isCreditNote = computed(() => props.invoice.kind === 'credit_note')
</script>

<template>
  <BaseCard>
    <p class="mb-4 text-sm font-semibold text-fg">{{ t('invoices.show.details') }}</p>
    <dl class="grid grid-cols-2 gap-4 text-sm">
      <div>
        <dt class="text-fg-muted">{{ t('invoices.show.issuedOn') }}</dt>
        <dd class="font-medium text-fg">{{ formatDate(invoice.issuedAt) }}</dd>
      </div>
      <div v-if="!isCreditNote">
        <dt class="text-fg-muted">{{ t('invoices.show.dueOn') }}</dt>
        <dd class="font-medium text-fg">{{ formatDate(invoice.dueAt) }}</dd>
      </div>
      <div v-if="invoice.paidAt">
        <dt class="text-fg-muted">
          {{ isCreditNote ? t('invoices.show.refundedOn') : t('invoices.show.paidOn') }}
        </dt>
        <dd class="font-medium text-fg">{{ formatDate(invoice.paidAt) }}</dd>
      </div>
      <div v-if="invoice.paidAt">
        <dt class="text-fg-muted">
          {{ isCreditNote ? t('invoices.show.refundMethod') : t('invoices.show.paymentMethod') }}
        </dt>
        <dd class="font-medium text-fg">
          {{
            invoice.paymentMethod
              ? t(`invoices.paymentMethods.${invoice.paymentMethod}`)
              : t('invoices.paymentMethods.none')
          }}
        </dd>
      </div>
      <div>
        <dt class="text-fg-muted">{{ t('invoices.show.client') }}</dt>
        <dd class="font-medium text-fg">{{ invoice.clientName ?? t('invoices.noClient') }}</dd>
      </div>
      <div>
        <dt class="text-fg-muted">{{ t('invoices.show.reservation') }}</dt>
        <dd class="font-medium text-fg">
          <Link
            v-if="invoice.reservationId && invoice.reservationBoatId"
            :href="`/boats/${invoice.reservationBoatId}/reservations`"
            class="text-primary underline"
          >
            {{ t('invoices.show.viewReservation') }}
          </Link>
          <span v-else>{{ invoice.reservationId ?? t('invoices.noReservation') }}</span>
        </dd>
      </div>
    </dl>
  </BaseCard>
</template>
