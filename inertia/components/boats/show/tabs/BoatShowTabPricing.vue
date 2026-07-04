<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import { computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/use_t'
import type { BoatShowDetail } from '~/types/boat_show'
import type { BoatPricingRow } from '../../../../../shared/types/boat_pricing'

const props = defineProps<{
  boat: BoatShowDetail
  pricing: BoatPricingRow | null
  canManage: boolean
}>()

const { t } = useT()

const form = useForm({
  baseDailyPrice: String(props.pricing?.baseDailyPrice ?? ''),
  baseWeeklyPrice:
    props.pricing?.baseWeeklyPrice != null ? String(props.pricing.baseWeeklyPrice) : '',
  depositAmount: props.pricing?.depositAmount != null ? String(props.pricing.depositAmount) : '',
  minDays: props.pricing?.minDays != null ? String(props.pricing.minDays) : '',
  maxDays: props.pricing?.maxDays != null ? String(props.pricing.maxDays) : '',
  currency: props.pricing?.currency ?? 'EUR',
})

const currencyOptions = [
  { label: 'EUR', value: 'EUR' },
  { label: 'USD', value: 'USD' },
  { label: 'GBP', value: 'GBP' },
  { label: 'CHF', value: 'CHF' },
]

const hasPricing = computed(() => props.pricing !== null)

function formatAmount(value: number | null, currency: string): string {
  if (value === null) return '—'
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(value)
}

function submit() {
  form.put(`/boats/${props.boat.id}/pricing`, {
    preserveScroll: true,
  })
}
</script>

<template>
  <div class="flex flex-col lg:flex-row gap-6">
    <!-- Left column: form or read-only display -->
    <div class="flex-1 space-y-6">
      <BaseCard padded>
        <template #header>
          <p class="text-sm font-semibold text-fg">{{ t('boats.pricing.title') }}</p>
        </template>

        <!-- Edit form (canManage=true) -->
        <form v-if="canManage" class="space-y-4" @submit.prevent="submit">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <BaseInput
              v-model="form.baseDailyPrice"
              :label="t('boats.pricing.baseDailyPrice')"
              :errors="form.errors"
              error-key="baseDailyPrice"
              name="baseDailyPrice"
              type="number"
              step="0.01"
              min="0"
              required
            />
            <BaseInput
              v-model="form.baseWeeklyPrice"
              :label="t('boats.pricing.baseWeeklyPrice')"
              :errors="form.errors"
              error-key="baseWeeklyPrice"
              name="baseWeeklyPrice"
              type="number"
              step="0.01"
              min="0"
            />
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <BaseInput
              v-model="form.depositAmount"
              :label="t('boats.pricing.depositAmount')"
              :errors="form.errors"
              error-key="depositAmount"
              name="depositAmount"
              type="number"
              step="0.01"
              min="0"
            />
            <BaseSelect
              v-model="form.currency"
              :label="t('boats.pricing.currency')"
              :options="currencyOptions"
              :errors="form.errors"
              error-key="currency"
              name="currency"
            />
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <BaseInput
              v-model="form.minDays"
              :label="t('boats.pricing.minDays')"
              :errors="form.errors"
              error-key="minDays"
              name="minDays"
              type="number"
              step="1"
              min="1"
            />
            <BaseInput
              v-model="form.maxDays"
              :label="t('boats.pricing.maxDays')"
              :errors="form.errors"
              error-key="maxDays"
              name="maxDays"
              type="number"
              step="1"
              min="1"
            />
          </div>

          <div class="flex justify-end">
            <BaseButton type="submit" variant="primary" size="sm" :disabled="form.processing">
              {{ t('boats.pricing.save') }}
            </BaseButton>
          </div>
        </form>

        <!-- Read-only display (canManage=false) -->
        <template v-else>
          <div v-if="hasPricing && pricing" class="space-y-4">
            <dl class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt class="text-fg-muted">{{ t('boats.pricing.baseDailyPrice') }}</dt>
                <dd class="font-semibold text-fg">
                  {{ formatAmount(pricing.baseDailyPrice, pricing.currency) }}
                  <span class="text-fg-muted font-normal">{{ t('boats.pricing.perDay') }}</span>
                </dd>
              </div>
              <div>
                <dt class="text-fg-muted">{{ t('boats.pricing.baseWeeklyPrice') }}</dt>
                <dd class="font-semibold text-fg">
                  {{ formatAmount(pricing.baseWeeklyPrice, pricing.currency) }}
                  <span v-if="pricing.baseWeeklyPrice" class="text-fg-muted font-normal">
                    {{ t('boats.pricing.perWeek') }}
                  </span>
                </dd>
              </div>
              <div>
                <dt class="text-fg-muted">{{ t('boats.pricing.depositAmount') }}</dt>
                <dd class="font-semibold text-fg">
                  {{ formatAmount(pricing.depositAmount, pricing.currency) }}
                </dd>
              </div>
              <div>
                <dt class="text-fg-muted">{{ t('boats.pricing.currency') }}</dt>
                <dd class="font-semibold text-fg">{{ pricing.currency }}</dd>
              </div>
              <div>
                <dt class="text-fg-muted">{{ t('boats.pricing.minDays') }}</dt>
                <dd class="font-semibold text-fg">{{ pricing.minDays ?? '—' }}</dd>
              </div>
              <div>
                <dt class="text-fg-muted">{{ t('boats.pricing.maxDays') }}</dt>
                <dd class="font-semibold text-fg">{{ pricing.maxDays ?? '—' }}</dd>
              </div>
            </dl>
          </div>
          <p v-else class="text-sm text-fg-muted">{{ t('boats.pricing.noPricing') }}</p>
          <p class="mt-4 text-xs text-fg-subtle">{{ t('boats.pricing.readOnlyHint') }}</p>
        </template>
      </BaseCard>
    </div>

    <!-- Right column: hint for edit mode -->
    <div v-if="canManage" class="w-full lg:w-64 space-y-6">
      <BaseCard padded>
        <p class="text-sm text-fg-muted">
          {{ t('boats.pricing.editHint') }}
        </p>
      </BaseCard>
    </div>
  </div>
</template>
