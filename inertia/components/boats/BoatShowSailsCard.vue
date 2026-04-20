<script setup lang="ts">
import type { BoatShowSail } from '~/types/boat_show'

defineProps<{
  sails: BoatShowSail[]
}>()
</script>

<template>
  <div class="rounded-lg border border-zinc-200 bg-white p-4">
    <h2 class="text-sm font-semibold text-zinc-900">Sails</h2>
    <div v-if="sails.length === 0" class="mt-3 text-sm text-zinc-600">No sails.</div>
    <ul v-else class="mt-3 space-y-3 text-sm">
      <li v-for="s in sails" :key="s.id" class="rounded-md border border-zinc-200 p-3">
        <p class="font-medium text-zinc-900">{{ s.sailType }}</p>
        <p class="text-zinc-700">
          <span v-if="s.areaM2 !== null">{{ s.areaM2 }} m²</span><span v-if="s.material"> · {{ s.material }}</span
          ><span v-if="s.reefPoints !== null"> · reef {{ s.reefPoints }}</span>
        </p>
      </li>
    </ul>
  </div>
</template>
