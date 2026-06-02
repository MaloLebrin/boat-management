<script setup lang="ts">
import { ref } from 'vue'
import {
  ClipboardDocumentCheckIcon,
  ComputerDesktopIcon,
  DocumentTextIcon,
  SparklesIcon,
} from '@heroicons/vue/24/outline'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { useScrollReveal } from '~/composables/use_scroll_reveal'

defineProps<{
  screenshots: {
    title: string
    subtitle: string
    items: Array<{ label: string; description: string; hint: string }>
  }
}>()

const activeTab = ref(0)
const { el: sectionEl, isVisible: sectionVisible } = useScrollReveal()

const tabIcons = [ComputerDesktopIcon, DocumentTextIcon, ClipboardDocumentCheckIcon, SparklesIcon]
</script>

<template>
  <section
    :ref="(el) => (sectionEl = el as HTMLElement)"
    class="reveal bg-paper rounded-2xl py-14 px-8"
    :class="{ visible: sectionVisible }"
  >
    <!-- Header -->
    <div class="text-center mb-10">
      <BaseBadge variant="neutral">{{ screenshots.subtitle }}</BaseBadge>
      <BaseHeading level="2" class="mt-3">{{ screenshots.title }}</BaseHeading>
    </div>

    <!-- Tabs -->
    <div class="flex flex-wrap justify-center gap-2 mb-8">
      <button
        v-for="(item, idx) in screenshots.items"
        :key="item.label"
        type="button"
        class="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200"
        :class="
          activeTab === idx
            ? 'bg-navy-900 text-white scale-100'
            : 'bg-bone text-fg-muted hover:bg-bone/80 hover:scale-105'
        "
        @click="activeTab = idx"
      >
        <component :is="tabIcons[idx]" class="h-4 w-4" />
        {{ item.label }}
      </button>
    </div>

    <!-- Tab content -->
    <div class="mt-6">
      <div v-for="(item, idx) in screenshots.items" v-show="activeTab === idx" :key="item.label">
        <p class="text-center text-fg-muted mb-6">{{ item.description }}</p>

        <!-- Placeholder visuel -->
        <div
          class="bg-navy-900/5 rounded-xl h-64 flex flex-col items-center justify-center text-fg-subtle text-sm border border-bone transition-all duration-300"
        >
          <component :is="tabIcons[idx]" class="h-12 w-12 text-fg-subtle mb-2" />
          {{ item.label }}
        </div>

        <p class="mt-4 text-center text-xs text-fg-subtle italic">{{ item.hint }}</p>
      </div>
    </div>
  </section>
</template>
