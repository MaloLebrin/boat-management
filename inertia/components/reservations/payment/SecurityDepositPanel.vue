<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { computed, ref, watch } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseField from '~/components/base/BaseField.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import type { SecurityDepositAction } from '#shared/types/reservation'
import type { BoatReservationRow, SecurityDepositStatus } from '~/types/reservation'

/**
 * Caution d'une location (#875) : bloquée au départ, puis restituée ou retenue
 * (montant et motif) au vu de l'état des lieux de retour.
 */
const props = defineProps<{
  boatId: number
  reservation: BoatReservationRow
  canManage: boolean
  /** Props rechargées après un geste : celles de la page hôte. */
  reloadProps: string[]
}>()

const { t } = useT()
const { formatCurrency } = useNumberFormat()

const amount = ref('')
const retainedAmount = ref('')
const note = ref('')
const processing = ref(false)

watch(
  () => props.reservation.securityDepositAmount,
  (value) => {
    amount.value = value ?? ''
  },
  { immediate: true }
)

const status = computed(() => props.reservation.securityDepositStatus)

const statusVariant: Record<SecurityDepositStatus, 'neutral' | 'info' | 'success' | 'warning'> = {
  none: 'neutral',
  held: 'info',
  released: 'success',
  retained: 'warning',
}

function money(value: string | null): string {
  return value === null ? '—' : formatCurrency(Number(value))
}

function send(action: SecurityDepositAction) {
  const data: Record<string, string | number | null> = { action }
  if (action === 'hold') data.amount = amount.value === '' ? null : Number(amount.value)
  if (action === 'retain') {
    data.amount = retainedAmount.value === '' ? null : Number(retainedAmount.value)
    data.note = note.value
  }
  router.patch(
    `/boats/${props.boatId}/reservations/${props.reservation.id}/security-deposit`,
    data,
    {
      preserveScroll: true,
      only: props.reloadProps,
      onStart: () => (processing.value = true),
      onFinish: () => (processing.value = false),
    }
  )
}
</script>

<template>
  <section class="space-y-3" data-testid="security-deposit-panel">
    <div class="flex items-center justify-between gap-2">
      <h3 class="text-sm font-semibold text-fg">
        {{ t('reservations.payment.securityDeposit.title') }}
      </h3>
      <BaseBadge :variant="statusVariant[status]">
        {{ t(`reservations.payment.securityDeposit.status.${status}`) }}
      </BaseBadge>
    </div>

    <dl class="flex flex-wrap items-baseline gap-x-2 text-sm">
      <dt class="text-fg-muted">{{ t('reservations.payment.securityDeposit.amount') }}</dt>
      <dd class="font-medium text-fg">{{ money(reservation.securityDepositAmount) }}</dd>
    </dl>
    <p v-if="status === 'retained'" class="text-sm text-fg-muted">
      {{
        t('reservations.payment.securityDeposit.retainedSummary', {
          amount: money(reservation.securityDepositRetainedAmount),
          note: reservation.securityDepositNote ?? '',
        })
      }}
    </p>

    <div
      v-if="canManage && status === 'none' && reservation.status !== 'cancelled'"
      class="flex flex-wrap items-end gap-2"
    >
      <BaseField
        :label="t('reservations.payment.securityDeposit.amount')"
        :hint="
          reservation.securityDepositAmount
            ? undefined
            : t('reservations.payment.securityDeposit.noAmount')
        "
        class="min-w-40 flex-1"
      >
        <BaseInput v-model="amount" type="number" min="0" step="0.01" />
      </BaseField>
      <BaseButton variant="secondary" :disabled="processing" @click="send('hold')">
        {{ t('reservations.payment.securityDeposit.hold') }}
      </BaseButton>
    </div>

    <div v-if="canManage && status === 'held'" class="space-y-3">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BaseField :label="t('reservations.payment.securityDeposit.retainedAmount')">
          <BaseInput v-model="retainedAmount" type="number" min="0" step="0.01" />
        </BaseField>
        <BaseField :label="t('reservations.payment.securityDeposit.note')">
          <BaseInput
            v-model="note"
            :placeholder="t('reservations.payment.securityDeposit.notePlaceholder')"
          />
        </BaseField>
      </div>
      <div class="flex flex-wrap justify-end gap-2">
        <BaseButton variant="secondary" :disabled="processing" @click="send('retain')">
          {{ t('reservations.payment.securityDeposit.retain') }}
        </BaseButton>
        <BaseButton :disabled="processing" @click="send('release')">
          {{ t('reservations.payment.securityDeposit.release') }}
        </BaseButton>
      </div>
    </div>
  </section>
</template>
