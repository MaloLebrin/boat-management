<script setup lang="ts">
import type { BoatShowDetail } from '~/types/boat_show'
import BaseCard from '~/components/base/BaseCard.vue'
import { useT } from '~/composables/use_t'

defineProps<{
  boat: BoatShowDetail
}>()

const { t } = useT()
</script>

<template>
  <BaseCard padded>
    <template #header>
      <p class="text-sm font-semibold text-fg">{{ t('boats.show.tabs.specs') }}</p>
    </template>
    <dl class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
      <div>
        <dt class="text-fg-muted">{{ t('boats.hullFields.lengthM') }}</dt>
        <dd class="font-semibold text-fg">
          {{ boat.lengthM ?? '—' }}<template v-if="boat.lengthM !== null"> m</template>
        </dd>
      </div>
      <div>
        <dt class="text-fg-muted">{{ t('boats.hullFields.beamM') }}</dt>
        <dd class="font-semibold text-fg">
          {{ boat.beamM ?? '—' }}<template v-if="boat.beamM !== null"> m</template>
        </dd>
      </div>
      <div>
        <dt class="text-fg-muted">{{ t('boats.hullFields.draftM') }}</dt>
        <dd class="font-semibold text-fg">
          {{ boat.draftM ?? '—' }}<template v-if="boat.draftM !== null"> m</template>
        </dd>
      </div>
      <div>
        <dt class="text-fg-muted">{{ t('boats.hullFields.mastHeightM') }}</dt>
        <dd class="font-semibold text-fg">
          {{ boat.mastHeightM ?? '—' }}<template v-if="boat.mastHeightM !== null"> m</template>
        </dd>
      </div>
      <div>
        <dt class="text-fg-muted">{{ t('boats.hullFields.hullMaterial') }}</dt>
        <dd class="font-semibold text-fg">{{ boat.hullMaterial ?? '—' }}</dd>
      </div>
      <div>
        <dt class="text-fg-muted">{{ t('boats.hullFields.yearBuilt') }}</dt>
        <dd class="font-semibold text-fg">{{ boat.yearBuilt ?? '—' }}</dd>
      </div>
      <div>
        <dt class="text-fg-muted">{{ t('boats.hullFields.manufacturer') }}</dt>
        <dd class="font-semibold text-fg">{{ boat.manufacturer ?? '—' }}</dd>
      </div>
      <div>
        <dt class="text-fg-muted">{{ t('boats.hullFields.model') }}</dt>
        <dd class="font-semibold text-fg">{{ boat.model ?? '—' }}</dd>
      </div>
      <div>
        <dt class="text-fg-muted">{{ t('boats.hullFields.homePort') }}</dt>
        <dd class="font-semibold text-fg">{{ boat.homePort ?? '—' }}</dd>
      </div>
      <div>
        <dt class="text-fg-muted">{{ t('boats.hullFields.navigationCategory') }}</dt>
        <dd class="font-semibold text-fg">
          <template v-if="boat.navigationCategory">
            {{ t(`boats.options.navigationCategory.${boat.navigationCategory}`) }}
          </template>
          <template v-else>—</template>
        </dd>
      </div>
      <div>
        <dt class="text-fg-muted">{{ t('boats.hullFields.hullIdentificationNumber') }}</dt>
        <dd class="font-semibold text-fg">{{ boat.hullIdentificationNumber ?? '—' }}</dd>
      </div>
      <div>
        <dt class="text-fg-muted">{{ t('boats.hullFields.francisationNumber') }}</dt>
        <dd class="font-semibold text-fg">{{ boat.francisationNumber ?? '—' }}</dd>
      </div>
      <div>
        <dt class="text-fg-muted">{{ t('boats.hullFields.flagCountry') }}</dt>
        <dd class="font-semibold text-fg">{{ boat.flagCountry ?? '—' }}</dd>
      </div>
      <div>
        <dt class="text-fg-muted">{{ t('boats.hullFields.maxPersons') }}</dt>
        <dd class="font-semibold text-fg">{{ boat.maxPersons ?? '—' }}</dd>
      </div>
    </dl>
  </BaseCard>
</template>
