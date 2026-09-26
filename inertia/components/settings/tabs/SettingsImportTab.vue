<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import CsvHelpModal from '~/components/settings/CsvHelpModal.vue'
import ImportExportCard from '~/components/settings/import/ImportExportCard.vue'
import ImportPreviewPanel from '~/components/settings/import/ImportPreviewPanel.vue'
import ImportUploadForm from '~/components/settings/import/ImportUploadForm.vue'
import { useSingleBoat } from '~/composables/use_single_boat'
import { useT } from '~/composables/use_t'
import type { CsvBoatOption, CsvImportPreviewData, CsvImportType } from '#shared/types/csv'

const { t } = useT()

const props = withDefaults(
  defineProps<{
    boats: CsvBoatOption[]
    preview: CsvImportPreviewData | null
    hasPendingImport: boolean
    /**
     * Plan Entreprise **et** capability `import.run` (admin seul) — #715. Faux,
     * la page garde ses exports : ils s'arrêtent à `canExport`, ouvert dès le
     * plan Pro et à tous les rôles.
     */
    canImport: boolean
    /**
     * Présélection par `?type=…&boatId=…` — le raccourci « Importer des
     * dépenses » de la page budget arrive ici. Déjà filtrés par le contrôleur.
     */
    initialType?: CsvImportType | null
    initialBoatId?: number | null
  }>(),
  { initialType: null, initialBoatId: null }
)

/** Flotte mono-bateau (#823) : le bateau est retenu d'office, sans sélecteur. */
const { singleBoatId } = useSingleBoat(() => props.boats)
const selectedBoatId = ref<string>(
  props.initialBoatId !== null && props.boats.some((b) => b.id === props.initialBoatId)
    ? String(props.initialBoatId)
    : (singleBoatId.value ?? '')
)
watch(singleBoatId, (boatId) => {
  if (boatId) selectedBoatId.value = boatId
})

const selectedType = ref<CsvImportType>(props.initialType ?? 'maintenance')
const showHelpModal = ref(false)

const boatOptions = computed(() => props.boats.map((b) => ({ value: String(b.id), label: b.name })))
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

    <ImportExportCard
      v-model="selectedBoatId"
      :boats="boats"
      :boat-options="boatOptions"
      :single-boat-id="singleBoatId"
    />

    <BaseCard>
      <BaseHeading level="3" class="mb-4">{{ t('settings.import.importSection') }}</BaseHeading>

      <p v-if="!canImport" class="text-sm text-fg-muted">{{ t('settings.import.restricted') }}</p>

      <ImportUploadForm
        v-else-if="!preview"
        v-model:boat-id="selectedBoatId"
        v-model:type="selectedType"
        :boat-options="boatOptions"
        :single-boat-id="singleBoatId"
      />

      <ImportPreviewPanel v-else :preview="preview" />
    </BaseCard>

    <CsvHelpModal v-model:open="showHelpModal" :type="preview?.type ?? selectedType" />
  </div>
</template>
