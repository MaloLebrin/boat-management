<script lang="ts">
import AuthLayout from '~/layouts/auth.vue'
export default { layout: AuthLayout }
</script>

<script setup lang="ts">
import { Head, useForm } from '@inertiajs/vue3'
import BaseAlert from '~/components/base/BaseAlert.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import type { PublicInvoicePayment } from '#shared/types/online_payment'

/**
 * Page publique de paiement d'une facture (`/pay/:token`, #876). Le client du
 * loueur y arrive depuis l'e-mail ou le PDF de sa facture, sans compte : le
 * bouton ouvre Stripe Checkout sur le compte du loueur.
 */
const props = defineProps<{
  /** `null` : jeton inconnu (lien tronqué ou inventé). */
  payment: PublicInvoicePayment | null
}>()

const { t } = useT()
const { formatDateLong } = useDateFormat()
const { formatCurrency } = useNumberFormat()

const form = useForm({})

function pay() {
  if (!props.payment) return
  form.post(`/pay/${props.payment.token}/checkout`)
}
</script>

<template>
  <Head :title="t('invoices.onlinePayment.public.title')" />
  <div class="mx-auto max-w-lg px-4 py-12">
    <BaseCard v-if="payment" data-testid="invoice-payment">
      <p class="text-sm text-fg-muted">{{ payment.organizationName }}</p>
      <BaseHeading level="1" class="mt-1">
        {{ t('invoices.onlinePayment.public.heading', { number: payment.number }) }}
      </BaseHeading>

      <dl class="mt-6 space-y-2 text-sm">
        <div v-if="payment.clientName" class="flex justify-between gap-4">
          <dt class="text-fg-muted">{{ t('invoices.onlinePayment.public.client') }}</dt>
          <dd class="text-fg">{{ payment.clientName }}</dd>
        </div>
        <div v-if="payment.issuedAt" class="flex justify-between gap-4">
          <dt class="text-fg-muted">{{ t('invoices.onlinePayment.public.issuedAt') }}</dt>
          <dd class="text-fg">{{ formatDateLong(payment.issuedAt) }}</dd>
        </div>
        <div v-if="payment.dueAt" class="flex justify-between gap-4">
          <dt class="text-fg-muted">{{ t('invoices.onlinePayment.public.dueAt') }}</dt>
          <dd class="text-fg">{{ formatDateLong(payment.dueAt) }}</dd>
        </div>
        <div class="flex justify-between gap-4 border-t border-border pt-2">
          <dt class="font-semibold text-fg">{{ t('invoices.onlinePayment.public.total') }}</dt>
          <dd class="font-semibold text-fg" data-testid="invoice-payment-total">
            {{ formatCurrency(payment.total, { currency: payment.currency }) }}
          </dd>
        </div>
      </dl>

      <div class="mt-6">
        <BaseAlert v-if="payment.state === 'paid'" variant="success">
          {{ t('invoices.onlinePayment.public.paid') }}
        </BaseAlert>
        <BaseAlert v-else-if="payment.returnedFromCheckout" variant="info">
          {{ t('invoices.onlinePayment.public.processing') }}
        </BaseAlert>
        <BaseAlert v-else-if="payment.state === 'unavailable'" variant="warning">
          {{
            t('invoices.onlinePayment.public.unavailable', { orgName: payment.organizationName })
          }}
        </BaseAlert>
        <template v-else>
          <BaseButton
            variant="primary"
            class="w-full"
            :disabled="form.processing"
            data-testid="invoice-payment-submit"
            @click="pay"
          >
            {{
              t('invoices.onlinePayment.public.pay', {
                amount: formatCurrency(payment.total, { currency: payment.currency }),
              })
            }}
          </BaseButton>
          <p class="mt-3 text-center text-xs text-fg-subtle">
            {{ t('invoices.onlinePayment.public.secured') }}
          </p>
        </template>
      </div>
    </BaseCard>

    <BaseCard v-else data-testid="invoice-payment-invalid">
      <BaseHeading level="1">{{ t('invoices.onlinePayment.public.invalidTitle') }}</BaseHeading>
      <p class="mt-3 text-sm text-fg-muted">
        {{ t('invoices.onlinePayment.public.invalidBody') }}
      </p>
    </BaseCard>
  </div>
</template>
