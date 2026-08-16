<script setup lang="ts">
import type { LegalDocument } from '#shared/types/marketing'

/**
 * Gabarit commun des pages légales (confidentialité, CGU, CGV, mentions
 * légales) : hero, sections numérotées, bloc contact. Les pages ne portent plus
 * que leur `<Head>` (#455). Une section peut porter une fiche « libellé :
 * valeur » (`entries`) pour l'identité de l'éditeur et de l'hébergeur (#466).
 */
defineProps<{ document: LegalDocument }>()

/** Le lien du médiateur et l'e-mail de contact restent cliquables dans la fiche. */
const isExternalUrl = (value: string) => value.startsWith('https://') || value.startsWith('http://')
const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
</script>

<template>
  <!-- Hero -->
  <section class="bg-cream px-6 py-16 lg:px-8 lg:py-24">
    <div class="mx-auto max-w-3xl text-center">
      <p class="text-xs font-semibold uppercase tracking-widest text-fg-subtle">
        {{ document.hero.eyebrow }}
      </p>
      <h1 class="mt-4 font-display text-4xl leading-tight tracking-tight text-fg lg:text-5xl">
        {{ document.hero.title }}
        <em class="text-coral-500 not-italic">{{ document.hero.titleHighlight }}</em>
      </h1>
      <p class="mt-4 text-lg text-fg-muted">{{ document.hero.subtitle }}</p>
      <p class="mt-6 text-sm text-fg-subtle">
        {{ document.hero.updatedLabel }} {{ document.hero.updatedDate }}
      </p>
    </div>
  </section>

  <!-- Sections -->
  <section class="bg-paper px-6 py-12 lg:px-8 lg:py-16">
    <div class="mx-auto max-w-3xl space-y-10">
      <article v-for="(section, i) in document.sections" :key="i" class="space-y-3">
        <h2 class="font-display text-2xl text-fg lg:text-3xl">
          <span class="text-coral-500">{{ String(i + 1).padStart(2, '0') }}.</span>
          {{ section.title }}
        </h2>
        <p class="whitespace-pre-line text-fg-muted">{{ section.body }}</p>
        <ul v-if="section.bullets" class="mt-2 space-y-2">
          <li
            v-for="(bullet, b) in section.bullets"
            :key="b"
            class="flex items-start gap-2 text-fg-muted"
          >
            <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-coral-500" />
            <span>{{ bullet }}</span>
          </li>
        </ul>

        <dl
          v-if="section.entries"
          class="mt-2 grid gap-3 rounded-2xl border border-border bg-surface p-6 sm:grid-cols-[minmax(0,14rem)_1fr]"
        >
          <template v-for="(item, e) in section.entries" :key="e">
            <dt class="text-sm font-semibold text-fg">{{ item.label }}</dt>
            <dd class="text-fg-muted">
              <a
                v-if="isExternalUrl(item.value)"
                :href="item.value"
                rel="noopener noreferrer"
                target="_blank"
                class="underline"
                >{{ item.value }}</a
              >
              <a v-else-if="isEmail(item.value)" :href="`mailto:${item.value}`" class="underline">{{
                item.value
              }}</a>
              <span v-else>{{ item.value }}</span>
            </dd>
          </template>
        </dl>
      </article>
    </div>
  </section>

  <!-- Contact -->
  <section class="bg-bone px-6 py-12 lg:px-8 lg:py-16">
    <div class="mx-auto max-w-3xl rounded-2xl border border-bone bg-cream p-8 text-center">
      <h2 class="font-display text-2xl text-fg">{{ document.contact.title }}</h2>
      <p class="mt-3 text-fg-muted">{{ document.contact.body }}</p>
      <a
        :href="`mailto:${document.contact.email}`"
        class="mt-4 inline-block font-semibold text-fg underline"
        >{{ document.contact.email }}</a
      >
    </div>
  </section>
</template>
