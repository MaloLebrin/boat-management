<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import BoatEquipmentEngineFields from './BoatEquipmentEngineFields.vue'
import type { BoatShowEngine } from '~/types/boat_show'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import { ref } from 'vue'

defineProps<{
  boatId: number
  engines: BoatShowEngine[]
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
        <p class="text-sm font-semibold text-fg">Engines</p>
        <BaseButton
          v-if="canManage"
          variant="secondary"
          size="sm"
          type="button"
          aria-label="Add an engine"
          @click="isCreateOpen = true"
        >
          Add engine
        </BaseButton>
      </div>
    </template>
    <div v-if="engines.length === 0" class="text-sm text-fg-muted">No engines.</div>
    <ul v-else class="space-y-3 text-sm">
      <li v-for="e in engines" :key="e.id" class="rounded-(--radius-control) border border-border bg-surface-muted/40 p-3">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p class="font-semibold text-fg">
              {{ e.kind }}<span v-if="e.fuel"> · {{ e.fuel }}</span>
            </p>
            <p class="text-fg-muted">
              {{ e.brand ?? '—' }} {{ e.model ?? '' }}<span v-if="e.powerHp !== null"> · {{ e.powerHp }} hp</span
              ><span v-if="e.hours !== null"> · {{ e.hours }} h</span>
            </p>
            <p v-if="performedDisplay(e.manufacturedAt)" class="mt-1 text-fg-subtle">
              Mfg. {{ performedDisplay(e.manufacturedAt) }}
            </p>
          </div>
          <div v-if="canManage" class="flex flex-wrap items-center gap-2">
            <a
              :href="`/boats/${boatId}/engines/${e.id}/edit`"
              class="text-sm font-semibold text-fg-muted hover:text-fg hover:underline"
            >
              Edit
            </a>
            <Form
              :action="{ url: `/boats/${boatId}/engines/${e.id}`, method: 'delete' }"
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

    <BaseModal v-model:open="isCreateOpen" title="Add engine" close-label="Close">
      <Form
        :action="{ url: `/boats/${boatId}/engines`, method: 'post' }"
        class="space-y-4"
        #default="{ processing, errors }"
      >
        <BoatEquipmentEngineFields :errors="errors" />
        <div class="flex items-center justify-end gap-2 pt-2">
          <BaseButton variant="ghost" type="button" @click="isCreateOpen = false">Cancel</BaseButton>
          <BaseButton type="submit" :disabled="processing">Add engine</BaseButton>
        </div>
      </Form>
    </BaseModal>
  </BaseCard>
</template>
