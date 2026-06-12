<script setup lang="ts">
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import { useT } from '~/composables/use_t'
import type { BoatShowDetail } from '~/types/boat_show'

defineProps<{ boat: BoatShowDetail }>()
const emit = defineEmits<{ 'go-to-tab': [tab: string] }>()
const { t } = useT()
</script>

<template>
  <BaseCard padded>
    <template #header>
      <p class="text-sm font-semibold text-fg">{{ t('boats.show.overview.dimensionsTitle') }}</p>
    </template>
    <dl class="grid grid-cols-2 gap-4 text-sm">
      <div>
        <dt class="text-fg-muted">{{ t('boats.show.overview.length') }}</dt>
        <dd class="font-semibold text-fg">{{ boat.lengthM ? `${boat.lengthM} m` : '—' }}</dd>
      </div>
      <div>
        <dt class="text-fg-muted">{{ t('boats.show.overview.beam') }}</dt>
        <dd class="font-semibold text-fg">{{ boat.beamM ? `${boat.beamM} m` : '—' }}</dd>
      </div>
      <div>
        <dt class="text-fg-muted">{{ t('boats.show.overview.draft') }}</dt>
        <dd class="font-semibold text-fg">{{ boat.draftM ? `${boat.draftM} m` : '—' }}</dd>
      </div>
      <div>
        <dt class="text-fg-muted">{{ t('boats.show.overview.mastHeight') }}</dt>
        <dd class="font-semibold text-fg">
          {{ boat.mastHeightM ? `${boat.mastHeightM} m` : '—' }}
        </dd>
      </div>
    </dl>
    <div class="mt-4">
      <BaseButton variant="ghost" size="sm" @click="emit('go-to-tab', 'specs')">
        {{ t('boats.show.overview.viewSpecs') }}
      </BaseButton>
    </div>
  </BaseCard>
</template>
