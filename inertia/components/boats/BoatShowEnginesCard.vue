<script setup lang="ts">
import type { BoatShowEngine } from '~/types/boat_show'

defineProps<{
  engines: BoatShowEngine[]
}>()
</script>

<template>
  <div class="rounded-lg border border-zinc-200 bg-white p-4">
    <h2 class="text-sm font-semibold text-zinc-900">Engines</h2>
    <div v-if="engines.length === 0" class="mt-3 text-sm text-zinc-600">No engines.</div>
    <ul v-else class="mt-3 space-y-3 text-sm">
      <li v-for="e in engines" :key="e.id" class="rounded-md border border-zinc-200 p-3">
        <p class="font-medium text-zinc-900">{{ e.kind }}<span v-if="e.fuel"> · {{ e.fuel }}</span></p>
        <p class="text-zinc-700">
          {{ e.brand ?? '—' }} {{ e.model ?? '' }}<span v-if="e.powerHp !== null"> · {{ e.powerHp }} hp</span
          ><span v-if="e.hours !== null"> · {{ e.hours }} h</span>
        </p>
      </li>
    </ul>
  </div>
</template>
