<script setup lang="ts">
import { computed } from 'vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BoatIncidentForm from '~/components/boats/show/tabs/BoatIncidentForm.vue'
import { useT } from '~/composables/use_t'
import type { TaskEquipmentSource } from '#shared/types/maintenance'
import type { BoatIncidentRow, IncidentFormPrefill } from '~/types/boat_show'

/**
 * Modale de déclaration d'incident partagée par tous les points d'entrée
 * (#813). Le formulaire est remonté à chaque ouverture et pour chaque cible
 * (`:key`), pour que le pré-remplissage reparte toujours d'un état vierge.
 */
const props = withDefaults(
  defineProps<{
    boatId: number
    equipment?: TaskEquipmentSource | null
    prefill?: IncidentFormPrefill | null
    lockTarget?: boolean
    editingIncident?: BoatIncidentRow | null
  }>(),
  { equipment: null, prefill: null, lockTarget: false, editingIncident: null }
)

const open = defineModel<boolean>('open', { required: true })

const { t } = useT()

const formKey = computed(() => {
  const ref = props.prefill?.target
  const target = ref ? `${ref.type}-${ref.id}` : 'boat'
  return `${props.boatId}-${target}-${props.editingIncident?.id ?? 'new'}`
})
</script>

<template>
  <BaseModal
    v-model:open="open"
    :title="editingIncident ? t('incidents.form.editTitle') : t('incidents.modalTitle')"
    :close-label="t('common.close')"
    size="xl"
  >
    <BoatIncidentForm
      v-if="open"
      :key="formKey"
      :boat-id="boatId"
      :editing-incident="editingIncident"
      :equipment="equipment"
      :prefill="prefill"
      :lock-target="lockTarget"
      @close="open = false"
    />
  </BaseModal>
</template>
