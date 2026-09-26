<script setup lang="ts">
import { computed, ref } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/use_t'
import {
  CSV_IMPORT_EXTNAMES,
  CSV_IMPORT_MAX_FILE_SIZE_MB,
  CSV_IMPORT_MAX_ROWS,
} from '#shared/constants/csv_import'
import { EXPENSE_CSV_HEADERS, MAINTENANCE_CSV_HEADERS, type CsvImportType } from '#shared/types/csv'
import { routes } from '~/utils/routes'

const { t } = useT()

const props = defineProps<{
  boatOptions: { value: string; label: string }[]
  /** Flotte mono-bateau (#823) : le bateau est retenu d'office, sans sélecteur. */
  singleBoatId: string | null
  /** Bateau sélectionné, au format `BaseSelect` (chaîne vide = aucun). */
  boatId: string
  type: CsvImportType
  /** Types ouverts par le plan (dépenses dès Pro, historique en Entreprise). */
  types: readonly CsvImportType[]
}>()

const emit = defineEmits<{
  (e: 'update:boatId', value: string): void
  (e: 'update:type', value: CsvImportType): void
}>()

/**
 * Bornes du fichier, reprises des constantes partagées (#774) : l'aide
 * annonçait « max 5 Mo » sans plafond de lignes, c'est-à-dire une limite que
 * le code n'appliquait pas.
 */
const fileLimits = {
  size: String(CSV_IMPORT_MAX_FILE_SIZE_MB),
  rows: String(CSV_IMPORT_MAX_ROWS),
}

/** `accept` de l'input : `.csv,.xlsx`, dérivé du validateur. */
const acceptedExtensions = CSV_IMPORT_EXTNAMES.map((ext) => `.${ext}`).join(',')

const fileInput = ref<HTMLInputElement | null>(null)
const isSubmitting = ref(false)

const typeOptions = computed(() =>
  props.types.map((type) => ({ value: type, label: t(`settings.import.types.${type}`) }))
)

/** En-têtes modèles du type courant — les alias FR sont détaillés dans l'aide. */
const templateHeaders = computed(() =>
  (props.type === 'expenses' ? EXPENSE_CSV_HEADERS : MAINTENANCE_CSV_HEADERS).join(';')
)

function onTypeChange(value: string | number) {
  if (typeof value === 'string' && (props.types as readonly string[]).includes(value)) {
    emit('update:type', value as CsvImportType)
  }
}

function handlePreview() {
  if (!props.boatId || !fileInput.value?.files?.[0]) return
  const form = new FormData()
  form.append('type', props.type)
  form.append('boatId', props.boatId)
  form.append('file', fileInput.value.files[0])
  isSubmitting.value = true
  router.post(routes.csv.importPreview(), form, {
    onFinish: () => {
      isSubmitting.value = false
    },
  })
}
</script>

<template>
  <div class="space-y-4">
    <BaseSelect
      v-if="!singleBoatId"
      :model-value="boatId"
      :label="t('settings.import.boatLabel')"
      :options="boatOptions"
      allow-empty
      :placeholder="t('settings.import.boatPlaceholder')"
      @update:model-value="$emit('update:boatId', String($event))"
    />

    <BaseSelect
      :model-value="type"
      :label="t('settings.import.typeLabel')"
      :options="typeOptions"
      @update:model-value="onTypeChange"
    />

    <div>
      <label class="mb-1 block text-sm font-medium text-fg">
        {{ t('settings.import.fileLabel') }}
      </label>
      <input
        ref="fileInput"
        type="file"
        :accept="acceptedExtensions"
        class="block w-full text-sm text-fg-muted file:mr-4 file:rounded-lg file:border-0 file:bg-brand/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand hover:file:bg-brand/20"
      />
      <p class="mt-1 text-xs text-fg-muted">
        {{ t('settings.import.fileHint', fileLimits) }}
      </p>
      <p class="mt-1 text-xs text-fg-muted">
        {{ t('settings.import.templateHint', { headers: templateHeaders }) }}
      </p>
    </div>

    <div class="flex justify-end">
      <BaseButton
        type="button"
        variant="primary"
        :disabled="!boatId || isSubmitting"
        @click="handlePreview"
      >
        {{ t('settings.import.previewButton') }}
      </BaseButton>
    </div>
  </div>
</template>
