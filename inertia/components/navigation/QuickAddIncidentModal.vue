<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BoatIncidentForm from '~/components/boats/show/tabs/BoatIncidentForm.vue'
import { useSingleBoat } from '~/composables/use_single_boat'
import { useT } from '~/composables/use_t'
import type { FleetBoatOption } from '../../../shared/types/navigation'

const props = defineProps<{
  open: boolean
  boats: FleetBoatOption[]
  defaultBoatId?: number | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const { t } = useT()

const boatOptions = computed(() => props.boats.map((b) => ({ label: b.name, value: String(b.id) })))

/** Flotte mono-bateau (#823) : le choix est déjà fait, on saute le sélecteur. */
const { singleBoatId } = useSingleBoat(() => props.boats)

function initialBoatId(): string {
  if (singleBoatId.value) return singleBoatId.value
  return props.defaultBoatId ? String(props.defaultBoatId) : ''
}

const selectedBoatId = ref<string>(initialBoatId())

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) selectedBoatId.value = initialBoatId()
  }
)

watch(singleBoatId, (boatId) => {
  if (boatId) selectedBoatId.value = boatId
})

function close() {
  selectedBoatId.value = initialBoatId()
  emit('update:open', false)
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="t('navigation.incidents.quickAddModal.title')"
    :close-label="t('common.close')"
    size="xl"
    @update:open="close"
  >
    <BaseSelect
      v-if="!singleBoatId"
      v-model="selectedBoatId"
      name="boatId"
      :label="t('navigation.incidents.quickAddModal.selectBoat')"
      :placeholder="t('navigation.incidents.quickAddModal.selectBoatPlaceholder')"
      :options="boatOptions"
    />

    <BoatIncidentForm
      v-if="selectedBoatId"
      :class="singleBoatId ? '' : 'mt-4'"
      :boat-id="Number(selectedBoatId)"
      :editing-incident="null"
      @close="close"
    />
  </BaseModal>
</template>
