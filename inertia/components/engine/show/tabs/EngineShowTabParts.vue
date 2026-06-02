<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { ref } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import EnginePartModal from '~/components/engine/show/EnginePartModal.vue'
import { useT } from '~/composables/use_t'
import type { BoatShowEnginePart } from '~/types/boat_show'

const props = defineProps<{
  parts: BoatShowEnginePart[]
  boatId: number
  engineId: number
  canManage: boolean
}>()

const { t } = useT()

const isModalOpen = ref(false)
const editingPart = ref<BoatShowEnginePart | null>(null)

function openAdd() {
  editingPart.value = null
  isModalOpen.value = true
}

function openEdit(part: BoatShowEnginePart) {
  editingPart.value = part
  isModalOpen.value = true
}

function deletePart(partId: number) {
  if (!window.confirm(t('boats.engineShow.parts.confirmDelete'))) return
  router.delete(`/boats/${props.boatId}/engines/${props.engineId}/parts/${partId}`, {
    preserveScroll: true,
  })
}

function wearStateVariant(state: string): 'success' | 'info' | 'warning' | 'neutral' | 'danger' {
  if (state === 'new') return 'success'
  if (state === 'good') return 'info'
  if (state === 'worn') return 'warning'
  if (state === 'to_replace') return 'danger'
  return 'neutral'
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-fg">{{ t('boats.engineShow.parts.title') }}</h2>
      <BaseButton v-if="canManage" size="sm" @click="openAdd">
        {{ t('boats.engineShow.parts.add') }}
      </BaseButton>
    </div>

    <div v-if="parts.length === 0" class="rounded-lg border border-dashed border-border p-8">
      <p class="text-center text-fg-muted">{{ t('boats.engineShow.parts.empty') }}</p>
    </div>

    <div v-else class="overflow-x-auto rounded-lg border border-border">
      <table class="w-full text-sm text-left">
        <thead class="bg-surface-muted/50 text-fg-muted">
          <tr>
            <th class="px-4 py-3 font-medium">{{ t('boats.engineShow.parts.designation') }}</th>
            <th class="px-4 py-3 font-medium">{{ t('boats.engineShow.parts.reference') }}</th>
            <th class="px-4 py-3 font-medium">{{ t('boats.engineShow.parts.stock') }}</th>
            <th class="px-4 py-3 font-medium">{{ t('boats.engineShow.parts.supplier') }}</th>
            <th class="px-4 py-3 font-medium">{{ t('boats.engineShow.parts.wearState') }}</th>
            <th class="px-4 py-3 font-medium text-right">
              {{ t('boats.engineShow.parts.actions') }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="part in parts" :key="part.id" class="hover:bg-surface-muted/30">
            <td class="px-4 py-3">
              <div>
                <span class="font-medium text-fg">{{ part.designation }}</span>
                <p v-if="part.notes" class="mt-0.5 text-xs text-fg-muted line-clamp-1">
                  {{ part.notes }}
                </p>
              </div>
            </td>
            <td class="px-4 py-3 text-fg-muted">{{ part.reference ?? '-' }}</td>
            <td class="px-4 py-3 text-fg-muted">{{ part.stock ?? '-' }}</td>
            <td class="px-4 py-3 text-fg-muted">{{ part.supplier ?? '-' }}</td>
            <td class="px-4 py-3">
              <BaseBadge v-if="part.wearState" :variant="wearStateVariant(part.wearState)">
                {{ t(`equipment.wearState.${part.wearState}`) }}
              </BaseBadge>
              <span v-else class="text-fg-subtle">-</span>
            </td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-1">
                <BaseButton
                  variant="ghost"
                  size="sm"
                  :href="`/boats/${boatId}/engines/${engineId}/parts/${part.id}`"
                >
                  {{ t('boats.engineShow.parts.view') }}
                </BaseButton>
                <template v-if="canManage">
                  <BaseButton variant="ghost" size="sm" @click="openEdit(part)">
                    {{ t('boats.engineShow.parts.edit') }}
                  </BaseButton>
                  <BaseButton variant="ghost" size="sm" @click="deletePart(part.id)">
                    {{ t('boats.engineShow.parts.delete') }}
                  </BaseButton>
                </template>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <EnginePartModal
      v-if="canManage"
      v-model:open="isModalOpen"
      :boat-id="boatId"
      :engine-id="engineId"
      :editing-part="editingPart"
    />
  </div>
</template>
