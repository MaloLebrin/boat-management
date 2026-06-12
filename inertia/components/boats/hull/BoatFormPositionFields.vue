<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/use_t'
import type { PortForForm } from '~/types/boat_form'

const spotId = defineModel<number | ''>('spotId', { required: true })

const props = defineProps<{
  ports: PortForForm[]
  errors: Record<string, string | string[] | undefined>
  initialPortId?: number
  initialPontoonId?: number
  initialMouillageId?: number
}>()

const { t } = useT()

const selectedPortId = ref<number | ''>(props.initialPortId ?? '')
const selectedPontoonId = ref<number | ''>(props.initialPontoonId ?? '')
const selectedMouillageId = ref<number | ''>(props.initialMouillageId ?? '')

const portOptions = computed(() => props.ports.map((p) => ({ label: p.name, value: p.id })))

const pontoonOptions = computed(() => {
  if (!selectedPortId.value) return []
  const port = props.ports.find((p) => p.id === Number(selectedPortId.value))
  return port?.pontoons.map((pt) => ({ label: pt.name, value: pt.id })) ?? []
})

const mouillageOptions = computed(() => {
  if (!selectedPortId.value) return []
  const port = props.ports.find((p) => p.id === Number(selectedPortId.value))
  return port?.mouillages.map((m) => ({ label: m.name, value: m.id })) ?? []
})

const spotOptions = computed(() => {
  const port = props.ports.find((p) => p.id === Number(selectedPortId.value))
  if (selectedPontoonId.value) {
    const pt = port?.pontoons.find((p) => p.id === Number(selectedPontoonId.value))
    return pt?.spots.map((s) => ({ label: s.name, value: s.id })) ?? []
  }
  if (selectedMouillageId.value) {
    const m = port?.mouillages.find((mo) => mo.id === Number(selectedMouillageId.value))
    return m?.spots.map((s) => ({ label: s.name, value: s.id })) ?? []
  }
  return []
})

function clearPort() {
  selectedPontoonId.value = ''
  selectedMouillageId.value = ''
  spotId.value = ''
}

function clearPontoon() {
  selectedMouillageId.value = ''
  spotId.value = ''
}

function clearMouillage() {
  selectedPontoonId.value = ''
  spotId.value = ''
}
</script>

<template>
  <div v-if="ports.length > 0" class="space-y-4 rounded-lg border border-border p-4">
    <p class="text-sm font-semibold text-fg">{{ t('boats.show.position.title') }}</p>
    <BaseSelect
      id="portId"
      name="_portId"
      :label="t('ports.title')"
      :placeholder="t('common.selectPlaceholder')"
      :allow-empty="true"
      :options="portOptions"
      v-model="selectedPortId"
      @update:model-value="clearPort"
    />
    <div class="grid grid-cols-2 gap-4">
      <BaseSelect
        id="_pontoonId"
        name="_pontoonId"
        :label="t('boats.hullFields.pontoon')"
        :placeholder="t('common.selectPlaceholder')"
        :allow-empty="true"
        :options="pontoonOptions"
        :disabled="!selectedPortId || !!selectedMouillageId"
        v-model="selectedPontoonId"
        @update:model-value="clearPontoon"
      />
      <BaseSelect
        id="_mouillageId"
        name="_mouillageId"
        :label="t('boats.hullFields.mouillage')"
        :placeholder="t('common.selectPlaceholder')"
        :allow-empty="true"
        :options="mouillageOptions"
        :disabled="!selectedPortId || !!selectedPontoonId"
        v-model="selectedMouillageId"
        @update:model-value="clearMouillage"
      />
    </div>
    <BaseSelect
      v-if="selectedPontoonId || selectedMouillageId"
      id="spotId"
      name="spotId"
      :label="t('boats.hullFields.spotIdentifier')"
      :placeholder="t('common.selectPlaceholder')"
      :allow-empty="true"
      :options="spotOptions"
      v-model="spotId"
      :errors="errors"
    />
  </div>
</template>
