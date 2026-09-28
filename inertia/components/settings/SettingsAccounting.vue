<script setup lang="ts">
import { computed, watch } from 'vue'
import { useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useT } from '~/composables/use_t'
import type { AccountingSettings } from '../../../shared/types/export'

/**
 * Configuration des comptes du FEC (#879) : SIREN et comptes comptables.
 * Le FEC sert d'aide au comptable, pas de grand livre certifié.
 */
const props = defineProps<{ settings: AccountingSettings }>()

const { t } = useT()

const form = useForm({
  siren: props.settings.siren ?? '',
  salesAccount: props.settings.accounts.sales,
  vatAccount: props.settings.accounts.vat,
  customerAccount: props.settings.accounts.customers,
  bankAccount: props.settings.accounts.bank,
})

// Synchronise le formulaire si les props changent (e.g., après une sauvegarde)
watch(
  () => props.settings,
  (s) => {
    form.siren = s.siren ?? ''
    form.salesAccount = s.accounts.sales
    form.vatAccount = s.accounts.vat
    form.customerAccount = s.accounts.customers
    form.bankAccount = s.accounts.bank
  }
)

const editable = computed(() => props.settings.canManage)

function save() {
  form
    .transform((data) => ({
      siren: data.siren.trim() || null,
      salesAccount: data.salesAccount.trim(),
      vatAccount: data.vatAccount.trim(),
      customerAccount: data.customerAccount.trim(),
      bankAccount: data.bankAccount.trim(),
    }))
    .put('/settings/billing/accounting', { preserveScroll: true })
}
</script>

<template>
  <BaseCard data-testid="accounting-settings">
    <p class="text-sm font-semibold text-fg">
      {{ t('settings.billing.accounting.title') }}
    </p>
    <p class="mt-1 text-sm text-fg-muted">
      {{ t('settings.billing.accounting.description') }}
    </p>

    <p v-if="!editable" class="mt-4 text-sm text-fg-muted">
      {{ t('settings.billing.accounting.adminOnly') }}
    </p>

    <form v-if="editable" class="mt-4 space-y-4" @submit.prevent="save">
      <BaseInput
        id="accounting-siren"
        v-model="form.siren"
        name="siren"
        :label="t('settings.billing.accounting.sirenLabel')"
        :placeholder="t('settings.billing.accounting.sirenPlaceholder')"
        :hint="t('settings.billing.accounting.sirenHint')"
        :error="form.errors.siren"
        maxlength="9"
        inputmode="numeric"
        pattern="\d{9}"
      />

      <div class="grid grid-cols-2 gap-4">
        <BaseInput
          id="accounting-sales"
          v-model="form.salesAccount"
          name="salesAccount"
          :label="t('settings.billing.accounting.salesLabel')"
          :placeholder="t('settings.billing.accounting.salesPlaceholder')"
          :error="form.errors.salesAccount"
        />
        <BaseInput
          id="accounting-vat"
          v-model="form.vatAccount"
          name="vatAccount"
          :label="t('settings.billing.accounting.vatLabel')"
          :placeholder="t('settings.billing.accounting.vatPlaceholder')"
          :error="form.errors.vatAccount"
        />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <BaseInput
          id="accounting-customers"
          v-model="form.customerAccount"
          name="customerAccount"
          :label="t('settings.billing.accounting.customersLabel')"
          :placeholder="t('settings.billing.accounting.customersPlaceholder')"
          :error="form.errors.customerAccount"
        />
        <BaseInput
          id="accounting-bank"
          v-model="form.bankAccount"
          name="bankAccount"
          :label="t('settings.billing.accounting.bankLabel')"
          :placeholder="t('settings.billing.accounting.bankPlaceholder')"
          :error="form.errors.bankAccount"
        />
      </div>

      <p class="text-xs text-fg-muted">
        {{ t('settings.billing.accounting.fecNote') }}
      </p>

      <BaseButton variant="primary" size="sm" type="submit" :disabled="form.processing">
        {{ t('settings.billing.accounting.save') }}
      </BaseButton>
    </form>
  </BaseCard>
</template>
