<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { computed } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import type { EngineListItem } from '#shared/types/engine'
import { useT } from '~/composables/use_t'
import { engineDisplayTitle, engineKindLabel } from '~/utils/boat_enum_labels'
import { engineStatusVariant } from '~/utils/engine_status'

const { t } = useT()

const props = defineProps<{
  engines: EngineListItem[]
}>()

// Colonnes masquées quand aucune ligne affichée ne renseigne la donnée, pour
// éviter une colonne entièrement remplie de « — » (même règle que BoatTable).
const showFamily = computed(() => props.engines.some((engine) => engine.family))
const showPower = computed(() => props.engines.some((engine) => engine.powerHp !== null))
const showHours = computed(() => props.engines.some((engine) => engine.hours !== null))
</script>

<template>
  <div
    class="overflow-x-auto rounded-(--radius-card) border border-border bg-surface-elevated shadow-(--shadow-card)"
  >
    <table class="w-full text-left text-sm">
      <thead class="bg-surface-muted text-fg-muted">
        <tr>
          <th class="px-4 py-3 font-semibold">{{ t('engines.list.table.engine') }}</th>
          <th class="px-4 py-3 font-semibold">{{ t('engines.list.table.boat') }}</th>
          <th class="px-4 py-3 font-semibold">{{ t('engines.list.table.kind') }}</th>
          <th v-if="showFamily" class="px-4 py-3 font-semibold">
            {{ t('engines.list.table.family') }}
          </th>
          <th v-if="showPower" class="px-4 py-3 font-semibold">
            {{ t('engines.list.table.power') }}
          </th>
          <th v-if="showHours" class="px-4 py-3 font-semibold">
            {{ t('engines.list.table.hours') }}
          </th>
          <th class="px-4 py-3 font-semibold">{{ t('engines.list.table.status') }}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        <tr
          v-for="engine in engines"
          :key="engine.id"
          class="transition-colors duration-(--motion-fast) ease-premium hover:bg-lilac-50/60"
        >
          <td class="px-4 py-3">
            <Link
              :href="`/boats/${engine.boatId}/engines/${engine.id}`"
              class="font-semibold text-fg hover:underline"
            >
              {{ engineDisplayTitle(t, engine) }}
            </Link>
          </td>
          <td class="px-4 py-3">
            <Link :href="`/boats/${engine.boatId}`" class="text-fg-muted hover:underline">
              {{ engine.boatName }}
            </Link>
          </td>
          <td class="px-4 py-3 text-fg-muted">
            {{ engineKindLabel(t, engine.kind) ?? '—' }}
          </td>
          <td v-if="showFamily" class="px-4 py-3 text-fg-muted">
            {{ engine.family ? t(`boats.options.engineFamily.${engine.family}`) : '—' }}
          </td>
          <td v-if="showPower" class="px-4 py-3 text-fg-muted">
            {{
              engine.powerHp !== null
                ? t('engines.list.powerValue', { power: String(engine.powerHp) })
                : '—'
            }}
          </td>
          <td v-if="showHours" class="px-4 py-3 text-fg-muted">
            {{
              engine.hours !== null
                ? t('engines.list.hoursValue', { hours: String(engine.hours) })
                : '—'
            }}
          </td>
          <td class="px-4 py-3">
            <BaseBadge :variant="engineStatusVariant(engine.status)">
              {{ t(`equipment.status.${engine.status}`) }}
            </BaseBadge>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
