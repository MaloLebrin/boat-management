<script setup lang="ts">
import BaseHeading from '~/components/base/BaseHeading.vue'
import { useScrollReveal } from '~/composables/useScrollReveal'

defineProps<{
  timeline: {
    title: string
    items: Array<{ year: string; label: string; description: string }>
  }
}>()

const { el: sectionEl, isVisible: sectionVisible } = useScrollReveal()
</script>

<template>
  <section
    :ref="(el) => sectionEl = el as HTMLElement"
    class="reveal py-14"
    :class="{ visible: sectionVisible }"
  >
    <!-- Title -->
    <div class="text-center mb-12">
      <BaseHeading level="2">{{ timeline.title }}</BaseHeading>
    </div>

    <!-- Timeline -->
    <div class="relative before:absolute before:left-1/2 before:top-0 before:bottom-0 before:w-px before:bg-bone">
      <div
        v-for="(item, idx) in timeline.items"
        :key="item.year"
        class="reveal relative grid grid-cols-2 gap-8 py-6"
        :class="[`reveal-delay-${idx + 1}`, { visible: sectionVisible }]"
      >
        <!-- Year (left) -->
        <div class="text-right pr-8">
          <p class="font-display text-2xl italic text-navy-700">{{ item.year }}</p>
        </div>

        <!-- Central point -->
        <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div class="h-3 w-3 rounded-full bg-navy-700 border-2 border-white" />
        </div>

        <!-- Content (right) -->
        <div class="pl-8">
          <p class="font-semibold text-fg">{{ item.label }}</p>
          <p class="text-sm text-fg-muted">{{ item.description }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
