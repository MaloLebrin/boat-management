<script setup lang="ts">
import type { BoatShowDetail } from '~/types/boat_show'

defineProps<{
  boat: BoatShowDetail
}>()
</script>

<template>
  <div class="rounded-lg border border-zinc-200 bg-white p-4">
    <h2 class="text-sm font-semibold text-zinc-900">Specs</h2>
    <dl class="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
      <div>
        <dt class="text-zinc-600">Length</dt>
        <dd class="font-medium text-zinc-900">
          {{ boat.lengthM ?? '—' }}<template v-if="boat.lengthM !== null"> m</template>
        </dd>
      </div>
      <div>
        <dt class="text-zinc-600">Beam</dt>
        <dd class="font-medium text-zinc-900">
          {{ boat.beamM ?? '—' }}<template v-if="boat.beamM !== null"> m</template>
        </dd>
      </div>
      <div>
        <dt class="text-zinc-600">Draft</dt>
        <dd class="font-medium text-zinc-900">
          {{ boat.draftM ?? '—' }}<template v-if="boat.draftM !== null"> m</template>
        </dd>
      </div>
      <div>
        <dt class="text-zinc-600">Mast height</dt>
        <dd class="font-medium text-zinc-900">
          {{ boat.mastHeightM ?? '—' }}<template v-if="boat.mastHeightM !== null"> m</template>
        </dd>
      </div>
      <div>
        <dt class="text-zinc-600">Hull material</dt>
        <dd class="font-medium text-zinc-900">{{ boat.hullMaterial ?? '—' }}</dd>
      </div>
      <div>
        <dt class="text-zinc-600">Year built</dt>
        <dd class="font-medium text-zinc-900">{{ boat.yearBuilt ?? '—' }}</dd>
      </div>
      <div>
        <dt class="text-zinc-600">Manufacturer</dt>
        <dd class="font-medium text-zinc-900">{{ boat.manufacturer ?? '—' }}</dd>
      </div>
      <div>
        <dt class="text-zinc-600">Model</dt>
        <dd class="font-medium text-zinc-900">{{ boat.model ?? '—' }}</dd>
      </div>
    </dl>
  </div>
</template>
