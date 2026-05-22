<script setup lang="ts">
import BaseCard from '~/components/base/BaseCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { useT } from '~/composables/useT'
import type { PlanTier, QuotaUsage } from '../../../../shared/types/plan'
import { getUpgradeTier } from '../../../../shared/types/plan'
import { computed } from 'vue'

const { t } = useT()

const props = defineProps<{
  plan: PlanTier
  quotaUsage: QuotaUsage
}>()

const upgradeTier = computed(() => getUpgradeTier(props.plan))

function formatLimit(limit: number | null): string {
  return limit === null ? t('settings.billing.usage.unlimited') : String(limit)
}

function usagePercent(used: number, limit: number | null): number {
  if (limit === null) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}
</script>

<template>
  <div>
    <BaseHeading level="2" class="mb-6">{{ t('settings.billing.title') }}</BaseHeading>
    <div class="space-y-6">
      <BaseCard>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-fg">{{ t('settings.billing.currentPlan') }}</span>
            <span class="inline-flex items-center rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-brand">
              {{ t(`settings.billing.planName.${plan}`) }}
            </span>
          </div>
        </template>

        <div class="space-y-5">
          <!-- Boats usage -->
          <div>
            <div class="mb-1 flex items-center justify-between text-sm">
              <span class="text-fg">{{ t('settings.billing.usage.boats') }}</span>
              <span class="text-fg-muted">
                {{ quotaUsage.boats.used }}
                {{ t('settings.billing.usage.of') }}
                {{ formatLimit(quotaUsage.boats.limit) }}
              </span>
            </div>
            <div v-if="quotaUsage.boats.limit !== null" class="h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                class="h-full rounded-full bg-brand transition-all"
                :class="{ 'bg-red-500': usagePercent(quotaUsage.boats.used, quotaUsage.boats.limit) >= 100 }"
                :style="{ width: `${usagePercent(quotaUsage.boats.used, quotaUsage.boats.limit)}%` }"
              />
            </div>
          </div>

          <!-- Members usage -->
          <div>
            <div class="mb-1 flex items-center justify-between text-sm">
              <span class="text-fg">{{ t('settings.billing.usage.members') }}</span>
              <span class="text-fg-muted">
                {{ quotaUsage.members.used }}
                {{ t('settings.billing.usage.of') }}
                {{ formatLimit(quotaUsage.members.limit) }}
              </span>
            </div>
            <div v-if="quotaUsage.members.limit !== null" class="h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                class="h-full rounded-full bg-brand transition-all"
                :class="{ 'bg-red-500': usagePercent(quotaUsage.members.used, quotaUsage.members.limit) >= 100 }"
                :style="{ width: `${usagePercent(quotaUsage.members.used, quotaUsage.members.limit)}%` }"
              />
            </div>
          </div>

          <!-- Features -->
          <ul class="space-y-2 text-sm">
            <li class="flex items-center gap-2" :class="quotaUsage.canUseAI ? 'text-fg' : 'text-fg-muted'">
              <span :class="quotaUsage.canUseAI ? 'text-green-600' : 'text-fg-muted'">
                {{ quotaUsage.canUseAI ? '✓' : '✗' }}
              </span>
              {{ t('settings.billing.features.ai') }}
            </li>
            <li class="flex items-center gap-2" :class="quotaUsage.canExport ? 'text-fg' : 'text-fg-muted'">
              <span :class="quotaUsage.canExport ? 'text-green-600' : 'text-fg-muted'">
                {{ quotaUsage.canExport ? '✓' : '✗' }}
              </span>
              {{ t('settings.billing.features.export') }}
            </li>
            <li class="flex items-center gap-2 text-fg">
              <span class="text-green-600">✓</span>
              {{ t('settings.billing.features.maintenanceHistory') }}
            </li>
          </ul>
        </div>

        <template v-if="upgradeTier" #footer>
          <BaseButton variant="primary" disabled>
            {{ t(`settings.billing.upgradeTo.${upgradeTier}`) }}
          </BaseButton>
        </template>
      </BaseCard>

      <BaseCard>
        <template #header>
          <span class="text-sm font-semibold text-fg">{{ t('settings.billing.paymentMethod') }}</span>
        </template>
        <p class="text-sm text-fg-muted">{{ t('settings.billing.noPaymentMethod') }}</p>
        <template #footer>
          <BaseButton variant="secondary" size="sm" disabled>
            {{ t('settings.billing.addCard') }}
          </BaseButton>
        </template>
      </BaseCard>
    </div>
  </div>
</template>
