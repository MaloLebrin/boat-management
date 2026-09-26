<script lang="ts">
import DefaultLayout from '~/layouts/default.vue'
export default { layout: DefaultLayout }
</script>

<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import SettingsShell from '~/components/settings/SettingsShell.vue'
import SettingsImportTab from '~/components/settings/tabs/SettingsImportTab.vue'
import { useT } from '~/composables/use_t'
import type { CsvBoatOption, CsvImportPreviewData, CsvImportType } from '#shared/types/csv'

defineProps<{
  boats: CsvBoatOption[]
  preview: CsvImportPreviewData | null
  hasPendingImport: boolean
  canImport: boolean
  initialType: CsvImportType | null
  initialBoatId: number | null
}>()

const { t } = useT()
</script>

<template>
  <Head :title="t('settings.import.title')" />
  <SettingsShell>
    <SettingsImportTab
      :boats="boats"
      :preview="preview"
      :has-pending-import="hasPendingImport"
      :can-import="canImport"
      :initial-type="initialType"
      :initial-boat-id="initialBoatId"
    />
  </SettingsShell>
</template>
