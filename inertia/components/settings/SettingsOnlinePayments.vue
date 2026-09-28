<script setup lang="ts">
import { computed } from 'vue'
import { router, useForm } from '@inertiajs/vue3'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import { useT } from '~/composables/use_t'
import { confirmed } from '~/utils/native_dialog'
import type { OnlinePaymentsSettings } from '#shared/types/online_payment'

/**
 * Paiement en ligne des factures (#876) : l'organisation connecte son propre
 * compte Stripe (Stripe Connect). Les clients règlent leurs factures depuis
 * le lien de l'e-mail, et l'argent arrive directement sur ce compte.
 */
const props = defineProps<{ settings: OnlinePaymentsSettings }>()

const { t } = useT()

const connectForm = useForm({})

const badge = computed(() => {
  if (props.settings.state === 'active') return { variant: 'success' as const, key: 'active' }
  if (props.settings.state === 'pending') return { variant: 'warning' as const, key: 'pending' }
  return { variant: 'neutral' as const, key: 'none' }
})

function connect() {
  connectForm.post('/settings/billing/online-payments')
}

function disconnect() {
  if (!confirmed(t('settings.billing.onlinePayments.disconnectConfirm'))) return
  router.delete('/settings/billing/online-payments', { preserveScroll: true })
}
</script>

<template>
  <BaseCard data-testid="online-payments">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-sm font-semibold text-fg">{{ t('settings.billing.onlinePayments.title') }}</p>
      <BaseBadge :variant="badge.variant">
        {{ t(`settings.billing.onlinePayments.state.${badge.key}`) }}
      </BaseBadge>
    </div>
    <p class="mt-1 text-sm text-fg-muted">
      {{ t('settings.billing.onlinePayments.description') }}
    </p>

    <p v-if="!settings.available" class="mt-4 text-sm text-fg-muted">
      {{ t('settings.billing.onlinePayments.unavailable') }}
    </p>
    <template v-else>
      <p v-if="settings.state === 'pending'" class="mt-4 text-sm text-warning">
        {{ t('settings.billing.onlinePayments.pendingHint') }}
      </p>
      <p v-else-if="settings.state === 'active'" class="mt-4 text-sm text-fg-muted">
        {{ t('settings.billing.onlinePayments.activeHint') }}
      </p>

      <div v-if="settings.canManage" class="mt-4 flex flex-wrap gap-2">
        <BaseButton
          v-if="settings.state !== 'active'"
          variant="primary"
          size="sm"
          :disabled="connectForm.processing"
          @click="connect"
        >
          {{
            settings.state === 'none'
              ? t('settings.billing.onlinePayments.connect')
              : t('settings.billing.onlinePayments.resume')
          }}
        </BaseButton>
        <BaseButton
          v-if="settings.state !== 'none'"
          variant="secondary"
          size="sm"
          @click="disconnect"
        >
          {{ t('settings.billing.onlinePayments.disconnect') }}
        </BaseButton>
      </div>
      <p v-else class="mt-4 text-sm text-fg-muted">
        {{ t('settings.billing.onlinePayments.adminOnly') }}
      </p>
    </template>
  </BaseCard>
</template>
