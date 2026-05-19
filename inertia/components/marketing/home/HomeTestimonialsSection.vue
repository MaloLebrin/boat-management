<script setup lang="ts">
import { ChatBubbleLeftRightIcon } from '@heroicons/vue/24/outline'
import { useScrollReveal } from '~/composables/useScrollReveal'

interface TestimonialItem {
  quote: string
  author: string
  role: string
  company?: string
  featured?: boolean
}

defineProps<{
  title: string
  items: TestimonialItem[]
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
      <!-- Header -->
      <div class="mb-10 text-center">
        <h2 class="font-display text-3xl text-fg lg:text-4xl">{{ title }}</h2>
      </div>

      <!-- Featured testimonial -->
      <div
        v-if="items[0]?.featured"
        class="reveal mb-8 rounded-xl border border-bone bg-white p-8 shadow-sm lg:p-10"
        :class="{ visible: isVisible }"
      >
        <ChatBubbleLeftRightIcon class="mb-4 h-8 w-8 text-coral-400" />
        <blockquote class="font-display text-2xl italic leading-relaxed text-fg lg:text-3xl">
          "{{ items[0].quote }}"
        </blockquote>
        <div class="mt-6">
          <p class="font-semibold text-fg">{{ items[0].author }}</p>
          <p class="text-sm text-fg-muted">{{ items[0].role }}</p>
        </div>
      </div>

      <!-- Grid of smaller testimonials -->
      <div class="grid gap-6 md:grid-cols-3">
        <div
          v-for="(item, idx) in items.slice(1)"
          :key="item.author"
          class="reveal rounded-xl border border-bone bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
          :class="[`reveal-delay-${idx + 1}`, { visible: isVisible }]"
        >
          <ChatBubbleLeftRightIcon class="mb-3 h-6 w-6 text-coral-300" />
          <p class="text-sm italic text-fg-muted">
            "{{ item.quote }}"
          </p>
          <div class="mt-4">
            <p class="font-semibold text-fg">{{ item.author }}</p>
            <p class="text-xs text-fg-subtle">{{ item.role }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
