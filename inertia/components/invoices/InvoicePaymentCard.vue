<script setup lang="ts">
import { computed, ref } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/use_t'
import { INVOICE_PAYMENT_METHODS } from '#shared/helpers/invoice_lifecycle'
import type { InvoiceDetail, InvoicePaymentMethod } from '#shared/types/invoice'

/**
 * Bloc « Paiement » d'une facture émise (#717). La pièce est figée : c'est la
 * seule écriture qu'elle accepte encore — sa date et son moyen de règlement.
 * Vider la date annule le paiement enregistré (la facture retourne à `sent`).
 */
const props = defineProps<{ invoice: InvoiceDetail }>()

const { t } = useT()

// `YYYY-MM-DD` est le format machine attendu par `<input type="date">` : la
// date affichée à l'utilisateur passe, elle, par `useDateFormat()`.
const paidAt = ref(props.invoice.paidAt ?? '')
const paymentMethod = ref<InvoicePaymentMethod | ''>(props.invoice.paymentMethod ?? '')
const busy = ref(false)

const methodOptions = computed(() =>
  INVOICE_PAYMENT_METHODS.map((method) => ({
    label: t(`invoices.paymentMethods.${method}`),
    value: method,
  }))
)

function submit() {
  router.patch(
    `/invoices/${props.invoice.id}/payment`,
    {
      paidAt: paidAt.value || null,
      paymentMethod: paidAt.value ? paymentMethod.value || null : null,
    },
    {
      preserveScroll: true,
      onStart: () => {
        busy.value = true
      },
      onFinish: () => {
        busy.value = false
      },
    }
  )
}
</script>

<template>
  <BaseCard>
    <p class="mb-1 text-sm font-semibold text-fg">{{ t('invoices.payment.title') }}</p>
    <p class="mb-4 text-sm text-fg-muted">{{ t('invoices.payment.description') }}</p>

    <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="submit">
      <BaseInput
        id="invoice-paid-at"
        v-model="paidAt"
        name="paidAt"
        type="date"
        :label="t('invoices.payment.paidAt')"
        :hint="t('invoices.payment.paidAtHint')"
      />
      <BaseSelect
        id="invoice-payment-method"
        v-model="paymentMethod"
        name="paymentMethod"
        allow-empty
        :label="t('invoices.payment.method')"
        :placeholder="t('invoices.paymentMethods.none')"
        :options="methodOptions"
        :disabled="!paidAt"
      />
      <div class="sm:col-span-2">
        <BaseButton variant="primary" size="sm" type="submit" :disabled="busy">
          {{ t('invoices.payment.submit') }}
        </BaseButton>
      </div>
    </form>
  </BaseCard>
</template>
