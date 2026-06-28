<script setup lang="ts">
import { computed, ref } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import CsvHelpModal from '~/components/settings/CsvHelpModal.vue'
import { useT } from '~/composables/use_t'
import { routes } from '~/utils/routes'
import { MAINTENANCE_CSV_HEADERS } from '../../../../shared/types/csv'
import type { CsvBoatOption, CsvImportPreviewData } from '../../../../shared/types/csv'

const { t } = useT()

const props = defineProps<{
  boats: CsvBoatOption[]
  preview: CsvImportPreviewData | null
  hasPendingImport: boolean
}>()

const selectedBoatId = ref<string | ''>('')
const selectedType = ref<'maintenance'>('maintenance')
const fileInput = ref<HTMLInputElement | null>(null)
const isSubmitting = ref(false)
const showHelpModal = ref(false)

function getExportHref(key: string) {
  if (!selectedBoatId.value) return undefined
  const id = Number(selectedBoatId.value)
  return key === 'maintenance'
    ? routes.csv.exportMaintenance(id)
    : key === 'fuelLogs'
      ? routes.csv.exportFuelLogs(id)
      : routes.csv.exportNavigationLogs(id)
}

const templateHeaders = MAINTENANCE_CSV_HEADERS.join(';')

const boatOptions = computed(() => props.boats.map((b) => ({ value: String(b.id), label: b.name })))

const typeOptions = computed(() => [
  { value: 'maintenance', label: t('settings.import.types.maintenance') },
])

function handlePreview() {
  if (!selectedBoatId.value || !fileInput.value?.files?.[0]) return
  const form = new FormData()
  form.append('type', selectedType.value)
  form.append('boatId', String(selectedBoatId.value))
  form.append('file', fileInput.value.files[0])
  isSubmitting.value = true
  router.post(routes.csv.importPreview(), form, {
    onFinish: () => {
      isSubmitting.value = false
    },
  })
}

function handleConfirm() {
  if (!props.preview) return
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
  <div class="space-y-8">
    <div class="flex items-center justify-between">
      <BaseHeading level="2">{{ t('settings.import.title') }}</BaseHeading>
      <button
        type="button"
        class="rounded-full border border-border px-2.5 py-0.5 text-xs text-fg-muted hover:bg-surface-muted hover:text-fg"
        @click="showHelpModal = true"
      >
        {{ t('settings.import.help.openButton') }}
      </button>
    </div>

    <!-- Export section -->
    <BaseCard>
      <BaseHeading level="3" class="mb-4">{{ t('settings.import.exportSection') }}</BaseHeading>
      <div class="mb-4">
        <BaseSelect
          v-model="selectedBoatId"
          :label="t('settings.import.exportBoatLabel')"
          :options="boatOptions"
          allow-empty
          :placeholder="t('settings.import.boatPlaceholder')"
        />
        <p v-if="boats.length === 0" class="mt-2 text-sm text-fg-muted">
          {{ t('settings.import.noBoats') }}
        </p>
      </div>
      <div class="flex flex-wrap gap-3">
        <a
          v-for="{ key, label } in [
            { key: 'maintenance', label: t('settings.import.exportMaintenance') },
            { key: 'fuelLogs', label: t('settings.import.exportFuelLogs') },
            { key: 'navigationLogs', label: t('settings.import.exportNavigationLogs') },
          ]"
          :key="key"
          :href="getExportHref(key)"
          :class="[
            'inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors',
            selectedBoatId ? 'text-fg hover:bg-surface-muted' : 'pointer-events-none opacity-40',
          ]"
        >
          {{ label }}
        </a>
      </div>
    </BaseCard>

    <!-- Import section -->
    <BaseCard>
      <BaseHeading level="3" class="mb-4">{{ t('settings.import.importSection') }}</BaseHeading>

      <div v-if="!preview" class="space-y-4">
        <BaseSelect
          v-model="selectedBoatId"
          :label="t('settings.import.boatLabel')"
          :options="boatOptions"
          allow-empty
          :placeholder="t('settings.import.boatPlaceholder')"
        />

        <BaseSelect
          v-model="selectedType"
          :label="t('settings.import.typeLabel')"
          :options="typeOptions"
        />

        <div>
          <label class="mb-1 block text-sm font-medium text-fg">
            {{ t('settings.import.fileLabel') }}
          </label>
          <input
            ref="fileInput"
            type="file"
            accept=".csv"
            class="block w-full text-sm text-fg-muted file:mr-4 file:rounded-lg file:border-0 file:bg-brand/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand hover:file:bg-brand/20"
          />
          <p class="mt-1 text-xs text-fg-muted">{{ t('settings.import.fileHint') }}</p>
          <p class="mt-1 text-xs text-fg-muted">
            {{ t('settings.import.templateHint', { headers: templateHeaders }) }}
          </p>
        </div>

        <div class="flex justify-end">
          <BaseButton
            type="button"
            variant="primary"
            :disabled="!selectedBoatId || isSubmitting"
            @click="handlePreview"
          >
            {{ t('settings.import.previewButton') }}
          </BaseButton>
        </div>
      </div>

      <!-- Preview result -->
      <div v-else class="space-y-4">
        <div class="flex items-center justify-between">
          <p class="text-sm text-fg-muted">
            {{
              t('settings.import.previewSummary', {
                valid: String(preview.validRows),
                total: String(preview.totalRows),
              })
            }}
            — <strong>{{ preview.boatName }}</strong>
          </p>
          <span class="text-xs text-fg-muted">
            {{ t('settings.import.previewErrors', { count: String(preview.invalidRows) }) }}
          </span>
        </div>

        <div class="overflow-x-auto rounded-lg border border-border">
          <table class="w-full text-sm">
            <thead class="bg-surface-muted text-left text-xs font-medium text-fg-muted">
              <tr>
                <th class="px-3 py-2">{{ t('settings.import.previewColumns.line') }}</th>
                <th class="px-3 py-2">{{ t('settings.import.previewColumns.date') }}</th>
                <th class="px-3 py-2">{{ t('settings.import.previewColumns.title') }}</th>
                <th class="px-3 py-2">{{ t('settings.import.previewColumns.subject') }}</th>
                <th class="px-3 py-2">{{ t('settings.import.previewColumns.status') }}</th>
                <th class="px-3 py-2">{{ t('settings.import.previewColumns.errors') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="row in preview.rows"
                :key="row.line"
                :class="row.errors.length === 0 ? 'bg-surface' : 'bg-red-50 dark:bg-red-950/20'"
              >
                <td class="px-3 py-2 text-fg-muted">{{ row.line }}</td>
                <td class="px-3 py-2">{{ row.raw['date'] ?? '' }}</td>
                <td class="max-w-[200px] truncate px-3 py-2">{{ row.raw['title'] ?? '' }}</td>
                <td class="px-3 py-2">{{ row.raw['subject'] ?? '' }}</td>
                <td class="px-3 py-2">
                  <span
                    :class="[
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      row.errors.length === 0
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                    ]"
                  >
                    {{
                      row.errors.length === 0
                        ? t('settings.import.rowValid')
                        : t('settings.import.rowInvalid')
                    }}
                  </span>
                </td>
                <td class="px-3 py-2 text-xs text-red-600 dark:text-red-400">
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
    </BaseCard>

    <CsvHelpModal v-model:open="showHelpModal" />
  </div>
</template>
