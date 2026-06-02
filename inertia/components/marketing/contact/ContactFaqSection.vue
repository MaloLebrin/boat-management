<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDownIcon } from '@heroicons/vue/24/outline'
import { useScrollReveal } from '~/composables/use_scroll_reveal'

interface FaqItem {
  q: string
  a: string
}

defineProps<{
  eyebrow: string
  title: string
  titleHighlight: string
  items: FaqItem[]
}>()

const { el, isVisible } = useScrollReveal()
const openIndex = ref<number | null>(null)

function toggle(idx: number) {
  openIndex.value = openIndex.value === idx ? null : idx
}
</script>

<template>
  <section
    :ref="(r) => (el = r as HTMLElement)"
    class="reveal bg-paper px-6 py-20 lg:px-8"
    :class="{ visible: isVisible }"
  >
    <div class="mx-auto max-w-7xl">
      <div class="grid gap-12 lg:grid-cols-[1fr_2fr]">
        <!-- Left -->
        <div>
          <p class="font-mono text-xs font-semibold uppercase tracking-widest text-fg-subtle">
            {{ eyebrow }}
          </p>
          <h2 class="mt-3 font-display text-3xl leading-tight text-fg lg:text-4xl">
            {{ title }} <em class="text-coral-500">{{ titleHighlight }}</em>
          </h2>
        </div>

        <!-- Right: accordion -->
        <div class="divide-y divide-bone overflow-hidden rounded-2xl border border-bone bg-white">
          <div v-for="(item, idx) in items" :key="item.q">
            <button
              type="button"
              class="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-cream/50"
              @click="toggle(idx)"
            >
              <span class="font-semibold text-fg">{{ item.q }}</span>
              <ChevronDownIcon
                :class="[
                  'h-5 w-5 shrink-0 text-fg-muted transition-transform duration-200',
                  openIndex === idx ? 'rotate-180' : '',
                ]"
              />
            </button>
            <div v-show="openIndex === idx" class="px-6 pb-4 text-sm leading-relaxed text-fg-muted">
              {{ item.a }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
