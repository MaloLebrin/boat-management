<script setup lang="ts">
import { computed } from 'vue'
import BaseAlert from '~/components/base/BaseAlert.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import type { PublicBookingDraft } from '#shared/helpers/public_booking'
import { DEFAULT_DEPOSIT_PERCENT, defaultDepositAmount } from '#shared/helpers/reservation_payment'
import type { PublicBookingQuote } from '#shared/types/public_booking'

/**
 * Récapitulatif de la sélection (#881) : dates, puis devis calculé par le
 * serveur — l'estimation vient du même calcul que celui de l'équipe, saisons
 * comprises. Le prix définitif est celui que confirme le loueur.
 */
const props = defineProps<{
  draft: PublicBookingDraft | null
  quote: PublicBookingQuote | null
  loading: boolean
}>()

const { t } = useT()
const { formatDateLong } = useDateFormat()
const { formatCurrency } = useNumberFormat()

/** Le devis reçu correspond-il encore à la sélection affichée ? */
const current = computed(() =>
  props.quote &&
  props.draft?.endsOn &&
  props.quote.selection.startsOn === props.draft.startsOn &&
  props.quote.selection.endsOn === props.draft.endsOn
    ? props.quote
    : null
)

/** Acompte demandé à la confirmation (#875) : la part du prix à verser pour bloquer les dates. */
const advance = computed(() => {
  const amount = defaultDepositAmount(current.value?.quote?.total ?? null)
  return amount === null ? null : Number(amount)
})

function money(value: number): string {
  return formatCurrency(value, { currency: current.value?.quote?.currency || 'EUR' })
}

function lineLabel(line: { seasonName: string | null; isWeekly: boolean }): string {
  if (line.seasonName) return line.seasonName
  return line.isWeekly ? t('public.booking.quote.weekly') : t('public.booking.quote.base')
}
</script>

<template>
  <div class="space-y-4" data-testid="public-booking-quote">
    <dl v-if="draft" class="grid grid-cols-2 gap-3 text-sm">
      <div>
        <dt class="text-fg-muted">{{ t('public.booking.quote.arrival') }}</dt>
        <dd class="font-medium text-fg">{{ formatDateLong(draft.startsOn) }}</dd>
      </div>
      <div>
        <dt class="text-fg-muted">{{ t('public.booking.quote.departure') }}</dt>
        <dd class="font-medium text-fg">
          {{
            draft.endsOn ? formatDateLong(draft.endsOn) : t('public.booking.quote.pickDeparture')
          }}
        </dd>
      </div>
    </dl>
    <p v-else class="text-sm text-fg-muted">{{ t('public.booking.quote.pickArrival') }}</p>

    <p v-if="loading" class="text-sm text-fg-muted">{{ t('public.booking.quote.loading') }}</p>

    <BaseAlert v-else-if="current?.state === 'unavailable'" variant="warning">
      {{ t('public.booking.quote.unavailable') }}
    </BaseAlert>
    <BaseAlert v-else-if="current?.state === 'invalid'" variant="warning">
      {{ t('public.booking.quote.invalid') }}
    </BaseAlert>

    <template v-else-if="current?.quote">
      <p v-if="!current.quote.hasPricing" class="text-sm text-fg-muted">
        {{ t('public.booking.quote.onRequest') }}
      </p>
      <template v-else>
        <BaseAlert v-if="current.quote.boundsError === 'below_min'" variant="warning">
          {{ t('public.booking.quote.belowMin', { count: String(current.quote.minDays ?? 0) }) }}
        </BaseAlert>
        <BaseAlert v-else-if="current.quote.boundsError === 'above_max'" variant="warning">
          {{ t('public.booking.quote.aboveMax', { count: String(current.quote.maxDays ?? 0) }) }}
        </BaseAlert>

        <div class="divide-y divide-border text-sm">
          <div
            v-for="(line, idx) in current.quote.lines"
            :key="idx"
            class="flex items-center justify-between py-2"
          >
            <span class="text-fg">
              {{ lineLabel(line) }}
              <span class="text-fg-muted">
                · {{ line.quantity }} × {{ money(line.unitPrice) }}
              </span>
            </span>
            <span class="font-medium text-fg">{{ money(line.amount) }}</span>
          </div>
        </div>
        <div class="flex items-center justify-between border-t border-border pt-3">
          <span class="font-semibold text-fg">
            {{ t('public.booking.quote.total', { count: String(current.quote.nights) }) }}
          </span>
          <span class="text-lg font-semibold text-fg" data-testid="public-booking-total">
            {{ money(current.quote.total) }}
          </span>
        </div>
        <p v-if="advance !== null" class="text-sm text-fg-muted">
          {{
            t('public.booking.quote.advance', {
              amount: money(advance),
              percent: String(DEFAULT_DEPOSIT_PERCENT),
            })
          }}
        </p>
        <p v-if="current.quote.deposit" class="text-sm text-fg-muted">
          {{ t('public.booking.quote.securityDeposit', { amount: money(current.quote.deposit) }) }}
        </p>
        <p class="text-xs text-fg-subtle">{{ t('public.booking.quote.disclaimer') }}</p>
      </template>
    </template>
  </div>
</template>
