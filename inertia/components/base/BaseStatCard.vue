<script setup lang="ts">
import BaseBadge from '~/components/base/BaseBadge.vue'
import { useT } from '~/composables/use_t'

const { t } = useT()

withDefaults(
  defineProps<{
    label: string
    value: string
    delta?: string
    tone?: 'neutral' | 'success' | 'info' | 'warning' | 'empty'
    href?: string
  }>(),
  { delta: undefined, tone: 'neutral', href: undefined }
)
</script>

<template>
  <!-- Densité responsive (#828) : en 390 px les cartes tiennent à deux par
       ligne, le padding et le chiffre se resserrent d'un cran sous `sm`. -->
  <component
    :is="href ? 'a' : 'div'"
    :href="href || undefined"
    class="rounded-(--radius-card) border border-border bg-surface-elevated p-4 shadow-(--shadow-xs) transition-[transform,box-shadow] duration-(--motion-fast) ease-premium hover:shadow-(--shadow-sm) hover:scale-[1.01] sm:p-5"
    :class="href ? 'block cursor-pointer' : ''"
  >
    <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <div class="flex items-center gap-1.5 min-w-0">
        <span v-if="$slots.icon" class="shrink-0 text-fg-muted">
          <slot name="icon" />
        </span>
        <p class="text-sm font-semibold text-fg-muted">
          {{ label }}
        </p>
      </div>
      <!-- `neutral` = rien à signaler : pas de pastille « Normal » sur chaque
           carte, le badge ne sort que pour porter une information (#828). -->
      <BaseBadge v-if="tone !== 'neutral'" :variant="tone" class="shrink-0">
        {{ t(`common.tone.${tone}`) }}
      </BaseBadge>
    </div>
    <p class="mt-2 font-display text-2xl font-bold tracking-tight text-fg sm:mt-3 sm:text-3xl">
      {{ value }}
    </p>
    <p v-if="delta" class="mt-1 text-sm text-fg-subtle">
      {{ delta }}
    </p>
  </component>
</template>
