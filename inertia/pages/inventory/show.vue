<script setup lang="ts">
import { computed, ref } from 'vue'
import { Head } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseConfirmModal from '~/components/base/BaseConfirmModal.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseStatCard from '~/components/base/BaseStatCard.vue'
import InventoryAdjustModal from '~/components/inventory/InventoryAdjustModal.vue'
import InventoryItemFormModal from '~/components/inventory/InventoryItemFormModal.vue'
import InventoryMovementsList from '~/components/inventory/InventoryMovementsList.vue'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import { deleteVisit } from '~/utils/delete_visit'
import type { InventoryItemShowProps } from '#shared/types/inventory'

/** Fiche d'un article du stock central (#892) : chiffres, pièces reliées, journal. */
const props = defineProps<InventoryItemShowProps>()

const { t } = useT()
const { formatNumber, formatCurrency } = useNumberFormat()

const editOpen = ref(false)
const adjustOpen = ref(false)
const deleteOpen = ref(false)

const unitLabel = computed(() => t(`inventory.units.${props.item.unit}`))
const breadcrumb = computed(() => [
  { label: t('inventory.title'), href: '/inventory' },
  { label: props.item.name },
])

function destroy() {
  deleteVisit(`/inventory/${props.item.id}`)
}
</script>

<template>
  <Head :title="item.name" />

  <div class="mx-auto w-full max-w-5xl space-y-6 px-6 py-10 sm:px-8">
    <BaseBreadcrumb :items="breadcrumb" />

    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <BaseHeading level="1">{{ item.name }}</BaseHeading>
          <BaseBadge v-if="item.isLow" variant="danger">{{ t('inventory.show.low') }}</BaseBadge>
        </div>
        <p class="mt-1 text-sm text-fg-muted">
          <template v-if="item.reference">{{ item.reference }} · </template>
          {{ item.location ?? t('inventory.show.noLocation') }}
          <template v-if="item.supplierName"> · {{ item.supplierName }}</template>
        </p>
      </div>
      <div v-if="canManage" class="flex flex-wrap gap-2">
        <BaseButton size="sm" data-testid="inventory-show-adjust" @click="adjustOpen = true">
          {{ t('inventory.list.count') }}
        </BaseButton>
        <BaseButton size="sm" variant="secondary" @click="editOpen = true">
          {{ t('inventory.list.edit') }}
        </BaseButton>
        <BaseButton v-if="canDelete" size="sm" variant="ghost" @click="deleteOpen = true">
          <span class="text-danger">{{ t('inventory.show.delete') }}</span>
        </BaseButton>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
      <BaseStatCard
        :label="t('inventory.fields.quantity')"
        :value="`${formatNumber(item.quantity)} ${unitLabel}`"
        :tone="item.isLow ? 'warning' : 'neutral'"
      />
      <BaseStatCard
        :label="t('inventory.fields.minQuantity')"
        :value="item.minQuantity === null ? '—' : formatNumber(item.minQuantity)"
      />
      <BaseStatCard
        :label="t('inventory.fields.averageCost')"
        :value="item.averageCost === null ? '—' : formatCurrency(item.averageCost)"
      />
      <BaseStatCard
        :label="t('inventory.fields.stockValue')"
        :value="item.stockValue === null ? '—' : formatCurrency(item.stockValue)"
      />
    </div>

    <p v-if="item.notes" class="whitespace-pre-wrap text-sm text-fg-muted">{{ item.notes }}</p>

    <BaseCard>
      <template #header>
        <h2 class="text-sm font-semibold text-fg">{{ t('inventory.show.linkedParts') }}</h2>
      </template>
      <p v-if="linkedParts.length === 0" class="text-sm text-fg-muted">
        {{ t('inventory.show.noLinkedParts') }}
      </p>
      <ul v-else class="space-y-1 text-sm">
        <li v-for="part in linkedParts" :key="part.id">
          <Link
            :href="`/boats/${part.boatId}/engines/${part.engineId}/parts/${part.id}`"
            class="text-brand hover:underline"
          >
            {{ part.designation }}
          </Link>
          <span class="text-fg-muted"> · {{ part.boatName }}</span>
        </li>
      </ul>
    </BaseCard>

    <BaseCard>
      <template #header>
        <h2 class="text-sm font-semibold text-fg">{{ t('inventory.movements.title') }}</h2>
      </template>
      <InventoryMovementsList :movements="movements" :unit="item.unit" />
    </BaseCard>

    <InventoryItemFormModal v-model:open="editOpen" :item="item" :suppliers="suppliers" />
    <InventoryAdjustModal v-model:open="adjustOpen" :item="item" />
    <BaseConfirmModal
      :open="deleteOpen"
      :title="t('inventory.show.deleteTitle')"
      :message="t('inventory.show.deleteMessage')"
      :confirm-label="t('inventory.show.delete')"
      :cancel-label="t('common.cancel')"
      @update:open="deleteOpen = $event"
      @confirm="destroy"
    />
  </div>
</template>
