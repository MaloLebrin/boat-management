<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import { SPARE_PART_CATALOG_INDEX } from '#shared/constants/spare_parts/spare_parts_content'
import type { RepairCartItemRow } from '#shared/types/spare_parts'
import { useT } from '~/composables/use_t'

const props = defineProps<{
  cartItems: RepairCartItemRow[]
  canManage: boolean
  boatId: number
  engineId: number
}>()

const { t } = useT()

const baseUrl = computed(() => `/boats/${props.boatId}/engines/${props.engineId}/spare-parts/cart`)

function entryFor(item: RepairCartItemRow) {
  return SPARE_PART_CATALOG_INDEX.get(item.partKey)
}

function updateQuantity(item: RepairCartItemRow, delta: number) {
  const quantity = item.quantity + delta
  if (quantity < 1 || quantity > 99) return
  router.patch(`${baseUrl.value}/${item.id}`, { quantity }, { preserveScroll: true })
}

function updateReference(item: RepairCartItemRow, event: Event) {
  const value = (event.target as HTMLInputElement).value.trim()
  if ((item.reference ?? '') === value) return
  router.patch(
    `${baseUrl.value}/${item.id}`,
    { reference: value === '' ? null : value },
    { preserveScroll: true }
  )
}

function removeItem(item: RepairCartItemRow) {
  router.delete(`${baseUrl.value}/${item.id}`, { preserveScroll: true })
}
</script>

<template>
  <BaseCard padded>
    <div class="flex items-start justify-between gap-4">
      <div>
        <h2 class="text-lg font-semibold text-fg">{{ t('parts.cart.title') }}</h2>
        <p class="mt-1 text-sm text-fg-muted">{{ t('parts.cart.intro') }}</p>
      </div>
      <BaseButton
        v-if="cartItems.length > 0"
        variant="secondary"
        size="sm"
        :href="`${baseUrl}/export`"
        external-href
      >
        {{ t('parts.cart.exportCta') }}
      </BaseButton>
    </div>

    <p v-if="cartItems.length === 0" class="mt-4 text-sm text-fg-muted">
      {{ t('parts.cart.empty') }}
    </p>

    <ul v-else class="mt-4 divide-y divide-border">
      <li v-for="item in cartItems" :key="item.id" class="flex flex-wrap items-center gap-3 py-3">
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-fg">
            {{ entryFor(item) ? t(entryFor(item)!.labelKey) : item.partKey }}
          </p>
          <p v-if="entryFor(item)?.catalogName" class="font-mono text-xs text-fg-muted">
            {{ entryFor(item)!.catalogName }}
          </p>
        </div>

        <label class="flex items-center gap-1.5 text-sm text-fg-muted">
          <span class="sr-only">{{ t('parts.cart.referenceLabel') }}</span>
          <input
            type="text"
            :value="item.reference ?? ''"
            :placeholder="t('parts.cart.referencePlaceholder')"
            :disabled="!canManage"
            maxlength="64"
            class="w-40 rounded-lg border border-border bg-surface-elevated px-2 py-1.5 font-mono text-xs text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none"
            @change="updateReference(item, $event)"
          />
        </label>

        <div class="flex items-center gap-1" :aria-label="t('parts.cart.quantityLabel')">
          <BaseButton
            v-if="canManage"
            variant="ghost"
            size="sm"
            :disabled="item.quantity <= 1"
            @click="updateQuantity(item, -1)"
          >
            −
          </BaseButton>
          <span class="w-6 text-center text-sm font-medium text-fg">{{ item.quantity }}</span>
          <BaseButton
            v-if="canManage"
            variant="ghost"
            size="sm"
            :disabled="item.quantity >= 99"
            @click="updateQuantity(item, 1)"
          >
            +
          </BaseButton>
        </div>

        <BaseButton v-if="canManage" variant="ghost" size="sm" @click="removeItem(item)">
          {{ t('parts.cart.remove') }}
        </BaseButton>
      </li>
    </ul>
  </BaseCard>
</template>
