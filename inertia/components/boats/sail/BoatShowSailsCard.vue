<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { PencilSquareIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { ref } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import type { BoatShowSail } from '~/types/boat_show'
import BoatEquipmentSailFields from './BoatEquipmentSailFields.vue'

defineProps<{
  boatId: number
  sails: BoatShowSail[]
  canManage: boolean
}>()

const isCreateOpen = ref(false)

function performedDisplay(iso: string | null) {
  if (!iso) return null
  const d = iso.slice(0, 10)
  return d || iso
}
</script>

<template>
  <BaseCard padded>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm font-semibold text-fg">Sails</p>
        <BaseButton
          v-if="canManage"
          variant="secondary"
          size="sm"
          type="button"
          aria-label="Add a sail"
          @click="isCreateOpen = true"
        >
          Add sail
        </BaseButton>
      </div>
    </template>
    <div v-if="sails.length === 0" class="text-sm text-fg-muted">No sails.</div>
    <ul v-else class="space-y-3 text-sm">
      <li
        v-for="s in sails"
        :key="s.id"
        class="rounded-(--radius-control) border border-border bg-surface-muted/40 p-4"
      >
        <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="truncate text-sm font-semibold text-fg">{{ s.sailType }}</p>
              <BaseBadge v-if="s.material" variant="neutral">
                {{ s.material }}
              </BaseBadge>
            </div>

            <div class="mt-2 flex flex-wrap gap-2 text-xs text-fg-subtle">
              <span
                v-if="s.areaM2 !== null"
                class="rounded-full bg-surface-elevated px-2 py-1 ring-1 ring-border"
              >
                {{ s.areaM2 }} m²
              </span>
              <span
                v-if="s.reefPoints !== null"
                class="rounded-full bg-surface-elevated px-2 py-1 ring-1 ring-border"
              >
                Reef {{ s.reefPoints }}
              </span>
            </div>

            <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-subtle">
              <span v-if="performedDisplay(s.manufacturedAt)">Mfg. {{ performedDisplay(s.manufacturedAt) }}</span>
            </div>
          </div>

          <div v-if="canManage" class="flex flex-wrap items-center gap-2 md:justify-end">
            <a :href="`/boats/${boatId}/sails/${s.id}/edit`">
              <BaseButton variant="secondary" size="sm" type="button" aria-label="Edit sail">
                <PencilSquareIcon class="w-4 h-4" />
              </BaseButton>
            </a>
            <Form
              :action="{ url: `/boats/${boatId}/sails/${s.id}`, method: 'delete' }"
              #default="{ processing }"
              class="inline"
            >
              <BaseButton type="submit" variant="danger" size="sm" :disabled="processing" aria-label="Remove sail">
                <TrashIcon class="w-4 h-4 text-red-800" />
              </BaseButton>
            </Form>
          </div>
        </div>
      </li>
    </ul>

    <BaseModal v-model:open="isCreateOpen" title="Add sail" close-label="Close">
      <Form
        :action="{ url: `/boats/${boatId}/sails`, method: 'post' }"
        class="space-y-4"
        #default="{ processing, errors }"
      >
        <BoatEquipmentSailFields :errors="errors" />
        <div class="flex items-center justify-end gap-2 pt-2">
          <BaseButton variant="ghost" type="button" @click="isCreateOpen = false">Cancel</BaseButton>
          <BaseButton type="submit" :disabled="processing">Add sail</BaseButton>
        </div>
      </Form>
    </BaseModal>
  </BaseCard>
</template>
