<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import BoatEquipmentSailFields from './BoatEquipmentSailFields.vue'
import type { BoatShowSail } from '~/types/boat_show'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import { ref } from 'vue'

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
      <li v-for="s in sails" :key="s.id" class="rounded-(--radius-control) border border-border bg-surface-muted/40 p-3">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p class="font-semibold text-fg">{{ s.sailType }}</p>
            <p class="text-fg-muted">
              <span v-if="s.areaM2 !== null">{{ s.areaM2 }} m²</span><span v-if="s.material"> · {{ s.material }}</span
              ><span v-if="s.reefPoints !== null"> · reef {{ s.reefPoints }}</span>
            </p>
            <p v-if="performedDisplay(s.manufacturedAt)" class="mt-1 text-fg-subtle">
              Mfg. {{ performedDisplay(s.manufacturedAt) }}
            </p>
          </div>
          <div v-if="canManage" class="flex flex-wrap items-center gap-2">
            <a
              :href="`/boats/${boatId}/sails/${s.id}/edit`"
              class="text-sm font-semibold text-fg-muted hover:text-fg hover:underline"
            >
              Edit
            </a>
            <Form
              :action="{ url: `/boats/${boatId}/sails/${s.id}`, method: 'delete' }"
              #default="{ processing }"
              class="inline"
            >
              <BaseButton type="submit" variant="danger" size="sm" :disabled="processing">
                Remove
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
