<script setup lang="ts">
import { ref } from 'vue'

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

const openIndex = ref<number | null>(null)

function toggle(i: number) {
  openIndex.value = openIndex.value === i ? null : i
}
</script>

<template>
  <section class="bg-cream px-6 py-12 lg:px-8 lg:py-16">
    <div class="mx-auto max-w-3xl">
      <p class="text-xs font-semibold uppercase tracking-widest text-fg-subtle">{{ eyebrow }}</p>
      <h2 class="mt-2 font-display text-2xl text-fg lg:text-3xl">
        {{ title }}
        <em class="text-coral-500 not-italic">{{ titleHighlight }}</em>
      </h2>

      <dl class="mt-8 divide-y divide-bone">
        <div
          v-for="(item, i) in items"
          :key="i"
          class="py-4"
        >
          <button
            type="button"
            class="flex w-full items-start justify-between gap-4 text-left"
            :aria-expanded="openIndex === i"
            @click="toggle(i)"
          >
            <dt class="font-semibold text-fg">{{ item.q }}</dt>
            <span
              class="mt-0.5 shrink-0 text-fg-muted transition-transform duration-200"
              :class="openIndex === i ? 'rotate-45' : ''"
              aria-hidden="true"
            >+</span>
          </button>
          <dd
            v-if="openIndex === i"
            class="mt-3 text-sm text-fg-muted leading-relaxed"
          >
            {{ item.a }}
          </dd>
        </div>
      </dl>
    </div>
  </section>
</template>
