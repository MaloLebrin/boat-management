<script setup lang="ts">
import ExportDialog from '~/components/exports/ExportDialog.vue'
import { useT } from '~/composables/use_t'

/** Export CSV des fiches clients (#879) : période sur la date de création. */
const { t } = useT()
</script>

<template>
  <ExportDialog
    :label="t('common.exports.clients.button')"
    :title="t('common.exports.clients.title')"
    base-url="/clients/export.csv"
  >
    <p class="text-sm text-fg-muted">{{ t('common.exports.clients.periodHint') }}</p>
    <p class="text-sm text-fg-muted">{{ t('common.exports.clients.anonymizedHint') }}</p>
  </ExportDialog>
</template>
