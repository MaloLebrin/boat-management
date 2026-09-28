<script setup lang="ts">
import { computed, ref } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import { useT } from '~/composables/use_t'
import { isInvoicePayableOnline } from '#shared/helpers/invoice_lifecycle'
import type { InvoiceDetail } from '#shared/types/invoice'

/**
 * Lien de paiement en ligne d'une facture (#876). Posé à l'envoi par e-mail ;
 * une facture envoyée avant la connexion du compte Stripe l'obtient ici. Le
 * lien se copie pour être transmis au client par un autre canal.
 */
const props = defineProps<{
  invoice: InvoiceDetail
  canAcceptOnlinePayments: boolean
}>()

const { t } = useT()

const busy = ref(false)
const copied = ref(false)

const visible = computed(
  () =>
    isInvoicePayableOnline(props.invoice) &&
    (props.invoice.onlinePaymentUrl !== null || props.canAcceptOnlinePayments)
)

function createLink() {
  router.post(
    `/invoices/${props.invoice.id}/payment-link`,
    {},
    {
      preserveScroll: true,
      onStart: () => (busy.value = true),
      onFinish: () => (busy.value = false),
    }
  )
}

async function copyLink() {
  if (!props.invoice.onlinePaymentUrl) return
  try {
    await navigator.clipboard.writeText(props.invoice.onlinePaymentUrl)
    copied.value = true
  } catch {
    copied.value = false
  }
}
</script>

<template>
  <BaseCard v-if="visible" data-testid="invoice-online-payment">
    <p class="mb-1 text-sm font-semibold text-fg">{{ t('invoices.onlinePayment.title') }}</p>

    <template v-if="invoice.onlinePaymentUrl">
      <p class="mb-3 text-sm text-fg-muted">{{ t('invoices.onlinePayment.linkHint') }}</p>
      <div class="flex flex-wrap items-center gap-2">
        <input
          :value="invoice.onlinePaymentUrl"
          :aria-label="t('invoices.onlinePayment.linkLabel')"
          readonly
          class="min-w-0 flex-1 rounded-md border border-border bg-surface-muted px-3 py-1.5 text-sm text-fg"
          data-testid="invoice-online-payment-url"
        />
        <BaseButton variant="secondary" size="sm" @click="copyLink">
          {{ copied ? t('invoices.onlinePayment.copied') : t('invoices.onlinePayment.copy') }}
        </BaseButton>
      </div>
    </template>
    <template v-else>
      <p class="mb-3 text-sm text-fg-muted">{{ t('invoices.onlinePayment.noLinkHint') }}</p>
      <BaseButton variant="primary" size="sm" :disabled="busy" @click="createLink">
        {{ t('invoices.onlinePayment.createLink') }}
      </BaseButton>
    </template>
  </BaseCard>
</template>
