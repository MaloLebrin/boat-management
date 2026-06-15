<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useScrollReveal } from '~/composables/use_scroll_reveal'

type PersonaKey = 'loueurs' | 'ecoles' | 'marinas' | 'armateurs'

interface PersonaItem {
  key: PersonaKey
  icon: string
  tabLabel: string
  title: string
  subtitle: string
  bullets: string[]
  quote: { text: string; author: string; role: string }
  stat: { value: string; label: string }
}

const props = defineProps<{
  title: string
  subtitle: string
  ctaLabel: string
  items: PersonaItem[]
}>()

const emit = defineEmits<{
  personaChange: [persona: PersonaKey]
}>()

const activeKey = ref<PersonaKey>('loueurs')

const activeItem = computed(
  () => props.items.find((i) => i.key === activeKey.value) || props.items[0]
)

function setActive(key: PersonaKey) {
  activeKey.value = key
  emit('personaChange', key)
}

const { el: sectionEl, isVisible } = useScrollReveal()
</script>

<template>
  <section
    :ref="sectionEl"
    class="reveal bg-cream px-6 py-20 lg:px-8 lg:py-24"
    :class="{ visible: isVisible }"
  >
    <div class="mx-auto max-w-7xl">
      <!-- Header -->
      <div class="mb-10 text-center">
        <h2 class="font-display text-3xl text-fg lg:text-4xl">{{ title }}</h2>
        <p class="mt-2 text-fg-muted">{{ subtitle }}</p>
      </div>

      <!-- Tabs -->
      <div class="mb-8 flex flex-wrap justify-center gap-2">
        <button
          v-for="item in items"
          :key="item.key"
          type="button"
          class="rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200"
          :class="
            activeKey === item.key
              ? 'bg-navy-900 text-white'
              : 'bg-white text-fg-muted hover:bg-paper hover:text-fg'
          "
          @click="setActive(item.key)"
        >
          {{ item.icon }} {{ item.tabLabel }}
        </button>
      </div>

      <!-- Content card -->
      <div class="overflow-hidden rounded-2xl border border-bone bg-white shadow-sm">
        <div class="grid lg:grid-cols-2">
          <!-- Left: details -->
          <div class="p-8 lg:p-10">
            <div
              class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-navy-100 text-2xl"
            >
              {{ activeItem.icon }}
            </div>
            <h3 class="mb-2 text-xl font-semibold text-fg">{{ activeItem.title }}</h3>
            <p class="mb-6 text-fg-muted">{{ activeItem.subtitle }}</p>

            <ul class="mb-8 space-y-3">
              <li
                v-for="(bullet, idx) in activeItem.bullets"
                :key="idx"
                class="flex items-start gap-3 text-sm text-fg-muted"
              >
                <svg
                  class="mt-0.5 h-5 w-5 shrink-0 text-mint-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{{ bullet }}</span>
              </li>
            </ul>

            <a href="/signup">
              <BaseButton>{{ ctaLabel }}</BaseButton>
            </a>
          </div>

          <!-- Right: quote + stat -->
          <div class="flex flex-col justify-between bg-paper p-8 lg:p-10">
            <!-- Quote -->
            <div>
              <blockquote class="font-display text-lg italic leading-relaxed text-fg">
                "{{ activeItem.quote.text }}"
              </blockquote>
              <div class="mt-4">
                <p class="font-semibold text-fg">{{ activeItem.quote.author }}</p>
                <p class="text-sm text-fg-muted">{{ activeItem.quote.role }}</p>
              </div>
            </div>

            <!-- Divider -->
            <hr class="my-8 border-bone" />

            <!-- Stat -->
            <div>
              <p class="font-display text-5xl text-navy-700">{{ activeItem.stat.value }}</p>
              <p class="mt-1 text-sm text-fg-muted">{{ activeItem.stat.label }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
