<script setup lang="ts">
import type { BoatShowRig } from '~/types/boat_show'

defineProps<{
  rig: BoatShowRig
}>()
</script>

<template>
  <div class="rounded-lg border border-zinc-200 bg-white p-4">
    <h2 class="text-sm font-semibold text-zinc-900">Rig</h2>
    <dl class="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
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
    </dl>
  </div>
</template>
