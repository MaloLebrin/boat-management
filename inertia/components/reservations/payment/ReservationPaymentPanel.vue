<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { computed, ref, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseField from '~/components/base/BaseField.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import ReservationPaymentBadge from '~/components/reservations/payment/ReservationPaymentBadge.vue'
import SecurityDepositPanel from '~/components/reservations/payment/SecurityDepositPanel.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import { balanceDue, toCents } from '#shared/helpers/reservation_payment'
import {
  RESERVATION_PAYMENT_METHODS,
  type ReservationPaymentKind,
  type ReservationPaymentMethod,
} from '#shared/types/reservation'
import type { BoatReservationRow } from '~/types/reservation'
import { confirmed } from '~/utils/native_dialog'

/**
 * Argent d'une location (#875) : ce qui est attendu, ce qui est reçu, et les
 * gestes « Acompte reçu », « Solde reçu », « Rembourser » ; la caution suit.
 */
const props = defineProps<{
  boatId: number
  reservation: BoatReservationRow
  canManage: boolean
  reloadProps: string[]
}>()

const { t } = useT()
const { formatDate } = useDateFormat()
const { formatCurrency } = useNumberFormat()

const method = ref<ReservationPaymentMethod>('transfer')
const depositAmount = ref('')
const processing = ref(false)

watch(
  () => props.reservation,
  (r) => {
    depositAmount.value = r.depositAmount ?? ''
    if (r.paymentMethod) method.value = r.paymentMethod
  },
  { immediate: true }
)

const methodOptions = RESERVATION_PAYMENT_METHODS.map((value) => ({
  value,
  label: t(`reservations.payment.methods.${value}`),
}))

const remaining = computed(() =>
  balanceDue(props.reservation.totalPrice, props.reservation.paidAmount)
)
const active = computed(() => props.reservation.status !== 'cancelled')
const canDeposit = computed(() => active.value && props.reservation.paymentStatus === 'unpaid')
const canBalance = computed(
  () =>
    active.value &&
    (props.reservation.paymentStatus === 'unpaid' ||
      props.reservation.paymentStatus === 'deposit_paid') &&
    (toCents(props.reservation.totalPrice) ?? 0) > 0
)
const canRefund = computed(
  () =>
    (toCents(props.reservation.paidAmount) ?? 0) > 0 &&
    props.reservation.paymentStatus !== 'refunded'
)

function money(value: string | null): string {
  return value === null ? '—' : formatCurrency(Number(value))
}

function send(kind: ReservationPaymentKind) {
  if (
    kind === 'refund' &&
    !confirmed(
      t('reservations.payment.actions.confirmRefund', {
        amount: money(props.reservation.paidAmount),
      })
    )
  ) {
    return
  }
  const data: Record<string, string | number | null> = { kind, method: method.value }
  if (kind === 'deposit')
    data.amount = depositAmount.value === '' ? null : Number(depositAmount.value)
  router.patch(`/boats/${props.boatId}/reservations/${props.reservation.id}/payment`, data, {
    preserveScroll: true,
    only: props.reloadProps,
    onStart: () => (processing.value = true),
    onFinish: () => (processing.value = false),
  })
}
</script>

<template>
  <div class="space-y-5" data-testid="reservation-payment-panel">
    <div class="flex items-center justify-between gap-2">
      <h3 class="text-sm font-semibold text-fg">{{ t('reservations.payment.title') }}</h3>
      <ReservationPaymentBadge :reservation="reservation" />
    </div>

    <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
      <div>
        <dt class="text-xs text-fg-muted">{{ t('reservations.payment.summary.total') }}</dt>
        <dd class="font-medium text-fg">{{ money(reservation.totalPrice) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-fg-muted">{{ t('reservations.payment.summary.deposit') }}</dt>
        <dd class="font-medium text-fg">{{ money(reservation.depositAmount) }}</dd>
        <dd v-if="reservation.depositPaidAt" class="text-xs text-fg-subtle">
          {{
            t('reservations.payment.summary.paidOn', {
              date: formatDate(reservation.depositPaidAt),
            })
          }}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-fg-muted">{{ t('reservations.payment.summary.paid') }}</dt>
        <dd class="font-medium text-fg">{{ money(reservation.paidAmount) }}</dd>
        <dd v-if="reservation.paymentMethod" class="text-xs text-fg-subtle">
          {{ t(`reservations.payment.methods.${reservation.paymentMethod}`) }}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-fg-muted">{{ t('reservations.payment.summary.remaining') }}</dt>
        <dd class="font-medium text-fg">{{ money(remaining) }}</dd>
        <dd v-if="reservation.balancePaidAt" class="text-xs text-fg-subtle">
          {{
            t('reservations.payment.summary.paidOn', {
              date: formatDate(reservation.balancePaidAt),
            })
          }}
        </dd>
      </div>
    </dl>

    <p v-if="reservation.totalPrice === null" class="text-sm text-fg-muted">
      {{ t('reservations.payment.noPrice') }}
    </p>

    <div v-if="canManage && (canDeposit || canBalance || canRefund)" class="space-y-3">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BaseField :label="t('reservations.payment.fields.method')">
          <BaseSelect v-model="method" :options="methodOptions" />
        </BaseField>
        <BaseField v-if="canDeposit" :label="t('reservations.payment.fields.depositAmount')">
          <BaseInput v-model="depositAmount" type="number" min="0" step="0.01" />
        </BaseField>
      </div>
      <div class="flex flex-wrap justify-end gap-2">
        <BaseButton v-if="canRefund" variant="ghost" :disabled="processing" @click="send('refund')">
          {{ t('reservations.payment.actions.refund') }}
        </BaseButton>
        <BaseButton
          v-if="canDeposit"
          variant="secondary"
          :disabled="processing"
          @click="send('deposit')"
        >
          {{ t('reservations.payment.actions.deposit') }}
        </BaseButton>
        <BaseButton v-if="canBalance" :disabled="processing" @click="send('balance')">
          {{ t('reservations.payment.actions.balance') }}
        </BaseButton>
      </div>
    </div>

    <div class="border-t border-border pt-4">
      <SecurityDepositPanel
        :boat-id="boatId"
        :reservation="reservation"
        :can-manage="canManage"
        :reload-props="reloadProps"
      />
    </div>
  </div>
</template>
