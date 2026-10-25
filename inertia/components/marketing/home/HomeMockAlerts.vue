<script setup lang="ts">
import { ExclamationCircleIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import { useT } from '~/composables/use_t'

/**
 * Alertes en cours de la maquette Instruments (#995) : deux lignes qui glissent
 * l'une après l'autre ; l'icône de l'alerte critique pulse. Cohérent avec les
 * jauges (moteur chaud, batterie basse).
 */
defineProps<{ delay?: number }>()

const { t } = useT()

const alerts = [
  {
    key: 'alert',
    icon: ExclamationCircleIcon,
    tone: 'bg-coral-100 text-coral-700',
    level: 'critical',
  },
  {
    key: 'batteryLow',
    icon: ExclamationTriangleIcon,
    tone: 'bg-amber-100 text-amber-700',
    level: 'warning',
  },
] as const
</script>

<template>
  <div>
    <p class="mb-1 font-semibold uppercase tracking-wide text-fg-subtle">
      {{ t('homePreview.mock.instruments.alertsTitle') }}
    </p>
    <ul class="space-y-1" data-testid="mock-instruments-alerts">
      <li
        v-for="(alert, index) in alerts"
        :key="alert.key"
        class="mock-slide flex items-center gap-2 rounded-lg px-3 py-1 font-medium"
        :class="alert.tone"
        :style="{ animationDelay: `${(delay ?? 0) + index * 220}ms` }"
      >
        <component
          :is="alert.icon"
          class="h-3.5 w-3.5 shrink-0"
          :class="{ 'animate-pulse': alert.level === 'critical' }"
          aria-hidden="true"
        />
        <span class="flex-1">{{ t(`homePreview.mock.instruments.${alert.key}`) }}</span>
        <span class="rounded-full bg-surface-elevated px-1.5 py-0.5 text-[8px] text-fg">
          {{ t(`homePreview.mock.instruments.${alert.level}`) }}
        </span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
@keyframes mock-slide {
  from {
    opacity: 0;
    transform: translateX(24px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.mock-slide {
  animation: mock-slide 560ms var(--ease-premium, ease-out) both;
}
</style>
