<script setup lang="ts">
import { ref, watch } from 'vue'
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

const selectedBoatId = ref<string>(props.defaultBoatId ? String(props.defaultBoatId) : '')

const boatOptions = ref<Array<{ label: string; value: string }>>([])
watch(
  () => props.boats,
  (boats) => {
    boatOptions.value = boats.map((b) => ({ label: b.name, value: String(b.id) }))
  },
  { immediate: true }
)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) selectedBoatId.value = props.defaultBoatId ? String(props.defaultBoatId) : ''
  }
)

function close() {
  selectedBoatId.value = ''
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
      v-model="selectedBoatId"
      name="boatId"
      :label="t('navigation.logbook.quickAddModal.selectBoat')"
      :placeholder="t('navigation.logbook.quickAddModal.selectBoatPlaceholder')"
      :options="boatOptions"
    />

    <NavigationLogForm
      v-if="selectedBoatId"
      class="mt-4"
      :boat-id="Number(selectedBoatId)"
      :port-options="portOptions"
      @close="close"
    />
  </BaseModal>
</template>
