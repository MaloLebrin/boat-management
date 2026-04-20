<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import BoatEquipmentSailFields from './BoatEquipmentSailFields.vue'
import type { BoatShowSail } from '~/types/boat_show'

defineProps<{
  boatId: number
  sails: BoatShowSail[]
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
    <h2 class="text-sm font-semibold text-zinc-900">Sails</h2>
    <div v-if="sails.length === 0" class="mt-3 text-sm text-zinc-600">No sails.</div>
    <ul v-else class="mt-3 space-y-3 text-sm">
      <li v-for="s in sails" :key="s.id" class="rounded-md border border-zinc-200 p-3">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p class="font-medium text-zinc-900">{{ s.sailType }}</p>
            <p class="text-zinc-700">
              <span v-if="s.areaM2 !== null">{{ s.areaM2 }} m²</span><span v-if="s.material"> · {{ s.material }}</span
              ><span v-if="s.reefPoints !== null"> · reef {{ s.reefPoints }}</span>
            </p>
            <p v-if="performedDisplay(s.manufacturedAt)" class="mt-1 text-zinc-600">
              Mfg. {{ performedDisplay(s.manufacturedAt) }}
            </p>
          </div>
          <div v-if="canManage" class="flex flex-wrap items-center gap-2">
            <a
              :href="`/boats/${boatId}/sails/${s.id}/edit`"
              class="text-sm font-medium text-zinc-700 hover:underline"
            >
              Edit
            </a>
            <Form
              :action="`/boats/${boatId}/sails/${s.id}`"
              method="delete"
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
      <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-600">Add sail</h3>
      <Form :action="`/boats/${boatId}/sails`" method="post" class="mt-3" #default="{ processing, errors }">
        <BoatEquipmentSailFields :errors="errors" />
        <button
          type="submit"
          :disabled="processing"
          class="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add sail
        </button>
      </Form>
    </div>
  </div>
</template>
