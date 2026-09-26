<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import type { DashboardBoatSummary } from '#shared/types/dashboard'
import { useT } from '~/composables/use_t'
import { propulsionLabel } from '~/utils/boat_enum_labels'

const { t } = useT()

defineProps<{ boat: DashboardBoatSummary }>()
</script>

<template>
  <!-- Repli carte mobile d'une ligne « Vos bateaux » (#493, #828) : mêmes
       données que la table, hiérarchisées — le nom et la propulsion priment,
       les compteurs d'équipement suivent sur une ligne. -->
  <Link
    :href="`/boats/${boat.id}`"
    data-testid="dashboard-boat-card"
    class="block space-y-2 rounded-lg border border-border bg-surface-elevated p-4 transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
  >
    <div class="flex items-center justify-between gap-3">
      <p class="truncate font-semibold text-fg">{{ boat.name }}</p>
      <BaseBadge v-if="propulsionLabel(t, boat.propulsionType)" variant="neutral" class="shrink-0">
        {{ propulsionLabel(t, boat.propulsionType) }}
      </BaseBadge>
    </div>
    <p class="text-sm text-fg-muted">
      {{ t('dashboard.yourBoats.columns.engines') }} {{ boat.enginesCount }}
      ·
      {{ t('dashboard.yourBoats.columns.sails') }} {{ boat.sailsCount }}
      ·
      {{ t('dashboard.yourBoats.columns.rig') }}
      {{ boat.hasRig ? t('common.yes') : t('common.no') }}
    </p>
  </Link>
</template>
