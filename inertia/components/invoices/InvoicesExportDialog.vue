<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/use_t'
import {
  EXPORT_ASYNC_THRESHOLD,
  FEC_MIN_YEAR,
  INVOICE_EXPORT_STATUSES,
} from '../../../shared/constants/exports'

const { t } = useT()

const open = ref(false)
const from = ref('')
const to = ref('')
const kind = ref<'' | 'invoice' | 'credit_note'>('')
const status = ref<'' | (typeof INVOICE_EXPORT_STATUSES)[number]>('')
const detail = ref<'documents' | 'lines'>('documents')
const fecYear = ref(new Date().getFullYear())

// Réinitialise les champs à l'ouverture
watch(open, (isOpen) => {
  if (isOpen) {
    from.value = ''
    to.value = ''
    kind.value = ''
    status.value = ''
    detail.value = 'documents'
    fecYear.value = new Date().getFullYear()
  }
})

const kindOptions = computed(() => [
  { value: '', label: t('common.exports.invoices.allKinds') },
  { value: 'invoice', label: t('invoices.kind.invoice') },
  { value: 'credit_note', label: t('invoices.kind.credit_note') },
])

const statusOptions = computed(() => [
  { value: '', label: t('common.exports.invoices.allStatuses') },
  ...INVOICE_EXPORT_STATUSES.map((s) => ({
    value: s,
    label: t(`invoices.status.${s}`),
  })),
])

const detailOptions = computed(() => [
  { value: 'documents', label: t('common.exports.invoices.detailDocuments') },
  { value: 'lines', label: t('common.exports.invoices.detailLines') },
])

const currentYear = new Date().getFullYear()
const fecYearOptions = computed(() => {
  const years: { value: number; label: string }[] = []
  for (let y = currentYear; y >= Math.max(FEC_MIN_YEAR, currentYear - 5); y--) {
    years.push({ value: y, label: String(y) })
  }
  return years
})

const csvHref = computed(() => {
  const params = new URLSearchParams()
  if (from.value) params.set('from', from.value)
  if (to.value) params.set('to', to.value)
  if (kind.value) params.set('kind', kind.value)
  if (status.value) params.set('status', status.value)
  params.set('detail', detail.value)
  const qs = params.toString()
  return `/invoices/export.csv${qs ? `?${qs}` : ''}`
})

const fecHref = computed(() => `/invoices/export/fec?year=${fecYear.value}`)
</script>

<template>
  <BaseButton variant="secondary" size="sm" type="button" @click="open = true">
    {{ t('common.exports.invoices.button') }}
  </BaseButton>

  <BaseModal
    :open="open"
    :title="t('common.exports.invoices.title')"
    size="xl"
    @update:open="open = $event"
  >
    <div class="space-y-6">
      <!-- Section journal des ventes -->
      <div>
        <h3 class="text-sm font-semibold text-fg mb-3">
          {{ t('common.exports.invoices.salesJournal') }}
        </h3>

        <div class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <BaseInput
              id="invoice-export-from"
              v-model="from"
              type="date"
              :label="t('common.exports.from')"
            />
            <BaseInput
              id="invoice-export-to"
              v-model="to"
              type="date"
              :label="t('common.exports.to')"
            />
          </div>

          <div class="grid gap-4 sm:grid-cols-3">
            <BaseSelect
              id="invoice-export-kind"
              v-model="kind"
              :label="t('common.exports.invoices.kindLabel')"
              :options="kindOptions"
            />
            <BaseSelect
              id="invoice-export-status"
              v-model="status"
              :label="t('common.exports.invoices.statusLabel')"
              :options="statusOptions"
            />
            <BaseSelect
              id="invoice-export-detail"
              v-model="detail"
              :label="t('common.exports.invoices.detailLabel')"
              :options="detailOptions"
            />
          </div>

          <p class="text-sm text-fg-muted">
            {{ t('common.exports.asyncHint', { threshold: String(EXPORT_ASYNC_THRESHOLD) }) }}
          </p>

          <!-- Téléchargement : une visite Inertia rendrait le fichier comme une page. -->
          <BaseButton
            variant="primary"
            size="sm"
            :href="csvHref"
            external-href
            data-testid="invoices-export-download"
            @click="open = false"
          >
            {{ t('common.exports.download') }}
          </BaseButton>
        </div>
      </div>

      <!-- Section FEC -->
      <div class="border-t border-border pt-6">
        <h3 class="text-sm font-semibold text-fg mb-3">
          {{ t('common.exports.fec.title') }}
        </h3>
        <p class="text-sm text-fg-muted mb-4">
          {{ t('common.exports.fec.description') }}
        </p>

        <div class="flex items-end gap-4">
          <div class="w-32">
            <BaseSelect
              id="fec-year"
              v-model="fecYear"
              :label="t('common.exports.fec.yearLabel')"
              :options="fecYearOptions"
            />
          </div>
          <BaseButton
            variant="secondary"
            size="sm"
            :href="fecHref"
            external-href
            data-testid="fec-download"
            @click="open = false"
          >
            {{ t('common.exports.fec.download') }}
          </BaseButton>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <BaseButton variant="ghost" size="sm" type="button" @click="open = false">
          {{ t('common.close') }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
