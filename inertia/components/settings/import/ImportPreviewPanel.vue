<script setup lang="ts">
import { computed, ref } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import { useT } from '~/composables/use_t'
import type { CsvImportPreviewData, CsvPreviewRowStatus } from '#shared/types/csv'
import { routes } from '~/utils/routes'

const { t } = useT()

const props = defineProps<{ preview: CsvImportPreviewData }>()

const isSubmitting = ref(false)

/** Colonnes affichées selon le type — l'aperçu ne montre pas tout le fichier. */
const columns = computed<string[]>(() =>
  props.preview.type === 'expenses'
    ? ['date', 'label', 'amount', 'category']
    : ['date', 'title', 'subject']
)

/**
 * Palettes de marque, rôles respectés (`-100` fond, `-700` encre) : `mint`
 * pour une ligne valide, `coral` pour une erreur, `amber` pour un doublon
 * — ni erreur ni import, juste une ligne que le `confirm` sautera.
 */
const badgeClass: Record<CsvPreviewRowStatus, string> = {
  valid: 'bg-mint-100 text-mint-700',
  invalid: 'bg-coral-100 text-coral-700',
  duplicate: 'bg-amber-100 text-amber-700',
}

const rowClass: Record<CsvPreviewRowStatus, string> = {
  valid: 'bg-surface',
  invalid: 'bg-danger-soft',
  duplicate: 'bg-amber-50',
}

const statusLabel: Record<CsvPreviewRowStatus, string> = {
  valid: 'settings.import.rowValid',
  invalid: 'settings.import.rowInvalid',
  duplicate: 'settings.import.rowDuplicate',
}

function handleConfirm() {
  const form = new FormData()
  form.append('type', props.preview.type)
  form.append('boatId', String(props.preview.boatId))
  isSubmitting.value = true
  router.post(routes.csv.importConfirm(), form, {
    onFinish: () => {
      isSubmitting.value = false
    },
  })
}

function handleCancel() {
  router.post(routes.csv.importCancel(), {})
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-sm text-fg-muted">
        {{
          t('settings.import.previewSummary', {
            valid: String(preview.validRows),
            total: String(preview.totalRows),
          })
        }}
        — <strong>{{ preview.boatName }}</strong>
      </p>
      <span class="flex items-center gap-3 text-xs text-fg-muted">
        <span>{{
          t('settings.import.previewErrors', { count: String(preview.invalidRows) })
        }}</span>
        <span
          v-if="preview.duplicateRows > 0"
          data-testid="preview-duplicates"
          class="text-amber-700"
        >
          {{ t('settings.import.previewDuplicates', { count: String(preview.duplicateRows) }) }}
        </span>
      </span>
    </div>

    <div class="overflow-x-auto rounded-lg border border-border">
      <table class="w-full text-sm">
        <thead class="bg-surface-muted text-left text-xs font-medium text-fg-muted">
          <tr>
            <th class="px-3 py-2">{{ t('settings.import.previewColumns.line') }}</th>
            <th v-for="column in columns" :key="column" class="px-3 py-2">
              {{ t(`settings.import.previewColumns.${column}`) }}
            </th>
            <th class="px-3 py-2">{{ t('settings.import.previewColumns.status') }}</th>
            <th class="px-3 py-2">{{ t('settings.import.previewColumns.errors') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr
            v-for="row in preview.rows"
            :key="row.line"
            :class="rowClass[row.status]"
            :data-status="row.status"
          >
            <td class="px-3 py-2 text-fg-muted">{{ row.line }}</td>
            <td
              v-for="column in columns"
              :key="column"
              class="max-w-[200px] truncate px-3 py-2"
              :class="column === 'amount' ? 'text-right tabular-nums' : ''"
            >
              {{ row.raw[column] ?? '' }}
            </td>
            <td class="px-3 py-2">
              <span
                :class="['rounded-full px-2 py-0.5 text-xs font-medium', badgeClass[row.status]]"
              >
                {{ t(statusLabel[row.status]) }}
              </span>
            </td>
            <td class="px-3 py-2 text-xs text-danger">
              {{ row.errors.map((e) => e.message).join(', ') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex items-center justify-between">
      <BaseButton type="button" variant="secondary" @click="handleCancel">
        {{ t('settings.import.cancelButton') }}
      </BaseButton>
      <BaseButton
        type="button"
        variant="primary"
        :disabled="preview.validRows === 0 || isSubmitting"
        @click="handleConfirm"
      >
        {{ t('settings.import.confirmButton', { count: String(preview.validRows) }) }}
      </BaseButton>
    </div>
  </div>
</template>
