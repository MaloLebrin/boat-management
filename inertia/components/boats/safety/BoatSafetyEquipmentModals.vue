<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BoatSafetyEquipmentFields from './BoatSafetyEquipmentFields.vue'
import { useT } from '~/composables/use_t'
import type { BoatShowSafetyEquipment } from '~/types/boat_show'

/**
 * Modales de création et d'édition de la carte Sécurité, sorties de la carte
 * pour la garder sous la limite de taille (#813). L'état d'ouverture reste
 * porté par la carte, qui le pilote depuis ses lignes et le panneau de conformité.
 */
defineProps<{
  boatId: number
  /** Type pré-rempli par le panneau de conformité (#582), `''` sinon. */
  createEquipmentType: string
}>()

const createOpen = defineModel<boolean>('createOpen', { required: true })
const editingItem = defineModel<BoatShowSafetyEquipment | null>('editingItem', { required: true })

const { t } = useT()

const toDateInputValue = (iso: string | null) => (iso ? iso.slice(0, 10) : null)
const closeEdit = () => (editingItem.value = null)
</script>

<template>
  <!-- Create Modal -->
  <BaseModal
    v-model:open="createOpen"
    :title="t('boats.safetyEquipment.modal.title')"
    :close-label="t('common.close')"
  >
    <Form
      :key="`create-${createEquipmentType}`"
      :action="{ url: `/boats/${boatId}/safety-equipment`, method: 'post' }"
      @success="createOpen = false"
      #default="{ processing, errors }"
    >
      <BoatSafetyEquipmentFields :errors="errors" :equipment-type="createEquipmentType" />
      <div class="flex items-center justify-end gap-2 pt-4">
        <BaseButton variant="ghost" type="button" @click="createOpen = false">
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
        :expiry-date="toDateInputValue(editingItem.expiryDate) ?? ''"
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
</template>
