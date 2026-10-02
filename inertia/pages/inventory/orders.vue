<script setup lang="ts">
import { ref } from 'vue'
import { Head } from '@inertiajs/vue3'
import BaseBreadcrumb from '~/components/base/BaseBreadcrumb.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import PurchaseOrderFormModal from '~/components/inventory/PurchaseOrderFormModal.vue'
import PurchaseOrdersList from '~/components/inventory/PurchaseOrdersList.vue'
import ReorderForm from '~/components/inventory/ReorderForm.vue'
import SuppliersPanel from '~/components/inventory/SuppliersPanel.vue'
import { useT } from '~/composables/use_t'
import type { PurchaseOrderRow, PurchaseOrdersPageProps } from '#shared/types/inventory'

/** Bons de commande et fournisseurs de l'inventaire (#892). */
const props = defineProps<PurchaseOrdersPageProps>()

const { t } = useT()

const formOpen = ref(false)
const editing = ref<PurchaseOrderRow | null>(null)

function open(order: PurchaseOrderRow | null) {
  editing.value = order
  formOpen.value = true
}

const breadcrumb = [
  { label: t('inventory.title'), href: '/inventory' },
  { label: t('inventory.orders.title') },
]

const canOrder = () => props.canManage && props.suppliers.length > 0 && props.items.length > 0
</script>

<template>
  <Head :title="t('inventory.orders.title')" />

  <div class="mx-auto w-full max-w-5xl space-y-6 px-6 py-10 sm:px-8">
    <BaseBreadcrumb :items="breadcrumb" />

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <BaseHeading level="1">{{ t('inventory.orders.title') }}</BaseHeading>
        <p class="mt-1 text-sm text-fg-muted">{{ t('inventory.orders.subtitle') }}</p>
      </div>
      <BaseButton v-if="canOrder()" size="sm" data-testid="purchase-order-add" @click="open(null)">
        {{ t('inventory.orders.add') }}
      </BaseButton>
    </div>

    <p v-if="canManage && !canOrder()" class="text-sm text-fg-muted">
      {{ t('inventory.orders.prerequisites') }}
    </p>

    <BaseCard v-if="canOrder()">
      <ReorderForm :suppliers="suppliers" />
    </BaseCard>

    <PurchaseOrdersList
      :orders="orders"
      :can-manage="canManage"
      :can-delete="canDelete"
      @edit="open"
    />

    <SuppliersPanel :suppliers="suppliers" :can-manage="canManage" :can-delete="canDelete" />

    <PurchaseOrderFormModal
      v-model:open="formOpen"
      :order="editing"
      :suppliers="suppliers"
      :items="items"
      :boats="boats"
    />
  </div>
</template>
