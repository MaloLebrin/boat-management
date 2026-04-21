<script setup lang="ts">
import type { BoatShowDetail } from '~/types/boat_show'
import BaseCard from '~/components/base/BaseCard.vue'

defineProps<{
  boat: BoatShowDetail
}>()
</script>

<template>
  <BaseCard padded>
    <template #header>
      <p class="text-sm font-semibold text-fg">Specs</p>
    </template>
    <dl class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
      <div>
        <dt class="text-fg-muted">Length</dt>
        <dd class="font-semibold text-fg">
          {{ boat.lengthM ?? '—' }}<template v-if="boat.lengthM !== null"> m</template>
        </dd>
      </div>
      <div>
        <dt class="text-fg-muted">Beam</dt>
        <dd class="font-semibold text-fg">
          {{ boat.beamM ?? '—' }}<template v-if="boat.beamM !== null"> m</template>
        </dd>
      </div>
      <div>
        <dt class="text-fg-muted">Draft</dt>
        <dd class="font-semibold text-fg">
          {{ boat.draftM ?? '—' }}<template v-if="boat.draftM !== null"> m</template>
        </dd>
      </div>
      <div>
        <dt class="text-fg-muted">Mast height</dt>
        <dd class="font-semibold text-fg">
          {{ boat.mastHeightM ?? '—' }}<template v-if="boat.mastHeightM !== null"> m</template>
        </dd>
      </div>
      <div>
        <dt class="text-fg-muted">Hull material</dt>
        <dd class="font-semibold text-fg">{{ boat.hullMaterial ?? '—' }}</dd>
      </div>
      <div>
        <dt class="text-fg-muted">Year built</dt>
        <dd class="font-semibold text-fg">{{ boat.yearBuilt ?? '—' }}</dd>
      </div>
      <div>
        <dt class="text-fg-muted">Manufacturer</dt>
        <dd class="font-semibold text-fg">{{ boat.manufacturer ?? '—' }}</dd>
      </div>
      <div>
        <dt class="text-fg-muted">Model</dt>
        <dd class="font-semibold text-fg">{{ boat.model ?? '—' }}</dd>
      </div>
    </dl>
  </BaseCard>
</template>
