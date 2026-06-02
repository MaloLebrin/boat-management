<script setup lang="ts">
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import { useT } from '~/composables/use_t'
import type { BoatShowEngine, MaintenanceTaskRow } from '~/types/boat_show'

const { t } = useT()

const props = defineProps<{
  boat: { id: number; name: string }
  engine: BoatShowEngine
  openTasks: MaintenanceTaskRow[]
  canManage: boolean
}>()

function formatYear(iso: string): string {
  return new Date(iso).getFullYear().toString()
}
</script>

<template>
  <div class="flex flex-col lg:flex-row gap-6">
    <div class="flex-1 space-y-6">
      <!-- Identite -->
      <BaseCard>
        <p class="text-sm font-semibold text-fg mb-4">{{ t('boats.engineShow.specs.identity') }}</p>
        <dl class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt class="text-fg-muted">{{ t('boats.engineShow.specs.brand') }}</dt>
            <dd class="font-medium text-fg">{{ engine.brand ?? '-' }}</dd>
          </div>
          <div>
            <dt class="text-fg-muted">{{ t('boats.engineShow.specs.model') }}</dt>
            <dd class="font-medium text-fg">{{ engine.model ?? '-' }}</dd>
          </div>
          <div>
            <dt class="text-fg-muted">{{ t('boats.engineShow.specs.serialNumber') }}</dt>
            <dd class="font-medium text-fg">{{ engine.serialNumber ?? '-' }}</dd>
          </div>
          <div>
            <dt class="text-fg-muted">{{ t('boats.engineShow.specs.installYear') }}</dt>
            <dd class="font-medium text-fg">
              {{ engine.manufacturedAt ? formatYear(engine.manufacturedAt) : '-' }}
            </dd>
          </div>
          <div>
            <dt class="text-fg-muted">{{ t('boats.engineShow.specs.installHours') }}</dt>
            <dd class="font-medium text-fg">{{ engine.installHours ?? '-' }}</dd>
          </div>
        </dl>
      </BaseCard>

      <!-- Caracteristiques -->
      <BaseCard>
        <p class="text-sm font-semibold text-fg mb-4">
          {{ t('boats.engineShow.specs.characteristics') }}
        </p>
        <dl class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt class="text-fg-muted">{{ t('boats.engineShow.specs.power') }}</dt>
            <dd class="font-medium text-fg">{{ engine.powerHp ? `${engine.powerHp} HP` : '-' }}</dd>
          </div>
          <div>
            <dt class="text-fg-muted">{{ t('boats.engineShow.specs.fuel') }}</dt>
            <dd class="font-medium text-fg">{{ engine.fuel ?? '-' }}</dd>
          </div>
          <div>
            <dt class="text-fg-muted">{{ t('boats.engineShow.specs.type') }}</dt>
            <dd class="font-medium text-fg">{{ engine.kind }}</dd>
          </div>
          <div v-if="engine.strokeType">
            <dt class="text-fg-muted">{{ t('boats.engineShow.specs.strokeType') }}</dt>
            <dd class="font-medium text-fg">
              {{ t(`boats.options.strokeType.${engine.strokeType}`) }}
            </dd>
          </div>
        </dl>
      </BaseCard>

      <!-- Seuils de maintenance -->
      <BaseCard>
        <p class="text-sm font-semibold text-fg mb-4">
          {{ t('boats.engineShow.specs.thresholds') }}
        </p>
        <div
          v-if="openTasks.filter((t) => t.recurrenceIntervalEngineHours).length === 0"
          class="text-sm text-fg-muted"
        >
          {{ t('boats.engineShow.specs.noThreshold') }}
        </div>
        <ul v-else class="space-y-3">
          <li
            v-for="task in openTasks.filter((t) => t.recurrenceIntervalEngineHours)"
            :key="task.id"
            class="flex items-center justify-between text-sm"
          >
            <span class="font-medium text-fg">{{ task.title }}</span>
            <span class="text-fg-muted">{{
              t('boats.engineShow.specs.every', {
                hours: String(task.recurrenceIntervalEngineHours),
              })
            }}</span>
          </li>
        </ul>
      </BaseCard>
    </div>

    <!-- Right info -->
    <div class="w-full lg:w-64">
      <BaseCard>
        <p class="text-sm text-fg-muted">
          {{ t('boats.engineShow.specs.editHint') }}
        </p>
        <div class="mt-4">
          <BaseButton
            variant="secondary"
            size="sm"
            :href="`/boats/${props.boat.id}/engines/${engine.id}/edit`"
          >
            {{ t('boats.engineShow.actions.edit') }}
          </BaseButton>
        </div>
      </BaseCard>
    </div>
  </div>
</template>
