<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import type { HelpChannelCard } from '#shared/types/marketing'

defineProps<{
  items: HelpChannelCard[]
}>()
</script>

<template>
  <section class="bg-paper px-6 py-12 lg:px-8 lg:py-16">
    <div class="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
      <div
        v-for="item in items"
        :key="item.title"
        class="flex flex-col rounded-xl border border-border bg-surface p-6"
      >
        <p class="font-semibold text-fg">{{ item.title }}</p>
        <p class="mt-2 flex-1 text-sm text-fg-muted">{{ item.description }}</p>
        <!-- eslint-disable vue/no-restricted-v-bind -- lien externe mailto: vers le support -->
        <a
          v-if="item.external"
          :href="item.href"
          class="mt-4 text-sm font-semibold text-coral-600 hover:text-coral-700"
        >
          {{ item.ctaLabel }}
          <span aria-hidden="true">→</span>
        </a>
        <!-- eslint-enable vue/no-restricted-v-bind -->
        <Link
          v-else
          :href="item.href"
          class="mt-4 text-sm font-semibold text-coral-600 hover:text-coral-700"
        >
          {{ item.ctaLabel }}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  </section>
</template>
