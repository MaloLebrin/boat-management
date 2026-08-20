<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '~/composables/use_t'
import { PLAN_LIMITS } from '../../../shared/types/plan'
import type { PlanTier, QuotaUsage } from '../../../shared/types/plan'

const { t } = useT()

const props = defineProps<{
  plan: PlanTier
  quotaUsage: QuotaUsage
}>()

/**
 * « IA / Copilote » et « Personnalisation IA » sont deux capacités distinctes
 * (#456) : Pro coche la première mais pas la seconde. Les fusionner en une
 * seule ligne cochée faisait croire que `/settings/ai` était ouvert, alors que
 * la page renvoie sur la facturation. `canCustomizeAI` n'est accordé par aucun
 * module add-on : le tier est ici la source de vérité.
 */
const rows = computed(() => [
  { key: 'ai', enabled: props.quotaUsage.canUseAI },
  { key: 'aiCustomization', enabled: PLAN_LIMITS[props.plan].canCustomizeAI },
  { key: 'export', enabled: props.quotaUsage.canExport },
  { key: 'maintenanceHistory', enabled: true },
])
</script>

<template>
  <ul class="space-y-2 text-sm">
    <li
      v-for="row in rows"
      :key="row.key"
      class="flex items-center gap-2"
      :class="row.enabled ? 'text-fg' : 'text-fg-muted'"
    >
      <span :class="row.enabled ? 'text-success' : 'text-fg-muted'">
        {{ row.enabled ? '✓' : '✗' }}
      </span>
      {{ t(`settings.billing.features.${row.key}`) }}
    </li>
  </ul>
</template>
