<script setup lang="ts">
import { computed, ref } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseToggle from '~/components/base/BaseToggle.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import { canRemindInvoice } from '#shared/helpers/invoice_reminders'
import type { InvoiceDetail } from '#shared/types/invoice'
import type { InvoiceReminderRow, InvoiceRemindersInfo } from '#shared/types/invoice_reminder'

/**
 * Bloc « Relances » d'une facture (#878) : relances déjà envoyées (ou non
 * envoyées, faute de destinataire), « Relancer maintenant » et l'interrupteur
 * « ne plus relancer » pour un client en litige.
 */
const props = defineProps<{
  invoice: InvoiceDetail
  reminders: InvoiceRemindersInfo
  readOnly?: boolean
}>()

const { t } = useT()
const { formatDate, formatDateTime } = useDateFormat()

const busy = ref(false)

const unpaid = computed(() => props.invoice.status === 'sent' || props.invoice.status === 'overdue')
const canSendNow = computed(
  () =>
    !props.readOnly &&
    canRemindInvoice({
      kind: props.invoice.kind,
      status: props.invoice.status,
      remindersDisabled: props.reminders.disabled,
    })
)

function visitOptions() {
  return {
    preserveScroll: true,
    onStart: () => {
      busy.value = true
    },
    onFinish: () => {
      busy.value = false
    },
  }
}

function sendNow() {
  router.post(`/invoices/${props.invoice.id}/reminders`, {}, visitOptions())
}

function setDisabled(disabled: boolean) {
  router.patch(`/invoices/${props.invoice.id}/reminders`, { disabled }, visitOptions())
}

function describe(reminder: InvoiceReminderRow): string {
  const parts = [t(`invoices.reminders.trigger.${reminder.trigger}`)]
  if (reminder.userName) parts.push(t('invoices.reminders.by', { name: reminder.userName }))
  if (reminder.outcome === 'skipped' && reminder.skipReason) {
    parts.push(
      t('invoices.reminders.skipped', {
        reason: t(`invoices.reminders.skipReason.${reminder.skipReason}`),
      })
    )
  }
  return parts.join(' · ')
}
</script>

<template>
  <BaseCard data-testid="invoice-reminders">
    <div class="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div>
        <p class="text-sm font-semibold text-fg">{{ t('invoices.reminders.title') }}</p>
        <p class="mt-1 text-sm text-fg-muted">
          {{ t('invoices.reminders.count', { count: String(reminders.count) }) }}
          <template v-if="reminders.lastReminderAt">
            · {{ t('invoices.reminders.last', { date: formatDate(reminders.lastReminderAt) }) }}
          </template>
        </p>
        <p class="mt-1 text-sm text-fg-subtle">
          {{
            reminders.automaticEnabled
              ? t('invoices.reminders.automaticOn')
              : t('invoices.reminders.automaticOff')
          }}
        </p>
      </div>
      <BaseButton
        v-if="canSendNow"
        variant="secondary"
        size="sm"
        type="button"
        :disabled="busy"
        data-testid="invoice-reminders-send"
        @click="sendNow"
      >
        {{ t('invoices.reminders.sendNow') }}
      </BaseButton>
    </div>

    <BaseToggle
      v-if="!readOnly && unpaid"
      :model-value="reminders.disabled"
      :disabled="busy"
      :hint="reminders.disabled ? t('invoices.reminders.disabledHint') : undefined"
      data-testid="invoice-reminders-toggle"
      @update:model-value="setDisabled"
    >
      {{ t('invoices.reminders.disable') }}
    </BaseToggle>

    <div v-if="reminders.history.length > 0" class="mt-4">
      <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
        {{ t('invoices.reminders.history') }}
      </p>
      <ul class="divide-y divide-border">
        <li
          v-for="reminder in reminders.history"
          :key="reminder.id"
          class="flex flex-wrap items-baseline justify-between gap-2 py-2 text-sm"
          :data-testid="`invoice-reminder-${reminder.id}`"
        >
          <span :class="reminder.outcome === 'skipped' ? 'text-warning' : 'text-fg'">
            {{ t('invoices.reminders.tier', { tier: String(reminder.tier) }) }}
            <span class="text-fg-muted">— {{ describe(reminder) }}</span>
          </span>
          <span class="text-fg-subtle">{{ formatDateTime(reminder.createdAt) }}</span>
        </li>
      </ul>
    </div>
  </BaseCard>
</template>
