<script lang="ts">
import DefaultLayout from '~/layouts/default.vue'
export default { layout: DefaultLayout }
</script>

<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import SettingsShell from '~/components/settings/SettingsShell.vue'
import SettingsExportsTab from '~/components/settings/tabs/SettingsExportsTab.vue'
import { useT } from '~/composables/use_t'
import type { DataExportRow } from '../../../shared/types/export'

defineProps<{
  exports: DataExportRow[]
  threshold: number
  retentionDays: number
}>()

const { t } = useT()
</script>

<template>
  <Head :title="t('settings.exports.title')" />
  <SettingsShell>
    <SettingsExportsTab :exports="exports" :threshold="threshold" :retention-days="retentionDays" />
  </SettingsShell>
</template>
