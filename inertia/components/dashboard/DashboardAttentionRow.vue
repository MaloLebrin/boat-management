<script setup lang="ts">
import { computed } from 'vue'
import { Link } from '@adonisjs/inertia/vue'
import type { DashboardAttentionItem } from '#shared/types/dashboard'
import { useT } from '~/composables/use_t'
import { useDateFormat } from '~/composables/use_date_format'
import { useNumberFormat } from '~/composables/use_number_format'
import { maintenanceSubjectLabel } from '~/utils/boat_enum_labels'

const props = defineProps<{ item: DashboardAttentionItem }>()

const { t } = useT()
const { formatDate } = useDateFormat()
const { formatCurrency } = useNumberFormat()

type PillTone = 'danger' | 'warning' | 'hours'

const PILL_CLASS: Record<PillTone, string> = {
  danger: 'bg-danger/10 text-danger ring-1 ring-danger/20',
  warning: 'bg-warning/10 text-warning ring-1 ring-warning/20',
  hours: 'bg-sky-700/10 text-sky-800 ring-1 ring-sky-700/20',
}

/** Une ligne = un titre (bateau ou client), un libellé, une pastille et un détail daté. */
const view = computed(() => {
  const item = props.item
  switch (item.kind) {
    case 'maintenance':
      return {
        title: item.boatName,
        label: `${item.title} - ${maintenanceSubjectLabel(t, item.subject) ?? item.subject}`,
        pill:
          item.due === 'hours'
            ? { text: t('dashboard.attention.kind.hours'), tone: 'hours' as PillTone }
            : item.due === 'overdue'
              ? { text: t('dashboard.attention.kind.overdue'), tone: 'danger' as PillTone }
              : { text: t('dashboard.attention.kind.dueSoon'), tone: 'warning' as PillTone },
        detail:
          item.due === 'hours'
            ? t('dashboard.attention.detail.dueAtHours', {
                hours: String(item.dueEngineHours ?? 0),
                current: String(item.currentEngineHours ?? 0),
              })
            : t('dashboard.attention.detail.dueAt', {
                date: item.dueAt ? formatDate(item.dueAt) : '—',
              }),
      }
    case 'incident':
      return {
        title: item.boatName,
        label: t(`incidents.type.${item.incidentType}`),
        pill:
          item.status === 'in_progress'
            ? {
                text: t('dashboard.attention.kind.incidentInProgress'),
                tone: 'warning' as PillTone,
              }
            : { text: t('dashboard.attention.kind.incidentOpen'), tone: 'warning' as PillTone },
        detail: t('dashboard.attention.detail.reportedOn', { date: formatDate(item.occurredAt) }),
      }
    case 'document':
      return {
        title: item.boatName,
        label:
          item.documentType === 'other' && item.customTypeLabel
            ? item.customTypeLabel
            : t(`boats.adminDocs.types.${item.documentType}`),
        pill:
          item.status === 'expired'
            ? { text: t('dashboard.attention.kind.documentExpired'), tone: 'danger' as PillTone }
            : { text: t('dashboard.attention.kind.documentExpiring'), tone: 'warning' as PillTone },
        detail:
          item.status === 'expired'
            ? t('dashboard.attention.detail.expiredOn', { date: formatDate(item.expiresAt) })
            : t('dashboard.attention.detail.expiresAt', { date: formatDate(item.expiresAt) }),
      }
    default:
      return {
        title: item.clientName ?? item.number,
        label: t('dashboard.attention.detail.invoice', {
          number: item.number,
          total: formatCurrency(item.total),
        }),
        pill: { text: t('dashboard.attention.kind.invoiceOverdue'), tone: 'danger' as PillTone },
        detail: t('dashboard.attention.detail.invoiceDue', {
          date: item.dueAt ? formatDate(item.dueAt) : '—',
        }),
      }
  }
})
</script>

<template>
  <!-- Toute la ligne est le lien (#473, #828) : planning centré sur la tâche,
       fiche incident, onglet documents du bateau ou liste des factures. -->
  <li>
    <Link
      :href="item.href"
      :aria-label="t('dashboard.attention.open', { title: view.label, boat: view.title })"
      data-testid="dashboard-attention-row"
      :data-kind="item.kind"
      class="block min-h-11 rounded-(--radius-control) border border-border bg-surface-muted/40 p-3 transition-colors hover:border-border-strong hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
            {{ t(`dashboard.attention.type.${item.kind}`) }}
          </p>
          <p class="font-semibold text-fg">{{ view.title }}</p>
          <p class="mt-0.5 text-sm text-fg-muted">{{ view.label }}</p>
        </div>
        <span
          class="shrink-0 rounded-full px-2 py-1 text-xs font-semibold"
          :class="PILL_CLASS[view.pill.tone]"
        >
          {{ view.pill.text }}
        </span>
      </div>
      <p class="mt-2 text-xs text-fg-subtle">{{ view.detail }}</p>
    </Link>
  </li>
</template>
