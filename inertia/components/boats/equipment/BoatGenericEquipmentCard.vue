<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { computed, ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BoatGenericEquipmentFields from './BoatGenericEquipmentFields.vue'
import BoatGenericEquipmentRow from './BoatGenericEquipmentRow.vue'
import {
  genericEquipmentFormSurfaceParam,
  shouldReopenGenericEquipmentForm,
} from '~/composables/use_generic_equipment_form_draft'
import { useT } from '~/composables/use_t'
import { suggestEquipmentActionType } from '#shared/helpers/equipment_action'
import { GENERIC_EQUIPMENT_CATEGORIES, type GenericEquipmentCategory } from '#shared/types/boat'
import type { BoatShowGenericEquipment, EquipmentActionPrefill } from '~/types/boat_show'

const props = defineProps<{
  boatId: number
  items: BoatShowGenericEquipment[]
  canManage: boolean
  canManageActions: boolean
}>()

const emit = defineEmits<{
  (e: 'addToActions', payload: EquipmentActionPrefill): void
}>()

/** Identifient ces modales dans l'URL de l'aller-retour catalogue (#577). */
const CREATE_SURFACE = 'generic-card'
const EDIT_SURFACE_PREFIX = 'generic-card-edit-'

const { t } = useT()

function emitAddToActions(item: BoatShowGenericEquipment) {
  emit('addToActions', {
    equipmentType: 'generic',
    equipmentId: item.id,
    label: item.name,
    actionType: suggestEquipmentActionType(item.status),
  })
}

// La visite partielle qui charge les modèles du catalogue (#577) remonte
// l'arbre : les modales se rouvrent depuis l'URL, seul état qui traverse.
const isCreateOpen = ref(shouldReopenGenericEquipmentForm(CREATE_SURFACE))
const createCategory = ref<GenericEquipmentCategory>('navigation')

function reopenedEditItem(): BoatShowGenericEquipment | null {
  const surface = genericEquipmentFormSurfaceParam()
  if (!surface?.startsWith(EDIT_SURFACE_PREFIX)) return null
  const id = Number(surface.slice(EDIT_SURFACE_PREFIX.length))
  return props.items.find((item) => item.id === id) ?? null
}

const editingItem = ref<BoatShowGenericEquipment | null>(reopenedEditItem())

const groupedItems = computed(() => {
  return GENERIC_EQUIPMENT_CATEGORIES.map((cat) => ({
    category: cat,
    label: t(`boats.equipmentAddModal.categories.${cat}`),
    items: props.items.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0)
})

function openCreate(category: GenericEquipmentCategory) {
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
          <BoatGenericEquipmentRow
            v-for="item in group.items"
            :key="item.id"
            :boat-id="boatId"
            :item="item"
            :can-manage="canManage"
            :can-manage-actions="canManageActions"
            @edit="openEdit"
            @add-to-actions="emitAddToActions"
          />
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
        <BoatGenericEquipmentFields
          :errors="errors"
          :initial-category="createCategory"
          :surface="CREATE_SURFACE"
        />
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
        <!-- La catégorie est un select comme les autres champs : un guindeau
             créé par erreur en `deck` se corrige ici, sans supprimer/recréer
             (#577). -->
        <BoatGenericEquipmentFields
          :errors="errors"
          :item="editingItem"
          :surface="`${EDIT_SURFACE_PREFIX}${editingItem.id}`"
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
