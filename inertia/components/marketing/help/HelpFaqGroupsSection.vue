<script setup lang="ts">
import { ref } from 'vue'
import type { HelpFaqGroup } from '#shared/types/marketing'

defineProps<{
  eyebrow: string
  title: string
  titleHighlight: string
  groups: HelpFaqGroup[]
}>()

// Un seul item ouvert à la fois, tous groupes confondus (clé `groupe-item`).
const openKey = ref<string | null>(null)

function toggle(key: string) {
  openKey.value = openKey.value === key ? null : key
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

      <div v-for="(group, g) in groups" :key="g" class="mt-10">
        <h3 class="font-mono text-xs font-semibold uppercase tracking-widest text-coral-600">
          {{ group.title }}
        </h3>
        <dl class="mt-4 divide-y divide-bone">
          <div v-for="(item, i) in group.items" :key="i" class="py-4">
            <button
              type="button"
              class="flex w-full items-start justify-between gap-4 text-left"
              :aria-expanded="openKey === `${g}-${i}`"
              @click="toggle(`${g}-${i}`)"
            >
              <dt class="font-semibold text-fg">{{ item.q }}</dt>
              <span
                class="mt-0.5 shrink-0 text-fg-muted transition-transform duration-200"
                :class="openKey === `${g}-${i}` ? 'rotate-45' : ''"
                aria-hidden="true"
                >+</span
              >
            </button>
            <dd v-if="openKey === `${g}-${i}`" class="mt-3 text-sm leading-relaxed text-fg-muted">
              {{ item.a }}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  </section>
</template>
