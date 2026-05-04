<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import BoatEquipmentEngineFields from './BoatEquipmentEngineFields.vue'
import type { BoatShowEngine } from '~/types/boat_show'
import BaseBadge from '~/components/base/BaseBadge.vue'
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
      <li
        v-for="e in engines"
        :key="e.id"
        class="rounded-(--radius-control) border border-border bg-surface-muted/40 p-4"
      >
        <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="truncate text-sm font-semibold text-fg">{{ e.kind }}</p>
              <BaseBadge v-if="e.fuel" variant="neutral">
                {{ e.fuel }}
              </BaseBadge>
            </div>

            <div class="mt-2 flex flex-wrap gap-2 text-xs text-fg-subtle">
              <span class="rounded-full bg-surface-elevated px-2 py-1 ring-1 ring-border">
                {{ e.brand ?? '—' }} {{ e.model ?? '' }}
              </span>
              <span
                v-if="e.powerHp !== null"
                class="rounded-full bg-surface-elevated px-2 py-1 ring-1 ring-border"
              >
                {{ e.powerHp }} hp
              </span>
              <span
                v-if="e.hours !== null"
                class="rounded-full bg-surface-elevated px-2 py-1 ring-1 ring-border"
              >
                {{ e.hours }} h
              </span>
            </div>

            <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-subtle">
              <span v-if="performedDisplay(e.manufacturedAt)">Mfg. {{ performedDisplay(e.manufacturedAt) }}</span>
              <span v-if="e.serialNumber">SN {{ e.serialNumber }}</span>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 md:justify-end">
            <a :href="`/boats/${boatId}/engines/${e.id}`">
              <BaseButton variant="secondary" size="sm" type="button">
                Voir le détail
              </BaseButton>
            </a>
            <a v-if="canManage" :href="`/boats/${boatId}/engines/${e.id}/edit`">
              <BaseButton variant="ghost" size="sm" type="button" aria-label="Edit engine">
                Modifier
              </BaseButton>
            </a>
            <Form
              v-if="canManage"
              :action="{ url: `/boats/${boatId}/engines/${e.id}`, method: 'delete' }"
              #default="{ processing }"
              class="inline"
            >
              <BaseButton type="submit" variant="danger" size="sm" :disabled="processing" aria-label="Remove engine">
                Supprimer
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
