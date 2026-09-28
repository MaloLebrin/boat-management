<script setup lang="ts">
import BaseCard from '~/components/base/BaseCard.vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { DataExportRow, DataExportStatus } from '../../../../shared/types/export'

const props = defineProps<{
  exports: DataExportRow[]
  threshold: number
  retentionDays: number
}>()

const { t } = useT()
const { formatDate, formatDateTime } = useDateFormat()

function typeLabel(type: DataExportRow['type']): string {
  return t(`settings.exports.types.${type}`)
}

function statusVariant(status: DataExportStatus): 'success' | 'warning' | 'neutral' {
  if (status === 'ready') return 'success'
  if (status === 'failed') return 'warning'
  return 'neutral'
}

function statusLabel(status: DataExportStatus): string {
  return t(`settings.exports.status.${status}`)
}

function formatPeriod(row: DataExportRow): string {
  if (!row.period) return '-'
  const { from, to } = row.period
  if (from && to) return `${formatDate(from)} – ${formatDate(to)}`
  if (from) return t('settings.exports.periodFrom', { date: formatDate(from) })
  if (to) return t('settings.exports.periodTo', { date: formatDate(to) })
  return '-'
}
</script>

<template>
  <div>
    <BaseHeading level="2" class="mb-2">{{ t('settings.exports.title') }}</BaseHeading>
    <p class="text-fg-muted mb-6 text-sm">
      {{
        t('settings.exports.description', {
          threshold: String(threshold),
          days: String(retentionDays),
        })
      }}
    </p>

    <BaseEmptyState
      v-if="exports.length === 0"
      :title="t('settings.exports.empty.title')"
      :description="t('settings.exports.empty.description')"
    />

    <template v-else>
      <BaseCard class="overflow-x-auto p-0">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="px-4 py-3 text-left font-medium text-fg-muted">
                {{ t('settings.exports.columns.type') }}
              </th>
              <th class="px-4 py-3 text-left font-medium text-fg-muted">
                {{ t('settings.exports.columns.period') }}
              </th>
              <th class="px-4 py-3 text-left font-medium text-fg-muted">
                {{ t('settings.exports.columns.status') }}
              </th>
              <th class="px-4 py-3 text-left font-medium text-fg-muted">
                {{ t('settings.exports.columns.rows') }}
              </th>
              <th class="px-4 py-3 text-left font-medium text-fg-muted">
                {{ t('settings.exports.columns.createdAt') }}
              </th>
              <th class="px-4 py-3 text-left font-medium text-fg-muted">
                {{ t('settings.exports.columns.expiresAt') }}
              </th>
              <th class="px-4 py-3 text-left font-medium text-fg-muted">
                {{ t('settings.exports.columns.actions') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in exports"
              :key="row.id"
              class="border-b border-border last:border-0 hover:bg-surface-muted"
            >
              <td class="px-4 py-3 font-medium">
                {{ typeLabel(row.type) }}
              </td>
              <td class="px-4 py-3 text-fg-muted whitespace-nowrap">
                {{ formatPeriod(row) }}
              </td>
              <td class="px-4 py-3">
                <BaseBadge :variant="statusVariant(row.status)">
                  {{ statusLabel(row.status) }}
                </BaseBadge>
              </td>
              <td class="px-4 py-3 text-fg-muted">
                {{ row.rowCount ?? '-' }}
              </td>
              <td class="px-4 py-3 text-fg-muted whitespace-nowrap">
                {{ formatDateTime(row.createdAt) }}
              </td>
              <td class="px-4 py-3 text-fg-muted whitespace-nowrap">
                {{ formatDateTime(row.expiresAt) }}
              </td>
              <td class="px-4 py-3">
                <!-- Lien signé vers le fichier : pas une visite Inertia. -->
                <BaseButton
                  v-if="row.downloadUrl"
                  variant="secondary"
                  size="sm"
                  :href="row.downloadUrl"
                  external-href
                >
                  {{ t('settings.exports.download') }}
                </BaseButton>
                <span v-else class="text-fg-muted">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </BaseCard>
    </template>
  </div>
</template>
