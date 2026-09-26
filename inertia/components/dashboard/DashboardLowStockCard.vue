<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseSkeleton from '~/components/base/BaseSkeleton.vue'
import type { DashboardLowStockPart, DashboardLowStockParts } from '#shared/types/dashboard'
import { useT } from '~/composables/use_t'
import { engineKindLabel } from '~/utils/boat_enum_labels'
import { wearStateVariant } from '~/utils/status_variants'

/** `undefined` = prop différée pas encore arrivée (squelette). */
defineProps<{ lowStock: DashboardLowStockParts | undefined }>()

const { t } = useT()

/** Marque + modèle du moteur, sinon son type traduit (#472). */
function engineLabel(part: DashboardLowStockPart): string {
  const identity = [part.engineBrand, part.engineModel].filter(Boolean).join(' ').trim()
  return identity || engineKindLabel(t, part.engineKind) || part.engineKind
}
</script>

<template>
  <!-- Widget « Pièces manquantes » (galerie) : pièces moteur de toute la flotte
       sous leur seuil d'alerte ou à remplacer, ruptures d'abord. -->
  <BaseCard>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 class="text-sm font-semibold text-fg">{{ t('dashboard.lowStock.title') }}</h2>
        <Link
          href="/spare-parts"
          data-testid="dashboard-low-stock-view-all"
          class="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline"
        >
          {{ t('dashboard.lowStock.viewAll') }}
        </Link>
      </div>
      <div v-if="lowStock && lowStock.total > 0" class="mt-2 flex flex-wrap gap-1.5">
        <BaseBadge
          v-if="lowStock.lowStockCount > 0"
          variant="danger"
          data-testid="dashboard-low-stock-chip-stock"
        >
          {{ t('dashboard.lowStock.lowStockChip', { count: String(lowStock.lowStockCount) }) }}
        </BaseBadge>
        <BaseBadge
          v-if="lowStock.toReplaceCount > 0"
          variant="warning"
          data-testid="dashboard-low-stock-chip-replace"
        >
          {{ t('dashboard.lowStock.toReplaceChip', { count: String(lowStock.toReplaceCount) }) }}
        </BaseBadge>
      </div>
    </template>

    <div v-if="lowStock === undefined" class="space-y-3" data-testid="dashboard-low-stock-skeleton">
      <BaseSkeleton v-for="i in 3" :key="i" height-class="h-10" />
    </div>

    <p
      v-else-if="lowStock.items.length === 0"
      class="text-sm text-fg-muted"
      data-testid="dashboard-low-stock-empty"
    >
      {{ t('dashboard.lowStock.empty') }}
    </p>

    <ul v-else class="-mx-2 space-y-1">
      <li v-for="part in lowStock.items" :key="part.id">
        <Link
          :href="`/boats/${part.boatId}/engines/${part.engineId}?tab=parts`"
          data-testid="dashboard-low-stock-row"
          :data-reason="part.reason"
          :aria-label="
            t('dashboard.lowStock.open', { part: part.designation, boat: part.boatName })
          "
          class="flex min-h-11 items-start justify-between gap-3 rounded-(--radius-control) px-2 py-2 transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <span class="min-w-0">
            <span class="block truncate text-sm text-fg">
              <span class="font-semibold">{{ part.designation }}</span>
              <span v-if="part.reference" class="text-fg-muted"> · {{ part.reference }}</span>
            </span>
            <span class="mt-0.5 block truncate text-xs text-fg-subtle">
              {{ part.boatName }} · {{ engineLabel(part) }}
            </span>
          </span>
          <BaseBadge
            v-if="part.reason === 'low_stock'"
            variant="danger"
            class="shrink-0"
            data-testid="dashboard-low-stock-badge"
          >
            {{
              t('dashboard.lowStock.stock', {
                stock: String(part.stock ?? 0),
                min: String(part.minStockAlert ?? 0),
              })
            }}
          </BaseBadge>
          <BaseBadge
            v-else
            :variant="wearStateVariant(part.wearState ?? '')"
            class="shrink-0"
            data-testid="dashboard-low-stock-badge"
          >
            {{ t(`boats.options.partWearState.${part.wearState}`) }}
          </BaseBadge>
        </Link>
      </li>
    </ul>

    <template v-if="lowStock && lowStock.total > lowStock.items.length" #footer>
      <p class="text-xs text-fg-subtle" data-testid="dashboard-low-stock-more">
        {{
          t('dashboard.lowStock.more', { count: String(lowStock.total - lowStock.items.length) })
        }}
      </p>
    </template>
  </BaseCard>
</template>
