<script setup lang="ts">
import BaseButton from '~/components/base/BaseButton.vue'
import { useScrollReveal } from '~/composables/use_scroll_reveal'

interface Member {
  n: string
  r: string
  b: string
  emoji: string
  color: string
}

defineProps<{
  eyebrow: string
  title: string
  titleHighlight: string
  subtitle: string
  members: Member[]
  hiringTitle: string
  hiringSubtitle: string
  hiringCta: string
}>()

const { el, isVisible } = useScrollReveal()
</script>

<template>
  <section
    :ref="(r) => (el = r as HTMLElement)"
    class="reveal bg-paper px-6 py-20 lg:px-8"
    :class="{ visible: isVisible }"
  >
    <div class="mx-auto max-w-7xl">
      <div class="mb-12 text-center">
        <p class="font-mono text-xs font-semibold uppercase tracking-widest text-fg-subtle">
          {{ eyebrow }}
        </p>
        <h2 class="mt-3 font-display text-3xl text-fg lg:text-4xl">
          {{ title }} <em class="text-coral-500">{{ titleHighlight }}</em>
        </h2>
        <p class="mt-3 text-fg-muted">{{ subtitle }}</p>
      </div>

      <!-- Team grid -->
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="(member, idx) in members"
          :key="member.n"
          class="rounded-2xl border border-bone bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
          :style="{ transitionDelay: `${idx * 60}ms` }"
        >
          <div
            class="flex h-16 w-16 items-center justify-center rounded-full text-2xl text-white"
            :style="{ background: `linear-gradient(135deg, ${member.color}, ${member.color}cc)` }"
          >
            {{ member.emoji }}
          </div>
          <p class="mt-3 font-semibold text-fg">{{ member.n }}</p>
          <p class="text-xs text-fg-muted">{{ member.r }}</p>
          <p
            class="mt-3 border-t border-dashed border-bone pt-3 font-mono text-[11px] text-fg-subtle"
          >
            {{ member.b }}
          </p>
        </div>
      </div>

      <!-- Hiring banner -->
      <div
        class="mt-8 flex flex-wrap items-center justify-between gap-6 rounded-2xl bg-navy-900 px-8 py-6"
      >
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-coral-500 text-xl">
            ⚡
          </div>
          <div>
            <p class="font-semibold text-white">{{ hiringTitle }}</p>
            <p class="mt-0.5 text-sm text-white/60">{{ hiringSubtitle }}</p>
          </div>
        </div>
        <BaseButton href="/careers" class="bg-white! text-navy-900! hover:bg-cream!">
          {{ hiringCta }}
        </BaseButton>
      </div>
    </div>
  </section>
</template>
