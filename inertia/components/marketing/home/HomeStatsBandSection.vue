<script setup lang="ts">
import { useScrollReveal } from '~/composables/use_scroll_reveal'
import PortsMapCanvas from '../canvas/PortsMapCanvas.vue'
import HomeStatValue from './HomeStatValue.vue'

interface StatItem {
  value: string
  label: string
}

defineProps<{
  stats: StatItem[]
}>()

const { el: sectionEl, isVisible } = useScrollReveal()
</script>

<template>
  <section
    :ref="sectionEl"
    class="reveal relative overflow-hidden px-6 py-16 lg:px-8 lg:py-20"
    :class="{ visible: isVisible }"
  >
    <div class="absolute inset-0 bg-navy-900" aria-hidden="true">
      <PortsMapCanvas variant="dark" :intensity="0.55" />
    </div>
    <div class="relative mx-auto max-w-7xl">
      <div class="grid grid-cols-2 gap-8 md:grid-cols-4">
        <div
          v-for="(stat, idx) in stats"
          :key="stat.label"
          class="reveal text-center"
          :class="[
            `reveal-delay-${idx + 1}`,
            { visible: isVisible },
            idx < stats.length - 1 ? 'md:border-r md:border-white/10' : '',
          ]"
        >
          <p class="font-display text-4xl text-white lg:text-5xl">
            <HomeStatValue :value="stat.value" />
          </p>
          <p class="mt-2 text-sm text-white/60">{{ stat.label }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
