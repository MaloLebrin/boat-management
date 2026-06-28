<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BaseRadioList from '~/components/base/BaseRadioList.vue'
import { useT } from '~/composables/use_t'
import type { BoatOption, SpotBoatRow } from '~/types/port'

const props = defineProps<{
  open: boolean
  spot: { id: number; name: string; boat: SpotBoatRow | null } | null
  boats: BoatOption[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': [payload: { spotId: number; boatId: number | null }]
}>()

const { t } = useT()
const search = ref('')
const selectedBoatId = ref<number | null>(null)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      search.value = ''
      selectedBoatId.value = props.spot?.boat?.id ?? null
    }
  }
)

const radioOptions = computed(() => {
  const q = search.value.toLowerCase().trim()
  const filtered = q ? props.boats.filter((b) => b.name.toLowerCase().includes(q)) : props.boats

  return [
    { value: null as number | null, label: t('ports.spots.noBoat') },
    ...filtered.map((b) => ({
      value: b.id as number | null,
      label: b.name,
      badge: props.spot?.boat?.id === b.id ? t('ports.spots.current') : undefined,
    })),
  ]
})

function handleConfirm() {
  if (!props.spot) return
  const current = props.spot.boat?.id ?? null
  if (selectedBoatId.value === current) {
    emit('update:open', false)
    return
  }
  emit('confirm', { spotId: props.spot.id, boatId: selectedBoatId.value })
  emit('update:open', false)
}

function handleClose(value: boolean) {
  emit('update:open', value)
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="spot ? t('ports.spots.assignTitle', { name: spot.name }) : ''"
    size="md"
    @update:open="handleClose"
  >
    <div v-if="spot" class="space-y-4">
      <BaseInput
        id="boat-search"
        v-model="search"
        name="boatSearch"
        :label="t('ports.spots.searchBoat')"
        :placeholder="t('ports.spots.searchPlaceholder')"
      />

      <div class="max-h-60 overflow-y-auto">
        <BaseRadioList
          name="spot-boat"
          :model-value="selectedBoatId"
          :options="radioOptions"
          @update:model-value="selectedBoatId = $event as number | null"
        />
        <div
          v-if="radioOptions.length === 1 && search"
          class="px-4 py-3 text-sm text-fg-muted text-center border border-border rounded-b-lg border-t-0"
        >
          {{ t('ports.spots.noResults') }}
        </div>
      </div>

      <div class="flex justify-end gap-2">
        <BaseButton variant="ghost" @click="handleClose(false)">
          {{ t('common.cancel') }}
        </BaseButton>
        <BaseButton @click="handleConfirm">
          {{ t('ports.spots.assignButton') }}
        </BaseButton>
      </div>
    </div>
  </BaseModal>
</template>
