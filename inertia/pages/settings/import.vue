<script lang="ts">
import DefaultLayout from '~/layouts/default.vue'
export default { layout: DefaultLayout }
</script>

<script setup lang="ts">
import SettingsShell from '~/components/settings/SettingsShell.vue'
import SettingsImportTab from '~/components/settings/tabs/SettingsImportTab.vue'
import type { CsvBoatOption, CsvImportPreviewData } from '../../../shared/types/csv'

defineProps<{
  boats: CsvBoatOption[]
  preview: CsvImportPreviewData | null
  hasPendingImport: boolean
}>()
</script>

<template>
  <SettingsShell>
    <SettingsImportTab :boats="boats" :preview="preview" :has-pending-import="hasPendingImport" />
  </SettingsShell>
</template>
