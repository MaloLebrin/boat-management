<script setup lang="ts">
import { ref } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import BaseAlert from '~/components/base/BaseAlert.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import InventoryAdjustModal from '~/components/inventory/InventoryAdjustModal.vue'
import InventoryItemFormModal from '~/components/inventory/InventoryItemFormModal.vue'
import InventoryItemsTable from '~/components/inventory/InventoryItemsTable.vue'
import InventoryToolbar from '~/components/inventory/InventoryToolbar.vue'
import { useT } from '~/composables/use_t'
import type { InventoryItemRow, InventoryPageProps } from '#shared/types/inventory'

/** Inventaire de pièces de l'organisation (#892) — stock central de l'atelier. */
const props = defineProps<InventoryPageProps>()

const { t } = useT()

const formOpen = ref(false)
const editing = ref<InventoryItemRow | null>(null)
const adjusting = ref<InventoryItemRow | null>(null)
const importing = ref(false)

function openCreate() {
  editing.value = null
  formOpen.value = true
}

function openEdit(item: InventoryItemRow) {
  editing.value = item
  formOpen.value = true
}

function importEngineParts() {
  router.post(
    '/inventory/import-engine-parts',
    {},
    {
      preserveScroll: true,
      onStart: () => (importing.value = true),
      onFinish: () => (importing.value = false),
    }
  )
}

const isFiltered = () => props.filters.q !== '' || props.filters.filter !== 'all'
</script>

<template>
  <Head :title="t('inventory.title')" />

  <div class="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
    <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <BaseHeading level="1">{{ t('inventory.title') }}</BaseHeading>
        <p class="mt-1 text-sm text-fg-muted">{{ t('inventory.subtitle') }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <BaseButton variant="secondary" size="sm" href="/inventory/orders">
          {{ t('inventory.ordersLink') }}
        </BaseButton>
        <BaseButton v-if="canManage" size="sm" data-testid="inventory-add" @click="openCreate">
          {{ t('inventory.add') }}
        </BaseButton>
      </div>
    </div>

    <BaseAlert
      v-if="canManage && unlinkedPartsCount > 0"
      variant="info"
      class="mb-6"
      data-testid="inventory-import-banner"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>{{ t('inventory.import.banner', { count: String(unlinkedPartsCount) }) }}</p>
        <BaseButton
          size="sm"
          variant="secondary"
          :disabled="importing"
          data-testid="inventory-import"
          @click="importEngineParts"
        >
          {{ t('inventory.import.action') }}
        </BaseButton>
      </div>
    </BaseAlert>

    <InventoryToolbar :filters="filters" :low-count="lowCount" class="mb-4" />

    <InventoryItemsTable
      v-if="items.length > 0"
      :items="items"
      :can-manage="canManage"
      @adjust="adjusting = $event"
      @edit="openEdit"
    />

    <p v-else-if="isFiltered()" class="py-10 text-center text-sm text-fg-muted">
      {{ t('inventory.list.noMatch') }}
    </p>

    <BaseEmptyState
      v-else
      :title="t('inventory.empty.title')"
      :description="t('inventory.empty.description')"
      :action-label="canManage ? t('inventory.add') : undefined"
      @action="openCreate"
    />

    <InventoryItemFormModal v-model:open="formOpen" :item="editing" :suppliers="suppliers" />
    <InventoryAdjustModal
      :open="adjusting !== null"
      :item="adjusting"
      @update:open="!$event && (adjusting = null)"
    />
  </div>
</template>
