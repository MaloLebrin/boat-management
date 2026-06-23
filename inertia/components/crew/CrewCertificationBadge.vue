<script setup lang="ts">
import BaseBadge from '~/components/base/BaseBadge.vue'
import { useT } from '~/composables/use_t'
import type { CrewCertificationRow } from '../../../shared/types/crew'

defineProps<{
  certification: CrewCertificationRow
}>()

const { t } = useT()
</script>

<template>
  <span class="inline-flex items-center gap-1">
    <span class="text-xs font-medium text-fg">
      {{ t(`crew.certTypes.${certification.type}`) }}
    </span>
    <BaseBadge v-if="certification.isExpired" variant="danger">
      {{ t('crew.certStatus.expired') }}
    </BaseBadge>
    <BaseBadge
      v-else-if="certification.expiresInDays !== null && certification.expiresInDays <= 30"
      variant="warning"
    >
      {{ t('crew.certStatus.expiresSoon', { days: String(certification.expiresInDays) }) }}
    </BaseBadge>
    <BaseBadge v-else-if="certification.expiresAt !== null" variant="success">
      {{ t('crew.certStatus.valid') }}
    </BaseBadge>
    <span v-if="certification.referenceNumber" class="text-xs text-fg-muted">
      ({{ certification.referenceNumber }})
    </span>
  </span>
</template>
