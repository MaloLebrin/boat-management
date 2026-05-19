<script setup lang="ts">
import { useScrollReveal } from '~/composables/useScrollReveal'

interface PillarItem {
  number: string
  title: string
  description: string
  isAi?: boolean
}

defineProps<{
  title: string
  titleHighlight: string
  items: PillarItem[]
}>()

const { el: sectionEl, isVisible } = useScrollReveal()
</script>

<template>
  <section
    :ref="(el) => sectionEl = el as HTMLElement"
    class="reveal bg-paper px-6 py-20 lg:px-8 lg:py-24"
    :class="{ visible: isVisible }"
  >
    <div class="mx-auto max-w-7xl">
      <!-- Title -->
      <h2 class="mx-auto mb-12 max-w-2xl text-center font-display text-3xl leading-tight text-fg lg:text-4xl">
        {{ title }} <em class="text-coral-500">{{ titleHighlight }}</em>
      </h2>

      <!-- Cards -->
      <div class="grid gap-6 md:grid-cols-3">
        <div
          v-for="(item, idx) in items"
          :key="item.title"
          class="reveal rounded-xl border border-bone bg-white p-6"
          :class="[`reveal-delay-${idx + 1}`, { visible: isVisible }]"
        >
          <div
            class="mb-4 flex h-10 w-10 items-center justify-center rounded-lg text-lg font-semibold"
            :class="item.isAi ? 'bg-violet-100 text-violet-700' : 'bg-navy-100 text-navy-700'"
          >
            {{ item.number }}
          </div>
          <h3 class="mb-2 text-lg font-semibold text-fg">
            {{ item.title }}
          </h3>
          <p class="text-sm leading-relaxed text-fg-muted">
            {{ item.description }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
