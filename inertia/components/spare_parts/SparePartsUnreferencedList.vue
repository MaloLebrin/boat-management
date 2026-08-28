<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { computed } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { UNREFERENCED_PARTS } from '#shared/constants/spare_parts/spare_parts_content'
import type { RepairCartItemRow, UnreferencedPartItem } from '#shared/types/spare_parts'
import { useT } from '~/composables/use_t'

const props = defineProps<{
  cartItems: RepairCartItemRow[]
  canManage: boolean
  boatId: number
  engineId: number
}>()

const { t } = useT()

const cartByKey = computed(() => new Map(props.cartItems.map((item) => [item.partKey, item])))

function addToCart(part: UnreferencedPartItem) {
  router.post(
    `/boats/${props.boatId}/engines/${props.engineId}/spare-parts/cart`,
    { partKey: part.key },
    { preserveScroll: true }
  )
}
</script>

<template>
  <div>
    <h2 class="text-lg font-semibold text-fg">{{ t('parts.unreferenced.title') }}</h2>
    <p class="mt-1 text-sm text-fg-muted">{{ t('parts.unreferenced.intro') }}</p>

    <ul class="mt-4 divide-y divide-border rounded-lg border border-border bg-surface">
      <li v-for="part in UNREFERENCED_PARTS" :key="part.key" class="flex items-start gap-4 p-4">
        <div class="min-w-0 flex-1">
          <p class="font-medium text-fg">{{ t(part.labelKey) }}</p>
          <p class="mt-1 text-sm text-fg-muted">{{ t(part.adviceKey) }}</p>
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
  </div>
</template>
