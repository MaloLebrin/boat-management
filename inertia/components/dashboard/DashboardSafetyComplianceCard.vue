<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseSkeleton from '~/components/base/BaseSkeleton.vue'
import type { DashboardSafetyCompliance } from '#shared/types/dashboard'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'

/** `undefined` = prop différée pas encore arrivée (squelette). */
defineProps<{ safetyCompliance: DashboardSafetyCompliance | undefined }>()

const { t } = useT()
const { formatDate } = useDateFormat()
</script>

<template>
  <!-- Widget « Conformité sécurité » (galerie) : rapport Division 240 de chaque
       bateau résumé en flotte, les pires écarts d'abord. Informatif : rien ne se
       bloque sur son contenu (#582). -->
  <BaseCard>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 class="text-sm font-semibold text-fg">{{ t('dashboard.safetyCompliance.title') }}</h2>
        <Link
          href="/boats"
          data-testid="dashboard-safety-view-all"
          class="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline"
        >
          {{ t('dashboard.safetyCompliance.viewAll') }}
        </Link>
      </div>
      <p
        v-if="safetyCompliance && safetyCompliance.checked > 0"
        class="mt-1 text-xs font-medium text-fg-muted"
        data-testid="dashboard-safety-summary"
      >
        {{
          t('dashboard.safetyCompliance.summary', {
            compliant: String(safetyCompliance.compliant),
            issues: String(safetyCompliance.withIssues),
          })
        }}
        <template v-if="safetyCompliance.withoutZone > 0">
          ·
          {{
            t('dashboard.safetyCompliance.withoutZone', {
              count: String(safetyCompliance.withoutZone),
            })
          }}
        </template>
      </p>
    </template>

    <div
      v-if="safetyCompliance === undefined"
      class="space-y-3"
      data-testid="dashboard-safety-skeleton"
    >
      <BaseSkeleton v-for="i in 3" :key="i" height-class="h-10" />
    </div>

    <p
      v-else-if="safetyCompliance.checked === 0"
      class="text-sm text-fg-muted"
      data-testid="dashboard-safety-no-zone"
    >
      {{ t('dashboard.safetyCompliance.noZone') }}
    </p>

    <p
      v-else-if="safetyCompliance.items.length === 0"
      class="text-sm text-fg-muted"
      data-testid="dashboard-safety-empty"
    >
      {{ t('dashboard.safetyCompliance.empty') }}
    </p>

    <ul v-else class="-mx-2 space-y-1">
      <li v-for="boat in safetyCompliance.items" :key="boat.boatId">
        <Link
          :href="`/boats/${boat.boatId}?tab=safety`"
          data-testid="dashboard-safety-row"
          :aria-label="t('dashboard.safetyCompliance.open', { boat: boat.boatName })"
          class="flex min-h-11 items-start justify-between gap-3 rounded-(--radius-control) px-2 py-2 transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <span class="min-w-0">
            <span class="block truncate text-sm font-semibold text-fg">{{ boat.boatName }}</span>
            <span class="mt-1 flex flex-wrap items-center gap-1.5">
              <BaseBadge v-if="boat.blockingCount > 0" variant="danger">
                {{
                  t('dashboard.safetyCompliance.blocking', { count: String(boat.blockingCount) })
                }}
              </BaseBadge>
              <BaseBadge v-if="boat.warningCount > 0" variant="warning">
                {{ t('dashboard.safetyCompliance.warning', { count: String(boat.warningCount) }) }}
              </BaseBadge>
            </span>
          </span>
          <span class="shrink-0 text-right">
            <span
              class="block text-sm font-semibold"
              :class="boat.blockingCount > 0 ? 'text-danger' : 'text-warning'"
              data-testid="dashboard-safety-score"
            >
              {{ t('dashboard.safetyCompliance.score', { score: String(boat.score) }) }}
            </span>
            <span v-if="boat.nextDueDate" class="block text-xs text-fg-subtle">
              {{ t('dashboard.safetyCompliance.nextDue', { date: formatDate(boat.nextDueDate) }) }}
            </span>
          </span>
        </Link>
      </li>
    </ul>

    <template
      v-if="safetyCompliance && safetyCompliance.withIssues > safetyCompliance.items.length"
      #footer
    >
      <p class="text-xs text-fg-subtle" data-testid="dashboard-safety-more">
        {{
          t('dashboard.safetyCompliance.more', {
            count: String(safetyCompliance.withIssues - safetyCompliance.items.length),
          })
        }}
      </p>
    </template>
  </BaseCard>
</template>
