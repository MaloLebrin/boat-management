<script setup lang="ts">
import { computed } from 'vue'
import { Link } from '@adonisjs/inertia/vue'
import type { DashboardAttentionCounts } from '#shared/types/dashboard'
import { useT } from '~/composables/use_t'

const props = defineProps<{ counts: DashboardAttentionCounts; canViewInvoices: boolean }>()

const { t } = useT()

interface Chip {
  key: 'maintenance' | 'incidents' | 'documents' | 'invoices'
  count: number
  /** Danger dès qu'une partie du compteur est en retard / expirée. */
  danger: boolean
  /** Sans page « flotte » pour les documents : la puce reste un compteur. */
  href: string | null
}

const chips = computed<Chip[]>(() => {
  const c = props.counts
  const all: Chip[] = [
    {
      key: 'maintenance',
      count: c.maintenanceOverdue + c.maintenanceSoon,
      danger: c.maintenanceOverdue > 0,
      href: '/planning',
    },
    { key: 'incidents', count: c.incidentsOpen, danger: false, href: '/navigation/incidents' },
    {
      key: 'documents',
      count: c.documentsExpired + c.documentsExpiring,
      danger: c.documentsExpired > 0,
      href: null,
    },
  ]
  if (props.canViewInvoices) {
    all.push({
      key: 'invoices',
      count: c.invoicesOverdue,
      danger: c.invoicesOverdue > 0,
      href: '/invoices?status=overdue',
    })
  }
  return all.filter((chip) => chip.count > 0)
})

function chipClass(chip: Chip): string {
  return chip.danger
    ? 'bg-danger/10 text-danger ring-1 ring-danger/20'
    : 'bg-surface-muted text-fg-muted ring-1 ring-border'
}
</script>

<!-- Puces de 28 px : la pseudo-zone `pointer-coarse:` (#494) porte la cible à 44 px sous le doigt. -->
<template>
  <div v-if="chips.length" class="flex flex-wrap gap-1.5">
    <component
      :is="chip.href ? Link : 'span'"
      v-for="chip in chips"
      :key="chip.key"
      :href="chip.href ?? undefined"
      :data-testid="`dashboard-attention-chip-${chip.key}`"
      class="relative inline-flex min-h-7 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold pointer-coarse:before:absolute pointer-coarse:before:inset-x-0 pointer-coarse:before:-inset-y-2 pointer-coarse:before:content-['']"
      :class="[chipClass(chip), chip.href ? 'hover:underline' : '']"
    >
      {{ t(`dashboard.attention.chips.${chip.key}`, { count: String(chip.count) }) }}
    </component>
  </div>
</template>
