<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import NavigationLogForm from '~/components/boats/show/tabs/NavigationLogForm.vue'
import { useT } from '~/composables/use_t'
import type { NavigationLogPortOption } from '~/types/boat_show'
import type { FleetBoatOption } from '../../../shared/types/navigation'

const props = defineProps<{
  open: boolean
  boats: FleetBoatOption[]
  portOptions: NavigationLogPortOption[]
  defaultBoatId?: number | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const { t } = useT()

const boatOptions = computed(() => props.boats.map((b) => ({ label: b.name, value: String(b.id) })))

/**
 * Flotte mono-bateau (#603) : le choix est déjà fait, on saute le sélecteur.
 */
const singleBoatId = computed(() => (props.boats.length === 1 ? String(props.boats[0].id) : null))

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
    :title="t('navigation.logbook.quickAddModal.title')"
    :close-label="t('common.close')"
    size="xl"
    @update:open="close"
  >
    <BaseSelect
      v-if="!singleBoatId"
      v-model="selectedBoatId"
      name="boatId"
      :label="t('navigation.logbook.quickAddModal.selectBoat')"
      :placeholder="t('navigation.logbook.quickAddModal.selectBoatPlaceholder')"
      :options="boatOptions"
    />

    <NavigationLogForm
      v-if="selectedBoatId"
      :class="singleBoatId ? '' : 'mt-4'"
      :boat-id="Number(selectedBoatId)"
      :port-options="portOptions"
      @close="close"
    />
  </BaseModal>
</template>
