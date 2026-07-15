<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import NavIcon from '~/components/layout/NavIcon.vue'
import { useT } from '~/composables/use_t'

const { t } = useT()

defineProps<{ boatId: number; mode: 'management' | 'navigation' }>()

const itemClass =
  'inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30'
</script>

<template>
  <div class="inline-flex gap-1.5" role="group" :aria-label="t('boats.show.modeSwitch.aria')">
    <Link
      :href="`/boats/${boatId}`"
      :aria-current="mode === 'management' ? 'page' : undefined"
      :class="[
        itemClass,
        mode === 'management'
          ? 'bg-brand text-white shadow-(--shadow-xs)'
          : 'bg-surface-muted text-fg-muted hover:bg-surface-elevated hover:text-fg',
      ]"
    >
      <NavIcon name="gear" />
      {{ t('boats.show.modeSwitch.management') }}
    </Link>
    <Link
      :href="`/boats/${boatId}/navigation`"
      :aria-current="mode === 'navigation' ? 'page' : undefined"
      :class="[
        itemClass,
        mode === 'navigation'
          ? 'bg-brand text-white shadow-(--shadow-xs)'
          : 'bg-surface-muted text-fg-muted hover:bg-surface-elevated hover:text-fg',
      ]"
    >
      <NavIcon name="compass" />
      {{ t('boats.show.modeSwitch.navigation') }}
    </Link>
  </div>
</template>
