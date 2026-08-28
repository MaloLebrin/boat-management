<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { computed } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import type { RepairCartItemRow, SparePartItem } from '#shared/types/spare_parts'
import { useT } from '~/composables/use_t'

const props = defineProps<{
  parts: readonly SparePartItem[]
  cartItems: RepairCartItemRow[]
  canManage: boolean
  boatId: number
  engineId: number
}>()

const { t } = useT()

const cartByKey = computed(() => new Map(props.cartItems.map((item) => [item.partKey, item])))

function addToCart(part: SparePartItem) {
  router.post(
    `/boats/${props.boatId}/engines/${props.engineId}/spare-parts/cart`,
    { partKey: part.key },
    { preserveScroll: true }
  )
}
</script>

<template>
  <ul class="divide-y divide-border rounded-lg border border-border bg-surface">
    <li v-for="part in parts" :key="part.key" class="flex items-start gap-4 p-4">
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p class="font-medium text-fg">{{ t(part.labelKey) }}</p>
          <p class="font-mono text-xs uppercase tracking-wide text-fg-muted">
            {{ part.catalogName }}
          </p>
        </div>
        <p v-if="part.detailKey" class="mt-1 text-sm text-fg-muted">{{ t(part.detailKey) }}</p>
        <p v-if="part.kitKey" class="mt-1 text-sm text-info">{{ t(part.kitKey) }}</p>
        <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted">
          <span v-if="part.priceKey">
            {{ t('parts.assembly.priceLabel', { price: t(part.priceKey) }) }}
          </span>
          <span v-if="part.yamahaFunctionCode" class="font-mono">
            {{ t('parts.assembly.yamahaFunctionCode', { code: part.yamahaFunctionCode }) }}
          </span>
        </div>
      </div>

      <div class="flex shrink-0 flex-col items-end gap-2">
        <BaseBadge v-if="cartByKey.has(part.key)" variant="success">
          {{ t('parts.common.inCart') }} ×{{ cartByKey.get(part.key)!.quantity }}
        </BaseBadge>
        <BaseButton v-if="canManage" variant="secondary" size="sm" @click="addToCart(part)">
          {{ t('parts.common.addToCart') }}
        </BaseButton>
      </div>
    </li>
  </ul>
</template>
