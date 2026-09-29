<script setup lang="ts">
import BaseBadge from '~/components/base/BaseBadge.vue'
import { useNavigationTitles } from '~/composables/use_navigation_titles'
import { useT } from '~/composables/use_t'
import type { CrewCertificationRow } from '../../../shared/types/crew'

defineProps<{
  certification: CrewCertificationRow
}>()

const { t } = useT()
const { navigationTitleLabel } = useNavigationTitles()
</script>

<template>
  <!-- État calculé côté serveur par `crewCertificationStatus` (#882) : même
       fenêtre de 60 jours que les alertes et le widget du tableau de bord. -->
  <span class="inline-flex flex-wrap items-center gap-1" data-testid="crew-cert-badge">
    <span class="text-xs font-medium text-fg">
      {{ navigationTitleLabel(certification.type) }}
    </span>
    <BaseBadge v-if="certification.status === 'expired'" variant="danger">
      {{
        certification.expiresInDays !== null
          ? t('crew.certStatus.expiredSince', { days: String(-certification.expiresInDays) })
          : t('crew.certStatus.expired')
      }}
    </BaseBadge>
    <BaseBadge v-else-if="certification.status === 'expiring_soon'" variant="warning">
      {{ t('crew.certStatus.expiresSoon', { days: String(certification.expiresInDays) }) }}
    </BaseBadge>
    <BaseBadge v-else-if="certification.status === 'valid'" variant="success">
      {{ t('crew.certStatus.valid') }}
    </BaseBadge>
    <span v-if="certification.referenceNumber" class="text-xs text-fg-muted">
      ({{ certification.referenceNumber }})
    </span>
  </span>
</template>
