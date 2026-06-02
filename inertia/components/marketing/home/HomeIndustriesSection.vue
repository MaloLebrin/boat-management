<script setup lang="ts">
import { ref } from 'vue'
import { CheckIcon, ChevronDownIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { useScrollReveal } from '~/composables/use_scroll_reveal'

defineProps<{
  industries: {
    title: string
    subtitle: string
    painsLabel: string
    benefitsLabel: string
    items: Array<{
      icon: string
      title: string
      subtitle: string
      pains: string[]
      benefits: string[]
      quote: { text: string; author: string; role: string }
    }>
  }
}>()

const activePanel = ref(0)
const { el: sectionEl, isVisible: sectionVisible } = useScrollReveal()
</script>

<template>
  <section
    :ref="(el) => (sectionEl = el as HTMLElement)"
    class="reveal mt-14 bg-white rounded-2xl py-14 px-8"
    :class="{ visible: sectionVisible }"
  >
    <!-- Header -->
    <div class="text-center mb-10">
      <BaseHeading level="2">{{ industries.title }}</BaseHeading>
      <p class="mt-2 text-fg-muted">{{ industries.subtitle }}</p>
    </div>

    <!-- Accordion panels -->
    <div class="grid gap-4">
      <div
        v-for="(item, idx) in industries.items"
        :key="item.title"
        class="border border-bone rounded-xl overflow-hidden"
      >
        <!-- Header cliquable -->
        <button
          type="button"
          class="w-full flex items-center gap-4 px-6 py-5 text-left bg-cream hover:bg-bone/60 transition-colors duration-200"
          @click="activePanel = activePanel === idx ? -1 : idx"
        >
          <span class="text-2xl">{{ item.icon }}</span>
          <div class="flex-1">
            <p class="font-semibold text-fg">{{ item.title }}</p>
            <p class="text-sm text-fg-muted">{{ item.subtitle }}</p>
          </div>
          <ChevronDownIcon
            class="h-5 w-5 text-fg-muted transition-transform duration-300"
            :class="{ 'rotate-180': activePanel === idx }"
          />
        </button>

        <!-- Contenu (v-show) -->
        <div v-show="activePanel === idx" class="px-6 pb-6">
          <!-- Pain points & Benefits -->
          <div class="grid gap-4 md:grid-cols-2 mt-4">
            <!-- Pain points -->
            <div class="bg-coral-50 rounded-xl p-5">
              <p class="font-semibold text-coral-700 mb-3">{{ industries.painsLabel }}</p>
              <ul class="space-y-2">
                <li
                  v-for="pain in item.pains"
                  :key="pain"
                  class="flex items-center gap-2 text-sm text-fg-muted"
                >
                  <XMarkIcon class="h-4 w-4 shrink-0 text-coral-500" />
                  <span>{{ pain }}</span>
                </li>
              </ul>
            </div>

            <!-- Benefits -->
            <div class="bg-mint-50 rounded-xl p-5">
              <p class="font-semibold text-mint-700 mb-3">{{ industries.benefitsLabel }}</p>
              <ul class="space-y-2">
                <li
                  v-for="benefit in item.benefits"
                  :key="benefit"
                  class="flex items-center gap-2 text-sm text-fg-muted"
                >
                  <CheckIcon class="h-4 w-4 shrink-0 text-mint-700" />
                  <span>{{ benefit }}</span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Quote -->
          <div class="mt-4 bg-navy-900 text-white rounded-xl p-4">
            <p class="text-sm italic">"{{ item.quote.text }}"</p>
            <div class="mt-2">
              <p class="text-xs font-semibold text-white/90">{{ item.quote.author }}</p>
              <p class="text-xs text-white/60">{{ item.quote.role }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
