<script setup lang="ts">
import { useScrollReveal } from '~/composables/useScrollReveal'

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
    :ref="(el) => sectionEl = el as HTMLElement"
    class="reveal border-y border-bone bg-white px-6 py-12 lg:px-8 lg:py-16"
    :class="{ visible: isVisible }"
  >
    <div class="mx-auto max-w-7xl">
      <div class="grid grid-cols-2 gap-8 md:grid-cols-4">
        <div
          v-for="(stat, idx) in stats"
          :key="stat.label"
          class="reveal text-center"
          :class="[
            `reveal-delay-${idx + 1}`,
            { visible: isVisible },
            idx < stats.length - 1 ? 'md:border-r md:border-bone' : ''
          ]"
        >
          <p class="font-display text-4xl text-fg lg:text-5xl">{{ stat.value }}</p>
          <p class="mt-2 text-sm text-fg-muted">{{ stat.label }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
