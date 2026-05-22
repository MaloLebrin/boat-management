<script setup lang="ts">
import BaseCard from '~/components/base/BaseCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { useT } from '~/composables/useT'

const { t } = useT()
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
              {{ t('settings.billing.freePlan') }}
            </span>
          </div>
        </template>
        <div class="space-y-4">
          <p class="text-sm text-fg-muted">{{ t('settings.billing.freeDescription') }}</p>
          <ul class="space-y-2 text-sm text-fg-muted">
            <li class="flex items-center gap-2">
              <span class="text-green-600">&#10003;</span>
              {{ t('settings.billing.features.upTo3Boats') }}
            </li>
            <li class="flex items-center gap-2">
              <span class="text-green-600">&#10003;</span>
              {{ t('settings.billing.features.maintenanceHistory') }}
            </li>
            <li class="flex items-center gap-2">
              <span class="text-fg-muted">&#10007;</span>
              {{ t('settings.billing.features.aiSuggestions') }}
            </li>
          </ul>
        </div>
        <template #footer>
          <BaseButton variant="primary" disabled>
            {{ t('settings.billing.upgradePro') }}
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
