<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import BoatEquipmentEngineFields from './BoatEquipmentEngineFields.vue'
import type { BoatShowEngine } from '~/types/boat_show'

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
  <div class="rounded-lg border border-zinc-200 bg-white p-4">
    <h2 class="text-sm font-semibold text-zinc-900">Engines</h2>
    <div v-if="engines.length === 0" class="mt-3 text-sm text-zinc-600">No engines.</div>
    <ul v-else class="mt-3 space-y-3 text-sm">
      <li v-for="e in engines" :key="e.id" class="rounded-md border border-zinc-200 p-3">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p class="font-medium text-zinc-900">
              {{ e.kind }}<span v-if="e.fuel"> · {{ e.fuel }}</span>
            </p>
            <p class="text-zinc-700">
              {{ e.brand ?? '—' }} {{ e.model ?? '' }}<span v-if="e.powerHp !== null"> · {{ e.powerHp }} hp</span
              ><span v-if="e.hours !== null"> · {{ e.hours }} h</span>
            </p>
            <p v-if="performedDisplay(e.manufacturedAt)" class="mt-1 text-zinc-600">
              Mfg. {{ performedDisplay(e.manufacturedAt) }}
            </p>
          </div>
          <div v-if="canManage" class="flex flex-wrap items-center gap-2">
            <a
              :href="`/boats/${boatId}/engines/${e.id}/edit`"
              class="text-sm font-medium text-zinc-700 hover:underline"
            >
              Edit
            </a>
            <Form
              :action="{ url: `/boats/${boatId}/engines/${e.id}`, method: 'delete' }"
              #default="{ processing }"
              class="inline"
            >
              <button
                type="submit"
                :disabled="processing"
                class="text-sm font-medium text-red-700 hover:underline disabled:opacity-60"
              >
                Remove
              </button>
            </Form>
          </div>
        </div>
      </li>
    </ul>

    <div v-if="canManage" class="mt-6 border-t border-zinc-100 pt-4">
      <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-600">Add engine</h3>
      <Form
        :action="{ url: `/boats/${boatId}/engines`, method: 'post' }"
        class="mt-3"
        #default="{ processing, errors }"
      >
        <BoatEquipmentEngineFields :errors="errors" />
        <button
          type="submit"
          :disabled="processing"
          class="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add engine
        </button>
      </Form>
    </div>
  </div>
</template>
