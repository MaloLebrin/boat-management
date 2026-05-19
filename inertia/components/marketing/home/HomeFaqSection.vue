<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useScrollReveal } from '~/composables/useScrollReveal'

interface FaqItem {
  q: string
  a: string
}

defineProps<{
  title: string
  subtitle: string
  cta: { label: string; href: string }
  items: FaqItem[]
}>()

const openIndex = ref<number | null>(0)

function toggle(idx: number) {
  openIndex.value = openIndex.value === idx ? null : idx
}

const { el: sectionEl, isVisible } = useScrollReveal()
</script>

<template>
  <section
    :ref="(el) => sectionEl = el as HTMLElement"
    class="reveal bg-cream px-6 py-20 lg:px-8 lg:py-24"
    :class="{ visible: isVisible }"
  >
    <div class="mx-auto max-w-7xl">
      <div class="grid gap-12 lg:grid-cols-2 lg:gap-16">
        <!-- Left: title + CTA -->
        <div>
          <h2 class="font-display text-3xl leading-tight text-fg lg:text-4xl">{{ title }}</h2>
          <p class="mt-4 text-fg-muted">{{ subtitle }}</p>
          <div class="mt-8">
            <a :href="cta.href">
              <BaseButton>{{ cta.label }}</BaseButton>
            </a>
          </div>
        </div>

        <!-- Right: accordion -->
        <div class="divide-y divide-bone overflow-hidden rounded-xl border border-bone bg-white">
          <div
            v-for="(item, idx) in items"
            :key="item.q"
          >
            <button
              type="button"
              class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-fg hover:bg-paper/50"
              @click="toggle(idx)"
            >
              <span>{{ item.q }}</span>
              <span
                class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-bone text-fg-muted transition-transform duration-200"
                :class="{ 'rotate-45': openIndex === idx }"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m6-6H6" />
                </svg>
              </span>
            </button>
            <div
              class="overflow-hidden transition-all duration-300"
              :style="{
                maxHeight: openIndex === idx ? '200px' : '0',
                opacity: openIndex === idx ? 1 : 0,
              }"
            >
              <p class="px-5 pb-4 text-sm text-fg-muted">{{ item.a }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
