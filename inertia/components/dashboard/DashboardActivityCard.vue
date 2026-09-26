<script setup lang="ts">
import BaseCard from '~/components/base/BaseCard.vue'
import BaseSkeleton from '~/components/base/BaseSkeleton.vue'
import DashboardActivityRow from '~/components/dashboard/DashboardActivityRow.vue'
import type { DashboardActivityItem } from '#shared/types/dashboard'
import { useT } from '~/composables/use_t'

/** `undefined` = prop différée pas encore arrivée (squelette), `[]` = rien à montrer. */
defineProps<{ items: DashboardActivityItem[] | undefined }>()

const { t } = useT()
</script>

<template>
  <BaseCard>
    <template #header>
      <h2 class="text-sm font-semibold text-fg">{{ t('dashboard.activity.title') }}</h2>
    </template>

    <div v-if="items === undefined" class="space-y-3" data-testid="dashboard-activity-skeleton">
      <BaseSkeleton v-for="i in 4" :key="i" height-class="h-10" />
    </div>

    <p v-else-if="items.length === 0" class="text-sm text-fg-muted">
      {{ t('dashboard.activity.empty') }}
    </p>

    <ul v-else class="-mx-2 space-y-1">
      <DashboardActivityRow v-for="item in items" :key="item.key" :item="item" />
    </ul>
  </BaseCard>
</template>
