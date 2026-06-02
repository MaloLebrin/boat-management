<script setup lang="ts">
import { useScrollReveal } from '~/composables/use_scroll_reveal'

interface ProblemItem {
  number: string
  label: string
  title: string
  stat: string
  statSub: string
  body: string
}

defineProps<{
  title: string
  titleHighlight: string
  items: ProblemItem[]
}>()

const { el: sectionEl, isVisible } = useScrollReveal()
</script>

<template>
  <section
    :ref="(el) => (sectionEl = el as HTMLElement)"
    class="reveal bg-cream px-6 py-20 lg:px-8 lg:py-24"
    :class="{ visible: isVisible }"
  >
    <div class="mx-auto max-w-7xl">
      <!-- Title -->
      <h2
        class="mx-auto mb-12 max-w-3xl text-center font-display text-3xl leading-tight text-fg lg:text-4xl"
      >
        {{ title }} <em class="text-coral-500">{{ titleHighlight }}</em>
      </h2>

      <!-- Cards -->
      <div class="grid gap-6 md:grid-cols-3">
        <div
          v-for="(item, idx) in items"
          :key="item.title"
          class="reveal rounded-xl border border-bone bg-white p-6 shadow-sm"
          :class="[`reveal-delay-${idx + 1}`, { visible: isVisible }]"
        >
          <p class="mb-4 font-mono text-xs font-medium text-coral-700">
            {{ item.number }} · {{ item.label }}
          </p>
          <h3 class="mb-3 text-lg font-semibold text-fg">
            {{ item.title }}
          </h3>
          <p class="mb-4 font-display text-4xl text-coral-500">
            {{ item.stat }}
          </p>
          <p class="mb-2 text-sm font-medium text-fg-muted">
            {{ item.statSub }}
          </p>
          <p class="text-sm text-fg-muted">
            {{ item.body }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
