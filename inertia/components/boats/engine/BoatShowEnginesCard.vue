<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import BoatEquipmentEngineFields from './BoatEquipmentEngineFields.vue'
import type { BoatShowEngine } from '~/types/boat_show'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'

defineProps<{
  boatId: number
  engines: BoatShowEngine[]
  canManage: boolean
}>()

function performedDisplay(iso: string | null) {
  if (!iso) return null
  const d = iso.slice(0, 10)
  return d || iso
}
</script>

<template>
  <BaseCard padded>
    <template #header>
      <p class="text-sm font-semibold text-fg">Engines</p>
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

    <div v-if="canManage" class="mt-6 border-t border-border pt-4">
      <p class="text-xs font-semibold uppercase tracking-wide text-fg-subtle">Add engine</p>
      <Form
        :action="{ url: `/boats/${boatId}/engines`, method: 'post' }"
        class="mt-3"
        #default="{ processing, errors }"
      >
        <BoatEquipmentEngineFields :errors="errors" />
        <div class="mt-4">
          <BaseButton type="submit" :disabled="processing">Add engine</BaseButton>
        </div>
      </Form>
    </div>
  </BaseCard>
</template>
