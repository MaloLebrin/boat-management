<script setup lang="ts">
import BaseButton from '~/components/base/BaseButton.vue'

interface SidebarContact {
  icon: string
  label: string
  sub: string
  href: string
}

defineProps<{
  otherMeansTitle: string
  sidebarContacts: SidebarContact[]
  ctaTitle: string
  ctaSubtitle: string
  ctaButton: string
}>()
</script>

<template>
  <div class="space-y-5 lg:sticky lg:top-20 lg:self-start">
    <!-- Contact info card -->
    <div class="rounded-2xl border border-bone bg-surface-elevated p-6">
      <p class="font-mono text-xs font-semibold uppercase tracking-widest text-fg-subtle">
        {{ otherMeansTitle }}
      </p>
      <div class="mt-5 space-y-4">
        <!-- `<a>` légitime : liens mailto:/tel:, pas une navigation interne -->
        <a
          v-for="c in sidebarContacts"
          :key="c.label"
          :href="c.href"
          class="flex items-start gap-3 rounded-lg transition-colors hover:bg-cream/60"
        >
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bone text-sm">
            {{ c.icon }}
          </div>
          <div>
            <p class="font-mono text-sm font-medium text-fg underline-offset-2 hover:underline">
              {{ c.label }}
            </p>
            <p class="text-xs text-fg-subtle">{{ c.sub }}</p>
          </div>
        </a>
      </div>
    </div>

    <!-- Navy CTA card : bandeau navy permanent, couleurs brutes assumées -->
    <div class="relative overflow-hidden rounded-2xl bg-navy-900 p-6">
      <svg
        viewBox="0 0 100 100"
        class="pointer-events-none absolute right-0 top-0 h-44 w-44 -translate-y-1/3 translate-x-1/3 opacity-10"
      >
        <path d="M50 5 L65 50 L50 60 L35 50 Z" fill="#faf6ee" />
        <path d="M50 95 L65 50 L50 40 L35 50 Z" fill="#e2674f" />
      </svg>
      <h3 class="relative font-display text-2xl leading-tight text-white">{{ ctaTitle }}</h3>
      <p class="relative mt-2 text-sm text-white/60">{{ ctaSubtitle }}</p>
      <BaseButton
        href="/signup"
        class="relative mt-5 w-full justify-center bg-white! text-navy-900! hover:bg-cream!"
      >
        {{ ctaButton }}
      </BaseButton>
    </div>
  </div>
</template>
