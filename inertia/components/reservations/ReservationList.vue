<script setup lang="ts">
import { computed, ref } from 'vue'
import { router } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import ReservationEditModal from '~/components/reservations/ReservationEditModal.vue'
import ReservationRowActions from '~/components/reservations/ReservationRowActions.vue'
import ReservationPaymentBadge from '~/components/reservations/payment/ReservationPaymentBadge.vue'
import ReservationPaymentModal from '~/components/reservations/payment/ReservationPaymentModal.vue'
import ReservationStatusBadge from '~/components/reservations/ReservationStatusBadge.vue'
import ReservationTypeBadge from '~/components/reservations/ReservationTypeBadge.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { BoatPricingRow } from '#shared/types/boat_pricing'
import type { PricingSeasonRow } from '#shared/types/pricing_season'
import type { ClientOption } from '#shared/types/client'
import type { BoatReservationRow } from '~/types/reservation'

const props = defineProps<{
  boatId: number
  reservations: BoatReservationRow[]
  canManage: boolean
  boatPricing: BoatPricingRow | null
  pricingSeasons: PricingSeasonRow[]
  clientOptions?: ClientOption[]
  canCreateQuote?: boolean
}>()

const { t } = useT()
const { formatDate } = useDateFormat()

const editingReservation = ref<BoatReservationRow | null>(null)
const editModalOpen = ref(false)

function openEdit(row: BoatReservationRow) {
  editingReservation.value = row
  editModalOpen.value = true
}

/**
 * La colonne Documents ne s'affiche que si elle a quelque chose à montrer :
 * un devis déjà émis, ou le droit d'en créer un. Sans facturation, elle
 * resterait une colonne vide sur toute la largeur du tableau.
 */
const showDocuments = computed(
  () =>
    props.canCreateQuote === true ||
    props.reservations.some((r) => (r.linkedInvoices?.length ?? 0) > 0)
)

function createQuote(reservationId: number) {
  router.post(`/invoices/from-reservation/${reservationId}`, {}, { preserveScroll: true })
}

/**
 * Réservation dont la modale Paiement est ouverte (#875) : relue dans les
 * props, pour suivre chaque encaissement sans refermer la modale.
 */
const paymentReservationId = ref<number | null>(null)
const paymentReservation = computed(
  () => props.reservations.find((r) => r.id === paymentReservationId.value) ?? null
)
</script>

<template>
  <BaseCard>
    <BaseEmptyState
      v-if="reservations.length === 0"
      :title="t('reservations.empty.title')"
      :description="t('reservations.empty.description')"
    />
    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr
            class="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-fg-muted"
          >
            <th class="px-4 pb-3 first:pl-0">{{ t('reservations.columns.period') }}</th>
            <th class="px-4 pb-3">{{ t('reservations.columns.client') }}</th>
            <th class="px-4 pb-3">{{ t('reservations.columns.status') }}</th>
            <th class="px-4 pb-3">{{ t('reservations.columns.type') }}</th>
            <th class="px-4 pb-3 text-right">{{ t('reservations.columns.price') }}</th>
            <th class="px-4 pb-3">{{ t('reservations.columns.payment') }}</th>
            <th v-if="showDocuments" class="px-4 pb-3 text-right">
              {{ t('reservations.columns.documents') }}
            </th>
            <th v-if="canManage" class="px-4 pb-3 last:pr-0" />
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr
            v-for="row in reservations"
            :key="row.id"
            class="group transition-colors hover:bg-surface-muted/50"
          >
            <td class="px-4 py-3 first:pl-0">
              <span class="inline-flex items-center gap-1.5 text-fg-muted">
                <svg
                  class="h-3.5 w-3.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {{ formatDate(row.startsAt) }}
                <span class="text-fg-subtle">→</span>
                {{ formatDate(row.endsAt) }}
              </span>
            </td>
            <td class="px-4 py-3">
              <span class="font-semibold text-fg">{{ row.clientName }}</span>
              <span v-if="row.clientEmail" class="block text-xs text-fg-muted">{{
                row.clientEmail
              }}</span>
            </td>
            <td class="px-4 py-3">
              <ReservationStatusBadge :status="row.status" />
            </td>
            <td class="px-4 py-3">
              <ReservationTypeBadge :type="row.type" />
            </td>
            <td class="px-4 py-3 text-right font-medium text-fg">
              {{ row.totalPrice ? `${row.totalPrice} €` : '—' }}
            </td>
            <td class="px-4 py-3">
              <ReservationPaymentBadge :reservation="row" />
            </td>
            <td v-if="showDocuments" class="px-4 py-3 text-right">
              <div class="flex flex-wrap items-center justify-end gap-2">
                <Link
                  v-for="doc in row.linkedInvoices"
                  :key="doc.id"
                  :href="`/invoices/${doc.id}`"
                  class="text-sm font-medium text-brand underline"
                >
                  {{ doc.number }}
                </Link>
                <BaseButton
                  v-if="canCreateQuote"
                  variant="secondary"
                  size="sm"
                  :aria-label="t('reservations.actions.createQuoteFor', { client: row.clientName })"
                  @click="createQuote(row.id)"
                >
                  {{ t('reservations.actions.createQuote') }}
                </BaseButton>
              </div>
            </td>
            <td v-if="canManage" class="px-4 py-3 last:pr-0">
              <ReservationRowActions
                :boat-id="boatId"
                :row="row"
                @edit="openEdit(row)"
                @payment="paymentReservationId = row.id"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </BaseCard>

  <ReservationEditModal
    v-model:open="editModalOpen"
    :boat-id="boatId"
    :reservation="editingReservation"
    :boat-pricing="boatPricing"
    :pricing-seasons="pricingSeasons"
    :client-options="clientOptions"
  />

  <ReservationPaymentModal
    :open="paymentReservation !== null"
    :boat-id="boatId"
    :reservation="paymentReservation"
    :can-manage="canManage"
    :reload-props="['reservations', 'errors', 'flash']"
    @update:open="(open) => !open && (paymentReservationId = null)"
  />
</template>
