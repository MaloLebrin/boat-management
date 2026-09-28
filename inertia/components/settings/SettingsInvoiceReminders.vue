<script setup lang="ts">
import { computed } from 'vue'
import { useForm } from '@inertiajs/vue3'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import BaseToggle from '~/components/base/BaseToggle.vue'
import { useT } from '~/composables/use_t'
import { INVOICE_REMINDER_TEXT_MAX_LENGTH } from '#shared/constants/invoice_reminders'
import type { InvoiceRemindersSettings } from '#shared/types/invoice_reminder'

/**
 * Relances automatiques des factures en retard (#878) : activation, message
 * ajouté à chaque relance et mention des pénalités de la dernière.
 */
const props = defineProps<{ settings: InvoiceRemindersSettings }>()

const { t } = useT()

const form = useForm({
  enabled: props.settings.enabled,
  message: props.settings.message ?? '',
  latePenaltyNote: props.settings.latePenaltyNote ?? '',
})

const tiers = computed(() => ({
  first: String(props.settings.tiers[0] ?? ''),
  second: String(props.settings.tiers[1] ?? ''),
  third: String(props.settings.tiers[2] ?? ''),
}))
const editable = computed(() => props.settings.available && props.settings.canManage)

function save() {
  form
    .transform((data) => ({
      enabled: data.enabled,
      message: data.message.trim() || null,
      latePenaltyNote: data.latePenaltyNote.trim() || null,
    }))
    .patch('/settings/billing/invoice-reminders', { preserveScroll: true })
}
</script>

<template>
  <BaseCard data-testid="invoice-reminders-settings">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-sm font-semibold text-fg">
        {{ t('settings.billing.invoiceReminders.title') }}
      </p>
      <BaseBadge :variant="settings.enabled ? 'success' : 'neutral'">
        {{ t(`settings.billing.invoiceReminders.state.${settings.enabled ? 'on' : 'off'}`) }}
      </BaseBadge>
    </div>
    <p class="mt-1 text-sm text-fg-muted">
      {{ t('settings.billing.invoiceReminders.description', tiers) }}
    </p>

    <p v-if="!settings.available" class="mt-4 text-sm text-fg-muted">
      {{ t('settings.billing.invoiceReminders.unavailable') }}
    </p>
    <p v-else-if="!settings.canManage" class="mt-4 text-sm text-fg-muted">
      {{ t('settings.billing.invoiceReminders.adminOnly') }}
    </p>

    <form v-if="editable" class="mt-4 space-y-4" @submit.prevent="save">
      <BaseToggle
        v-model="form.enabled"
        :hint="t('settings.billing.invoiceReminders.enabledHint')"
        data-testid="invoice-reminders-enabled"
      >
        {{ t('settings.billing.invoiceReminders.enabled') }}
      </BaseToggle>
      <BaseTextarea
        id="invoice-reminder-message"
        v-model="form.message"
        name="message"
        :rows="3"
        :maxlength="INVOICE_REMINDER_TEXT_MAX_LENGTH"
        :label="t('settings.billing.invoiceReminders.message')"
        :placeholder="t('settings.billing.invoiceReminders.messagePlaceholder')"
        :error="form.errors.message"
      />
      <BaseTextarea
        id="invoice-late-penalty-note"
        v-model="form.latePenaltyNote"
        name="latePenaltyNote"
        :rows="3"
        :maxlength="INVOICE_REMINDER_TEXT_MAX_LENGTH"
        :label="t('settings.billing.invoiceReminders.latePenaltyNote')"
        :placeholder="t('settings.billing.invoiceReminders.latePenaltyNotePlaceholder')"
        :error="form.errors.latePenaltyNote"
      />
      <BaseButton variant="primary" size="sm" type="submit" :disabled="form.processing">
        {{ t('settings.billing.invoiceReminders.save') }}
      </BaseButton>
    </form>
  </BaseCard>
</template>
