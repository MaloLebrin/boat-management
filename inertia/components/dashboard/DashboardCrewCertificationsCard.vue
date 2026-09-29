<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseSkeleton from '~/components/base/BaseSkeleton.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useNavigationTitles } from '~/composables/use_navigation_titles'
import { useT } from '~/composables/use_t'
import type { DashboardCrewCertifications } from '#shared/types/crew'

/** `undefined` = prop différée pas encore arrivée (squelette). */
defineProps<{ crewCertifications: DashboardCrewCertifications | undefined }>()

const { t } = useT()
const { formatDate } = useDateFormat()
const { navigationTitleLabel } = useNavigationTitles()
</script>

<template>
  <!-- Widget « Certifications à renouveler » (galerie, #882) : échues ou
       expirant dans les 60 jours, les plus urgentes d'abord. -->
  <BaseCard>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 class="text-sm font-semibold text-fg">
          {{ t('dashboard.crewCertifications.title') }}
        </h2>
        <Link
          href="/crew"
          data-testid="dashboard-crew-certs-view-all"
          class="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline"
        >
          {{ t('dashboard.crewCertifications.viewAll') }}
        </Link>
      </div>
    </template>

    <div
      v-if="crewCertifications === undefined"
      class="space-y-3"
      data-testid="dashboard-crew-certs-skeleton"
    >
      <BaseSkeleton height-class="h-5" />
      <BaseSkeleton height-class="h-5" />
    </div>

    <p
      v-else-if="crewCertifications.items.length === 0"
      class="text-sm text-fg-muted"
      data-testid="dashboard-crew-certs-empty"
    >
      {{ t('dashboard.crewCertifications.empty') }}
    </p>

    <template v-else>
      <p class="text-xs text-fg-muted" data-testid="dashboard-crew-certs-summary">
        {{
          t('dashboard.crewCertifications.summary', {
            expired: String(crewCertifications.expiredCount),
            soon: String(crewCertifications.expiringSoonCount),
          })
        }}
      </p>
      <ul class="mt-3 divide-y divide-border">
        <li
          v-for="item in crewCertifications.items"
          :key="item.certificationId"
          class="flex items-start justify-between gap-3 py-2 text-sm"
          data-testid="dashboard-crew-certs-item"
        >
          <div class="min-w-0">
            <p class="truncate font-medium text-fg">{{ item.crewMemberName }}</p>
            <p class="text-xs text-fg-muted">
              {{ navigationTitleLabel(item.type) }} · {{ formatDate(item.expiresAt) }}
            </p>
          </div>
          <BaseBadge :variant="item.status === 'expired' ? 'danger' : 'warning'" class="shrink-0">
            {{
              item.status === 'expired'
                ? t('crew.certStatus.expiredSince', { days: String(-item.expiresInDays) })
                : t('crew.certStatus.expiresSoon', { days: String(item.expiresInDays) })
            }}
          </BaseBadge>
        </li>
      </ul>
    </template>
  </BaseCard>
</template>
