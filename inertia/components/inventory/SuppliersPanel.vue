<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseConfirmModal from '~/components/base/BaseConfirmModal.vue'
import SupplierFormModal from '~/components/inventory/SupplierFormModal.vue'
import { useRowDeleteConfirmation } from '~/composables/use_row_delete_confirmation'
import { useT } from '~/composables/use_t'
import type { SupplierRow } from '#shared/types/inventory'

/** Annuaire des fournisseurs (#892), à côté des bons de commande. */
defineProps<{
  suppliers: SupplierRow[]
  canManage: boolean
  canDelete: boolean
}>()

const { t } = useT()

const formOpen = ref(false)
const editing = ref<SupplierRow | null>(null)
const deletion = useRowDeleteConfirmation<SupplierRow>({
  url: (supplier) => `/inventory/suppliers/${supplier.id}`,
  visit: { preserveScroll: true },
})

function open(supplier: SupplierRow | null) {
  editing.value = supplier
  formOpen.value = true
}
</script>

<template>
  <BaseCard>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-sm font-semibold text-fg">{{ t('inventory.suppliers.title') }}</h2>
        <BaseButton v-if="canManage" size="sm" variant="secondary" @click="open(null)">
          {{ t('inventory.suppliers.add') }}
        </BaseButton>
      </div>
    </template>

    <p v-if="suppliers.length === 0" class="text-sm text-fg-muted">
      {{ t('inventory.suppliers.empty') }}
    </p>
    <ul v-else class="divide-y divide-border">
      <li
        v-for="supplier in suppliers"
        :key="supplier.id"
        class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
        :data-testid="`supplier-${supplier.id}`"
      >
        <div class="min-w-0">
          <p class="font-medium text-fg">{{ supplier.name }}</p>
          <p class="text-xs text-fg-muted">
            {{ [supplier.contactName, supplier.email, supplier.phone].filter(Boolean).join(' · ') }}
            <template v-if="supplier.leadTimeDays !== null">
              ·
              {{ t('inventory.suppliers.leadTime', { days: String(supplier.leadTimeDays) }) }}
            </template>
          </p>
        </div>
        <div class="flex gap-1">
          <BaseButton v-if="canManage" size="sm" variant="ghost" @click="open(supplier)">
            {{ t('inventory.list.edit') }}
          </BaseButton>
          <BaseButton v-if="canDelete" size="sm" variant="ghost" @click="deletion.ask(supplier)">
            <span class="text-danger">{{ t('inventory.suppliers.delete') }}</span>
          </BaseButton>
        </div>
      </li>
    </ul>

    <SupplierFormModal v-model:open="formOpen" :supplier="editing" />
    <BaseConfirmModal
      :open="deletion.isOpen.value"
      :title="t('inventory.suppliers.deleteTitle')"
      :message="t('inventory.suppliers.deleteMessage')"
      :confirm-label="t('inventory.suppliers.delete')"
      :cancel-label="t('common.cancel')"
      @update:open="deletion.release()"
      @confirm="deletion.confirm()"
    />
  </BaseCard>
</template>
