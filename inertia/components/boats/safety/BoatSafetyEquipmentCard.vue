<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { ref } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BoatSafetyEquipmentFields from './BoatSafetyEquipmentFields.vue'
import { useT } from '~/composables/useT'
import type { BoatShowSafetyEquipment } from '~/types/boat_show'

defineProps<{
  boatId: number
  items: BoatShowSafetyEquipment[]
  canManage: boolean
}>()

const { t } = useT()

const isCreateOpen = ref(false)
const editingItem = ref<BoatShowSafetyEquipment | null>(null)

function statusVariant(status: string): 'success' | 'warning' | 'danger' {
  if (status === 'ok') return 'success'
  if (status === 'to_check') return 'warning'
  return 'danger'
}

function formatDate(iso: string | null) {
  if (!iso) return null
  return iso.slice(0, 10)
}

function openEdit(item: BoatShowSafetyEquipment) {
  editingItem.value = item
}

function closeEdit() {
  editingItem.value = null
}
</script>

<template>
  <BaseCard padded>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm font-semibold text-fg">{{ t('boats.safetyEquipment.title') }}</p>
        <BaseButton
          v-if="canManage"
          variant="secondary"
          size="sm"
          type="button"
          :aria-label="t('boats.safetyEquipment.add')"
          @click="isCreateOpen = true"
        >
          {{ t('boats.safetyEquipment.add') }}
        </BaseButton>
      </div>
    </template>

    <div v-if="items.length === 0" class="text-sm text-fg-muted">
      {{ t('boats.safetyEquipment.noItems') }}
    </div>

    <ul v-else class="space-y-3 text-sm">
      <li
        v-for="item in items"
        :key="item.id"
        class="rounded-(--radius-control) border border-border bg-surface-muted/40 p-4"
      >
        <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="truncate text-sm font-semibold text-fg">
                {{ t(`boats.options.safetyEquipmentType.${item.equipmentType}`) }}
              </p>
              <BaseBadge :variant="statusVariant(item.status)">
                {{ t(`boats.options.safetyEquipmentStatus.${item.status}`) }}
              </BaseBadge>
            </div>

            <div class="mt-2 flex flex-wrap gap-2 text-xs text-fg-subtle">
              <span
                v-if="item.quantity !== null"
                class="rounded-full bg-surface-elevated px-2 py-1 ring-1 ring-border"
              >
                {{ t('boats.safetyEquipment.quantity') }}: {{ item.quantity }}
              </span>
              <span
                v-if="formatDate(item.expiryDate)"
                class="rounded-full bg-surface-elevated px-2 py-1 ring-1 ring-border"
              >
                {{ t('boats.safetyEquipment.expiryDate') }}: {{ formatDate(item.expiryDate) }}
              </span>
            </div>

            <p v-if="item.notes" class="mt-2 text-xs text-fg-muted">{{ item.notes }}</p>
          </div>

          <div v-if="canManage" class="flex flex-wrap items-center gap-2 md:justify-end">
            <BaseButton
              variant="ghost"
              size="sm"
              type="button"
              :aria-label="t('boats.safetyEquipment.edit')"
              @click="openEdit(item)"
            >
              {{ t('boats.safetyEquipment.edit') }}
            </BaseButton>
            <Form
              :action="{ url: `/boats/${boatId}/safety-equipment/${item.id}`, method: 'delete' }"
              #default="{ processing }"
              class="inline"
            >
              <BaseButton
                type="submit"
                variant="danger"
                size="sm"
                :disabled="processing"
                :aria-label="t('boats.safetyEquipment.delete')"
              >
                {{ t('boats.safetyEquipment.delete') }}
              </BaseButton>
            </Form>
          </div>
        </div>
      </li>
    </ul>

    <!-- Create Modal -->
    <BaseModal
      v-model:open="isCreateOpen"
      :title="t('boats.safetyEquipment.modal.title')"
      :close-label="t('common.close')"
    >
      <Form
        :action="{ url: `/boats/${boatId}/safety-equipment`, method: 'post' }"
        @success="isCreateOpen = false"
        #default="{ processing, errors }"
      >
        <BoatSafetyEquipmentFields :errors="errors" />
        <div class="flex items-center justify-end gap-2 pt-4">
          <BaseButton variant="ghost" type="button" @click="isCreateOpen = false">
            {{ t('boats.safetyEquipment.modal.cancel') }}
          </BaseButton>
          <BaseButton type="submit" :disabled="processing">
            {{ t('boats.safetyEquipment.modal.submit') }}
          </BaseButton>
        </div>
      </Form>
    </BaseModal>

    <!-- Edit Modal -->
    <BaseModal
      :open="!!editingItem"
      @update:open="(v) => !v && closeEdit()"
      :title="t('boats.safetyEquipment.modal.editTitle')"
      :close-label="t('common.close')"
    >
      <Form
        v-if="editingItem"
        :action="{ url: `/boats/${boatId}/safety-equipment/${editingItem.id}`, method: 'put' }"
        @success="closeEdit()"
        #default="{ processing, errors }"
      >
        <BoatSafetyEquipmentFields
          :errors="errors"
          :equipment-type="editingItem.equipmentType"
          :quantity="editingItem.quantity !== null ? String(editingItem.quantity) : ''"
          :expiry-date="formatDate(editingItem.expiryDate) ?? ''"
          :status="editingItem.status"
          :notes="editingItem.notes ?? ''"
        />
        <div class="flex items-center justify-end gap-2 pt-4">
          <BaseButton variant="ghost" type="button" @click="closeEdit()">
            {{ t('boats.safetyEquipment.modal.cancel') }}
          </BaseButton>
          <BaseButton type="submit" :disabled="processing">
            {{ t('boats.safetyEquipment.modal.submit') }}
          </BaseButton>
        </div>
      </Form>
    </BaseModal>
  </BaseCard>
</template>
