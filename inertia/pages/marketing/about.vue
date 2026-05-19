<script lang="ts">
import PublicLayout from '~/layouts/public.vue'
export default { layout: PublicLayout }
</script>

<script setup lang="ts">
import { UserIcon } from '@heroicons/vue/24/outline'
import { Head } from '@inertiajs/vue3'
import { useScrollReveal } from '~/composables/useScrollReveal'
import AboutTimelineSection from '~/components/marketing/about/AboutTimelineSection.vue'

type PageProps = {
  t: {
    meta: { title: string; description: string }
    about: {
      hero: { eyebrow: string; title: string; subtitle: string }
      story: { title: string; p1: string; p2: string }
      mission: { eyebrow: string; statement: string; body: string }
      values: { title: string; items: Array<{ icon: string; title: string; description: string }> }
      team: { title: string; members: Array<{ name: string; role: string; bio: string }> }
      stats: Array<{ value: string; label: string }>
      cta: { title: string; subtitle: string; button: string }
      timeline: { title: string; items: Array<{ year: string; label: string; description: string }> }
      press: { title: string; items: Array<{ name: string; quote: string }> }
    }
  }
}

const props = defineProps<PageProps>()
const t = props.t

const { el: storyEl, isVisible: storyVisible } = useScrollReveal()
const { el: missionEl, isVisible: missionVisible } = useScrollReveal()
const { el: valuesEl, isVisible: valuesVisible } = useScrollReveal()
const { el: teamEl, isVisible: teamVisible } = useScrollReveal()
const { el: statsEl, isVisible: statsVisible } = useScrollReveal()
const { el: pressEl, isVisible: pressVisible } = useScrollReveal()
</script>

<template>
  <Head :title="t.meta.title">
    <meta name="description" :content="t.meta.description" />
    <meta property="og:title" :content="t.meta.title" />
    <meta property="og:description" :content="t.meta.description" />
  </Head>

  <div class="mx-auto max-w-7xl space-y-8">
    <!-- Hero -->
    <section class="py-16 text-center">
      <p class="text-xs font-semibold uppercase tracking-widest text-fg-subtle" style="animation: fadeUp 0.7s ease both">{{ t.about.hero.eyebrow }}</p>
      <h1 class="mx-auto mt-4 max-w-2xl font-display text-4xl italic leading-tight text-fg" style="animation: fadeUp 0.8s ease both">{{ t.about.hero.title }}</h1>
      <p class="mx-auto mt-4 max-w-xl text-base leading-relaxed text-fg-muted" style="animation: fadeUp 0.9s ease both">{{ t.about.hero.subtitle }}</p>
    </section>

    <!-- Mission -->
    <section
      v-if="t.about.mission"
      :ref="(el) => missionEl = el as HTMLElement"
      class="reveal rounded-2xl bg-navy-900 px-8 py-12 text-center"
      :class="{ visible: missionVisible }"
    >
      <p class="text-xs font-semibold uppercase tracking-widest text-white/40">{{ t.about.mission.eyebrow }}</p>
      <p class="mx-auto mt-4 max-w-2xl font-display text-2xl italic text-white">{{ t.about.mission.statement }}</p>
      <p class="mx-auto mt-4 max-w-xl text-sm text-white/60">{{ t.about.mission.body }}</p>
    </section>

    <!-- Story -->
    <section
      :ref="(el) => storyEl = el as HTMLElement"
      class="reveal rounded-2xl bg-paper px-8 py-14"
      :class="{ visible: storyVisible }"
    >
      <div class="mx-auto grid max-w-3xl gap-8 md:grid-cols-[200px_1fr] md:items-start">
        <div class="flex h-48 items-center justify-center rounded-xl border border-bone bg-bone/40 text-xs text-fg-subtle">photo equipe</div>
        <div>
          <h2 class="font-display text-2xl italic text-fg">{{ t.about.story.title }}</h2>
          <p class="mt-4 text-sm leading-relaxed text-fg-muted">{{ t.about.story.p1 }}</p>
          <p class="mt-3 text-sm leading-relaxed text-fg-muted">{{ t.about.story.p2 }}</p>
        </div>
      </div>
    </section>

    <!-- Values -->
    <section
      :ref="(el) => valuesEl = el as HTMLElement"
      class="reveal py-14"
      :class="{ visible: valuesVisible }"
    >
      <h2 class="mb-8 text-center font-display text-2xl italic text-fg">{{ t.about.values.title }}</h2>
      <div class="grid gap-5 md:grid-cols-3">
        <div v-for="item in t.about.values.items" :key="item.title"
          class="rounded-xl border border-bone bg-paper p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-900/8 text-2xl mb-4">{{ item.icon }}</div>
          <h3 class="mt-3 font-semibold text-fg">{{ item.title }}</h3>
          <p class="mt-2 text-sm leading-relaxed text-fg-muted">{{ item.description }}</p>
        </div>
      </div>
    </section>

    <!-- Timeline -->
    <AboutTimelineSection v-if="t.about.timeline" :timeline="t.about.timeline" />

    <!-- Stats -->
    <section
      :ref="(el) => statsEl = el as HTMLElement"
      class="reveal py-10"
      :class="{ visible: statsVisible }"
    >
      <div class="grid grid-cols-2 gap-6 md:grid-cols-4">
        <div v-for="(stat, idx) in t.about.stats" :key="stat.label" class="text-center" :class="`reveal-delay-${idx + 1}`">
          <div class="font-display text-4xl italic text-fg">{{ stat.value }}</div>
          <p class="mt-1 text-xs font-medium uppercase tracking-wider text-fg-subtle">{{ stat.label }}</p>
        </div>
      </div>
    </section>

    <!-- Team -->
    <section
      :ref="(el) => teamEl = el as HTMLElement"
      class="reveal rounded-2xl bg-paper px-8 py-14"
      :class="{ visible: teamVisible }"
    >
      <h2 class="mb-8 text-center font-display text-2xl italic text-fg">{{ t.about.team.title }}</h2>
      <div class="flex flex-wrap justify-center gap-8">
        <div v-for="member in t.about.team.members" :key="member.name" class="text-center w-32">
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-bone">
            <UserIcon class="h-8 w-8 text-fg-muted" />
          </div>
          <p class="mt-2 font-semibold text-sm text-fg">{{ member.name }}</p>
          <p class="text-xs text-fg-muted">{{ member.role }}</p>
          <p class="text-xs text-fg-subtle">{{ member.bio }}</p>
        </div>
      </div>
    </section>

    <!-- Press -->
    <section
      v-if="t.about.press"
      :ref="(el) => pressEl = el as HTMLElement"
      class="reveal py-10"
      :class="{ visible: pressVisible }"
    >
      <h2 class="mb-8 text-center font-display text-xl italic text-fg">{{ t.about.press.title }}</h2>
      <div class="grid gap-5 md:grid-cols-3">
        <div v-for="item in t.about.press.items" :key="item.name"
          class="rounded-xl border border-bone bg-paper p-6 text-center hover:-translate-y-1 hover:shadow-md transition-all duration-300">
          <span class="text-4xl font-display text-coral-300 leading-none">"</span>
          <p class="font-semibold text-fg">{{ item.name }}</p>
          <p class="mt-2 text-sm italic text-fg-muted">"{{ item.quote }}"</p>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="rounded-2xl bg-navy-900 px-8 py-14 text-center">
      <h2 class="font-display text-3xl italic text-white">{{ t.about.cta.title }}</h2>
      <p class="mt-3 text-sm text-white/70">{{ t.about.cta.subtitle }}</p>
      <a href="/signup" class="mt-6 inline-block rounded-(--radius-control) bg-white px-6 py-3 text-sm font-semibold text-fg hover:bg-cream transition-colors">
        {{ t.about.cta.button }}
      </a>
    </section>
  </div>
</template>
