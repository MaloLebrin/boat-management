<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { computed, ref } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BoatGenericEquipmentFields from './BoatGenericEquipmentFields.vue'
import { useT } from '~/composables/use_t'
import { suggestEquipmentActionType } from '#shared/helpers/equipment_action'
import type { BoatShowGenericEquipment, EquipmentActionPrefill } from '~/types/boat_show'

type GenericCategory = BoatShowGenericEquipment['category']

const props = defineProps<{
  boatId: number
  items: BoatShowGenericEquipment[]
  canManage: boolean
  canManageActions: boolean
}>()

const emit = defineEmits<{
  (e: 'addToActions', payload: EquipmentActionPrefill): void
}>()

const { t } = useT()

function emitAddToActions(item: BoatShowGenericEquipment) {
  emit('addToActions', {
    equipmentType: 'generic',
    equipmentId: item.id,
    label: item.name,
    actionType: suggestEquipmentActionType(item.status),
  })
}

const isCreateOpen = ref(false)
const createCategory = ref<GenericCategory>('navigation')
const editingItem = ref<BoatShowGenericEquipment | null>(null)

const CATEGORY_ORDER: GenericCategory[] = ['navigation', 'electrical', 'anchoring', 'deck']

const groupedItems = computed(() => {
  return CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: t(`boats.equipmentAddModal.categories.${cat}`),
    items: props.items.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0)
})

function statusVariant(status: string): 'success' | 'warning' | 'danger' {
  if (status === 'ok') return 'success'
  if (status === 'to_check') return 'warning'
  return 'danger'
}

function openCreate(category: GenericCategory) {
  createCategory.value = category
  isCreateOpen.value = true
}

function openEdit(item: BoatShowGenericEquipment) {
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
        <p class="text-sm font-semibold text-fg">{{ t('boats.genericEquipment.title') }}</p>
        <BaseButton
          v-if="canManage"
          variant="secondary"
          size="sm"
          type="button"
          :aria-label="t('boats.genericEquipment.add')"
          @click="openCreate('navigation')"
        >
          {{ t('boats.genericEquipment.add') }}
        </BaseButton>
      </div>
    </template>

    <div v-if="items.length === 0" class="text-sm text-fg-muted">
      {{ t('boats.genericEquipment.noItems') }}
    </div>

    <div v-else class="space-y-5">
      <div v-for="group in groupedItems" :key="group.category">
        <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          {{ group.label }}
        </p>
        <ul class="space-y-3 text-sm">
          <li
            v-for="item in group.items"
            :key="item.id"
            class="rounded-(--radius-control) border border-border bg-surface-muted/40 p-4"
          >
            <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="truncate text-sm font-semibold text-fg">{{ item.name }}</p>
                  <BaseBadge :variant="statusVariant(item.status)">
                    {{ t(`boats.options.genericEquipmentStatus.${item.status}`) }}
                  </BaseBadge>
                </div>

                <div class="mt-2 flex flex-wrap gap-2 text-xs text-fg-subtle">
                  <span
                    v-if="item.brand"
                    class="rounded-full bg-surface-elevated px-2 py-1 ring-1 ring-border"
                  >
                    {{ item.brand }}
                  </span>
                  <span
                    v-if="item.model"
                    class="rounded-full bg-surface-elevated px-2 py-1 ring-1 ring-border"
                  >
                    {{ item.model }}
                  </span>
                  <span
                    v-if="item.quantity !== null"
                    class="rounded-full bg-surface-elevated px-2 py-1 ring-1 ring-border"
                  >
                    {{ t('boats.genericEquipment.quantity') }}: {{ item.quantity }}
                  </span>
                </div>

                <p v-if="item.notes" class="mt-2 text-xs text-fg-muted">{{ item.notes }}</p>
              </div>

              <div class="flex flex-wrap items-center gap-2 md:justify-end">
                <BaseButton
                  v-if="canManageActions && item.status !== 'ok'"
                  variant="secondary"
                  size="sm"
                  type="button"
                  @click="emitAddToActions(item)"
                >
                  {{ t('equipmentActions.prefill.addButton') }}
                </BaseButton>
                <template v-if="canManage">
                  <BaseButton
                    variant="ghost"
                    size="sm"
                    type="button"
                    :aria-label="t('boats.genericEquipment.edit')"
                    @click="openEdit(item)"
                  >
                    {{ t('boats.genericEquipment.edit') }}
                  </BaseButton>
                  <Form
                    :action="{
                      url: `/boats/${boatId}/generic-equipment/${item.id}`,
                      method: 'delete',
                    }"
                    #default="{ processing }"
                    class="inline"
                  >
                    <BaseButton
                      type="submit"
                      variant="danger"
                      size="sm"
                      :disabled="processing"
                      :aria-label="t('boats.genericEquipment.delete')"
                    >
                      {{ t('boats.genericEquipment.delete') }}
                    </BaseButton>
                  </Form>
                </template>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Create Modal -->
    <BaseModal
      v-model:open="isCreateOpen"
      :title="t('boats.genericEquipment.modal.title')"
      :close-label="t('common.close')"
    >
      <Form
        :action="{ url: `/boats/${boatId}/generic-equipment`, method: 'post' }"
        @success="isCreateOpen = false"
        #default="{ processing, errors }"
      >
        <input type="hidden" name="category" :value="createCategory" />
        <BoatGenericEquipmentFields :errors="errors" />
        <div class="flex items-center justify-end gap-2 pt-4">
          <BaseButton variant="ghost" type="button" @click="isCreateOpen = false">
            {{ t('boats.genericEquipment.modal.cancel') }}
          </BaseButton>
          <BaseButton type="submit" :disabled="processing">
            {{ t('boats.genericEquipment.modal.submit') }}
          </BaseButton>
        </div>
      </Form>
    </BaseModal>

    <!-- Edit Modal -->
    <BaseModal
      :open="!!editingItem"
      @update:open="(v) => !v && closeEdit()"
      :title="t('boats.genericEquipment.modal.editTitle')"
      :close-label="t('common.close')"
    >
      <Form
        v-if="editingItem"
        :action="{
          url: `/boats/${boatId}/generic-equipment/${editingItem.id}`,
          method: 'put',
        }"
        @success="closeEdit()"
        #default="{ processing, errors }"
      >
        <input type="hidden" name="category" :value="editingItem.category" />
        <BoatGenericEquipmentFields
          :errors="errors"
          :name="editingItem.name"
          :brand="editingItem.brand ?? ''"
          :model="editingItem.model ?? ''"
          :quantity="editingItem.quantity !== null ? String(editingItem.quantity) : ''"
          :status="editingItem.status"
          :notes="editingItem.notes ?? ''"
        />
        <div class="flex items-center justify-end gap-2 pt-4">
          <BaseButton variant="ghost" type="button" @click="closeEdit()">
            {{ t('boats.genericEquipment.modal.cancel') }}
          </BaseButton>
          <BaseButton type="submit" :disabled="processing">
            {{ t('boats.genericEquipment.modal.submit') }}
          </BaseButton>
        </div>
      </Form>
    </BaseModal>
  </BaseCard>
</template>
