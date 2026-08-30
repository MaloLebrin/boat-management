<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import type { EngineListItem } from '#shared/types/engine'
import { useT } from '~/composables/use_t'
import { engineDisplayTitle, engineKindLabel } from '~/utils/boat_enum_labels'
import { engineStatusVariant } from '~/utils/engine_status'

const { t } = useT()

defineProps<{
  engines: EngineListItem[]
}>()
</script>

<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
    <Link
      v-for="engine in engines"
      :key="engine.id"
      :href="`/boats/${engine.boatId}/engines/${engine.id}`"
      class="group"
    >
      <BaseCard padded class="h-full transition-shadow hover:shadow-md">
        <div class="flex items-start justify-between gap-3">
          <h3 class="min-w-0 font-semibold text-fg group-hover:text-brand">
            {{ engineDisplayTitle(t, engine) }}
          </h3>
          <BaseBadge :variant="engineStatusVariant(engine.status)" class="shrink-0">
            {{ t(`equipment.status.${engine.status}`) }}
          </BaseBadge>
        </div>

        <p class="mt-1 text-sm text-fg-muted">{{ engine.boatName }}</p>

        <p class="mt-1 text-sm text-fg-subtle">
          {{ engineKindLabel(t, engine.kind) }} ·
          {{
            engine.family
              ? t(`boats.options.engineFamily.${engine.family}`)
              : t('engines.list.unknownFamily')
          }}
        </p>

        <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted">
          <span v-if="engine.powerHp !== null">
            {{ t('engines.list.powerValue', { power: String(engine.powerHp) }) }}
          </span>
          <span>
            {{
              engine.hours !== null
                ? t('engines.list.hoursValue', { hours: String(engine.hours) })
                : t('engines.list.noHours')
            }}
          </span>
        </div>
      </BaseCard>
    </Link>
  </div>
</template>
