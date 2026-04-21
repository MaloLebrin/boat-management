<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import type { BoatShowRig } from '~/types/boat_show'

defineProps<{
  boatId: number
  rig: BoatShowRig | null
  canManage: boolean
}>()
</script>

<template>
  <div class="rounded-lg border border-zinc-200 bg-white p-4">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <h2 class="text-sm font-semibold text-zinc-900">Rig</h2>
      <div v-if="canManage" class="flex flex-wrap items-center gap-2">
        <a :href="`/boats/${boatId}/rig/edit`" class="text-sm font-medium text-zinc-700 hover:underline">
          {{ rig ? 'Edit' : 'Add rig' }}
        </a>
        <Form
          v-if="rig"
          :action="{ url: `/boats/${boatId}/rig`, method: 'delete' }"
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

    <div v-if="!rig" class="mt-3 text-sm text-zinc-600">No rig recorded.</div>
    <dl v-else class="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
      <div>
        <dt class="text-zinc-600">Rig type</dt>
        <dd class="font-medium text-zinc-900">{{ rig.rigType }}</dd>
      </div>
      <div>
        <dt class="text-zinc-600">Mast count</dt>
        <dd class="font-medium text-zinc-900">{{ rig.mastCount ?? '—' }}</dd>
      </div>
      <div>
        <dt class="text-zinc-600">Spreaders</dt>
        <dd class="font-medium text-zinc-900">{{ rig.spreaders ?? '—' }}</dd>
      </div>
      <div v-if="rig.manufacturedAt">
        <dt class="text-zinc-600">Manufacturing date</dt>
        <dd class="font-medium text-zinc-900">{{ rig.manufacturedAt.slice(0, 10) }}</dd>
      </div>
    </dl>
  </div>
</template>
