<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { computed, ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BoatEquipmentEngineFields from '~/components/boats/engine/BoatEquipmentEngineFields.vue'
import BoatEquipmentRigFields from '~/components/boats/rig/BoatEquipmentRigFields.vue'
import BoatEquipmentSailFields from '~/components/boats/sail/BoatEquipmentSailFields.vue'
import { useT } from '~/composables/useT'
import type { BoatShowDetail } from '~/types/boat_show'

type Category = 'engine' | 'sail' | 'rig' | 'other'

const props = defineProps<{
  boat: BoatShowDetail
  canManageEquipment: boolean
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const { t } = useT()

const selectedCategory = ref<Category>('engine')

const categories = computed(() => [
  { key: 'engine', label: t('boats.equipmentAddModal.categories.engine'), icon: '⚙', supported: true },
  { key: 'sail', label: t('boats.equipmentAddModal.categories.sail'), icon: '⛵', supported: true },
  { key: 'rig', label: t('boats.equipmentAddModal.categories.rig'), icon: '⚓', supported: true },
  { key: 'other', label: t('boats.equipmentAddModal.categories.other'), icon: '📦', supported: false },
])

const actionByCategory: Record<Exclude<Category, 'other'>, { url: string; method: 'post' | 'put' }> = {
  engine: { url: `/boats/${props.boat.id}/engines`, method: 'post' },
  sail: { url: `/boats/${props.boat.id}/sails`, method: 'post' },
  rig: { url: `/boats/${props.boat.id}/rig`, method: 'put' },
}

function close() {
  emit('update:open', false)
}
</script>

<template>
  <BaseModal :open="open" :title="t('boats.equipmentAddModal.title')"
    :subtitle="t('boats.equipmentAddModal.subtitle', { name: boat.name })" :close-label="t('boats.equipmentAddModal.cancel')" size="xl"
    @update:open="close">
    <!-- Category selector -->
    <div class="mb-5">
      <p class="mb-2 text-sm font-semibold text-fg">
        {{ t('boats.equipmentAddModal.category') }} <span class="text-danger">*</span>
      </p>
      <div class="flex flex-wrap gap-2">
        <button v-for="cat in categories" :key="cat.key" type="button" :disabled="!cat.supported" :class="[
          'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
          selectedCategory === cat.key
            ? 'bg-brand text-white'
            : cat.supported
              ? 'bg-surface-muted text-fg-muted hover:bg-surface-elevated hover:text-fg'
              : 'cursor-not-allowed bg-surface-muted/50 text-fg-subtle',
        ]" @click="selectedCategory = cat.key">
          <span>{{ cat.icon }}</span>
          {{ cat.label }}
          <span v-if="!cat.supported" class="text-xs opacity-70">({{ t('boats.equipmentAddModal.comingSoon.badge') }})</span>
        </button>
      </div>
    </div>

    <!-- Coming soon notice -->
    <div v-if="selectedCategory === 'other'"
      class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-800">
      <p class="font-semibold">{{ t('boats.equipmentAddModal.comingSoon.title') }}</p>
      <p class="mt-1 text-xs">{{ t('boats.equipmentAddModal.comingSoon.description') }}</p>
    </div>

    <!-- Dynamic form by category -->
    <template v-else>
      <Form :action="actionByCategory[selectedCategory]" @success="close" class="space-y-4" #default="{ processing, errors }">
        <BoatEquipmentEngineFields v-if="selectedCategory === 'engine'" :errors="errors" />
        <BoatEquipmentSailFields v-else-if="selectedCategory === 'sail'" :errors="errors" />
        <BoatEquipmentRigFields v-else-if="selectedCategory === 'rig'" :errors="errors" :rig="boat.rig" />

        <p v-if="selectedCategory === 'rig' && boat.rig" class="text-xs text-fg-muted">
          {{ t('boats.equipmentAddModal.rigNotice') }}
        </p>

        <div class="flex items-center justify-end gap-2 pt-2">
          <BaseButton variant="ghost" type="button" @click="close">{{ t('boats.equipmentAddModal.cancel') }}</BaseButton>
          <BaseButton type="submit" :disabled="processing">
            {{ t('boats.equipmentAddModal.submit') }}
          </BaseButton>
        </div>
      </Form>
    </template>
  </BaseModal>
</template>
