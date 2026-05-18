<script setup lang="ts">
import { WrenchScrewdriverIcon } from '@heroicons/vue/24/outline'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import { useT } from '~/composables/useT'
import type { BoatShowDetail } from '~/types/boat_show'

defineProps<{
  boat: BoatShowDetail
}>()

const { t } = useT()
</script>

<template>
  <div class="flex flex-col lg:flex-row gap-6">
    <!-- Left column -->
    <div class="flex-1 space-y-6">
      <!-- Identity card -->
      <BaseCard padded>
        <template #header>
          <div class="flex items-center justify-between">
            <p class="text-sm font-semibold text-fg">{{ t('boats.specs.identity') }}</p>
            <a :href="`/boats/${boat.id}/edit`">
              <BaseButton variant="ghost" size="sm">{{ t('common.edit') }}</BaseButton>
            </a>
          </div>
        </template>
        <dl class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt class="text-fg-muted">{{ t('boats.hullFields.name') }}</dt>
            <dd class="font-semibold text-fg">{{ boat.name }}</dd>
          </div>
          <div>
            <dt class="text-fg-muted">{{ t('boats.hullFields.type') }}</dt>
            <dd class="font-semibold text-fg">{{ boat.type ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-fg-muted">{{ t('boats.hullFields.registrationNumber') }}</dt>
            <dd class="font-semibold text-fg">{{ boat.registrationNumber ?? '—' }}</dd>
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
        </dl>
      </BaseCard>

      <!-- Dimensions card -->
      <BaseCard padded>
        <template #header>
          <p class="text-sm font-semibold text-fg">{{ t('boats.specs.dimensions') }}</p>
        </template>
        <dl class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt class="text-fg-muted">{{ t('boats.hullFields.lengthM') }}</dt>
            <dd class="font-semibold text-fg">{{ boat.lengthM ? `${boat.lengthM} m` : '—' }}</dd>
          </div>
          <div>
            <dt class="text-fg-muted">{{ t('boats.hullFields.beamM') }}</dt>
            <dd class="font-semibold text-fg">{{ boat.beamM ? `${boat.beamM} m` : '—' }}</dd>
          </div>
          <div>
            <dt class="text-fg-muted">{{ t('boats.hullFields.draftM') }}</dt>
            <dd class="font-semibold text-fg">{{ boat.draftM ? `${boat.draftM} m` : '—' }}</dd>
          </div>
          <div>
            <dt class="text-fg-muted">{{ t('boats.hullFields.mastHeightM') }}</dt>
            <dd class="font-semibold text-fg">{{ boat.mastHeightM ? `${boat.mastHeightM} m` : '—' }}</dd>
          </div>
        </dl>
      </BaseCard>

      <!-- Hull & materials card -->
      <BaseCard padded>
        <template #header>
          <p class="text-sm font-semibold text-fg">{{ t('boats.specs.hullMaterials') }}</p>
        </template>
        <dl class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt class="text-fg-muted">{{ t('boats.hullFields.hullMaterial') }}</dt>
            <dd class="font-semibold text-fg">{{ boat.hullMaterial ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-fg-muted">{{ t('boats.hullFields.propulsionType') }}</dt>
            <dd class="font-semibold text-fg">{{ boat.propulsionType ?? '—' }}</dd>
          </div>
        </dl>
      </BaseCard>

      <!-- Registration card -->
      <BaseCard padded>
        <template #header>
          <p class="text-sm font-semibold text-fg">{{ t('boats.specs.registration') }}</p>
        </template>
        <dl class="grid grid-cols-2 gap-4 text-sm">
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

      <!-- Equipment on board card -->
      <BaseCard padded>
        <template #header>
          <p class="text-sm font-semibold text-fg">{{ t('boats.specs.equipmentOnBoard') }}</p>
        </template>
        <dl class="grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt class="text-fg-muted">{{ t('boats.engines.title') }}</dt>
            <dd class="font-semibold text-fg">{{ boat.engines.length }}</dd>
          </div>
          <div>
            <dt class="text-fg-muted">{{ t('boats.sails.title') }}</dt>
            <dd class="font-semibold text-fg">{{ boat.sails.length }}</dd>
          </div>
          <div>
            <dt class="text-fg-muted">{{ t('boats.rig.title') }}</dt>
            <dd class="font-semibold text-fg">{{ boat.rig ? t('common.yes') : t('common.no') }}</dd>
          </div>
        </dl>
      </BaseCard>
    </div>

    <!-- Right column (w-64) -->
    <div class="w-full lg:w-64 space-y-6">
      <BaseCard padded>
        <div class="flex items-start gap-3">
          <WrenchScrewdriverIcon class="h-5 w-5 text-fg-muted shrink-0" />
          <p class="text-sm text-fg-muted">
            {{ t('boats.specs.editHint') }}
          </p>
        </div>
        <div class="mt-4">
          <a :href="`/boats/${boat.id}/edit`">
            <BaseButton variant="secondary" size="sm" class="w-full">
              {{ t('boats.show.editBoat') }}
            </BaseButton>
          </a>
        </div>
      </BaseCard>
    </div>
  </div>
</template>
