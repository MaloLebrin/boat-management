<script setup lang="ts">
import { Link } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import brandIconUrl from '~/assets/brand/fleetide_ai_icon_C.svg?url'

const props = defineProps<{
  locale: 'en' | 'fr'
  path?: string
}>()

const otherLocale = props.locale === 'en' ? 'fr' : 'en'
const otherHref = `/${otherLocale}${props.path || ''}`
</script>

<template>
  <div class="min-h-screen bg-linear-to-br from-lilac-50 via-peach-50 to-mint-100 text-fg">
    <header class="sticky top-0 z-40 border-b border-border bg-surface-elevated/80 backdrop-blur-md">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link :href="`/${locale}`" class="inline-flex items-center gap-3 text-fg hover:text-brand">
          <img
            :src="brandIconUrl"
            alt="Fleetide AI"
            class="h-9 w-9 rounded-(--radius-control) shadow-(--shadow-xs)"
          />
          <div class="hidden sm:flex flex-col leading-tight">
            <span class="font-display text-sm font-semibold text-fg">Fleetide AI</span>
            <span class="text-xs font-semibold text-fg-subtle">Fleet intelligence</span>
          </div>
        </Link>

        <nav class="hidden items-center gap-2 md:flex">
          <Link
            :href="`/${locale}#features`"
            class="rounded-(--radius-control) px-3 py-2 text-sm font-semibold text-fg-muted transition-colors duration-(--motion-fast) ease-premium hover:bg-surface-muted hover:text-fg"
          >
            Features
          </Link>
          <Link
            :href="`/${locale}/tarifs`"
            class="rounded-(--radius-control) px-3 py-2 text-sm font-semibold text-fg-muted transition-colors duration-(--motion-fast) ease-premium hover:bg-surface-muted hover:text-fg"
          >
            {{ locale === 'fr' ? 'Tarifs' : 'Pricing' }}
          </Link>
          <a
            href="https://docs.adonisjs.com/"
            target="_blank"
            rel="noreferrer"
            class="rounded-(--radius-control) px-3 py-2 text-sm font-semibold text-fg-muted transition-colors duration-(--motion-fast) ease-premium hover:bg-surface-muted hover:text-fg"
          >
            Docs
          </a>
          <Link
            href="/design-system"
            class="rounded-(--radius-control) px-3 py-2 text-sm font-semibold text-fg-muted transition-colors duration-(--motion-fast) ease-premium hover:bg-surface-muted hover:text-fg"
          >
            Design
          </Link>
        </nav>

        <div class="flex items-center gap-2">
          <Link
            :href="otherHref"
            class="inline-flex h-10 items-center justify-center rounded-(--radius-control) px-3 text-sm font-semibold text-fg-muted hover:bg-surface-muted hover:text-fg"
          >
            {{ locale === 'en' ? 'FR' : 'EN' }}
          </Link>
          <a href="/login">
            <BaseButton variant="ghost" size="sm">
              {{ locale === 'fr' ? 'Connexion' : 'Login' }}
            </BaseButton>
          </a>
          <a href="/signup">
            <BaseButton size="sm">
              {{ locale === 'fr' ? 'Inscription' : 'Signup' }}
            </BaseButton>
          </a>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-7xl px-6 py-10">
      <slot />
    </main>

    <footer class="border-t border-border bg-surface-elevated/70">
      <div class="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-4">
        <div class="space-y-3">
          <p class="font-display text-sm font-semibold text-fg">Fleetide AI</p>
          <p class="text-sm text-fg-muted">
            {{ locale === 'fr'
              ? 'Le suivi technique de flotte, avec la clarté de l’IA.'
              : 'Fleet technical tracking, with AI clarity.' }}
          </p>
        </div>

        <div class="space-y-3">
          <p class="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Product</p>
          <div class="grid gap-2 text-sm font-semibold text-fg-muted">
            <Link :href="`/${locale}#features`" class="hover:text-fg">Features</Link>
            <Link :href="`/${locale}/tarifs`" class="hover:text-fg">{{ locale === 'fr' ? 'Tarifs' : 'Pricing' }}</Link>
            <Link href="/design-system" class="hover:text-fg">Design system</Link>
          </div>
        </div>

        <div class="space-y-3">
          <p class="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Company</p>
          <div class="grid gap-2 text-sm font-semibold text-fg-muted">
            <a class="hover:text-fg" href="#">{{ locale === 'fr' ? 'Contact' : 'Contact' }}</a>
            <a class="hover:text-fg" href="#">{{ locale === 'fr' ? 'À propos' : 'About' }}</a>
          </div>
        </div>

        <div class="space-y-3">
          <p class="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Legal</p>
          <div class="grid gap-2 text-sm font-semibold text-fg-muted">
            <a class="hover:text-fg" href="#">{{ locale === 'fr' ? 'Confidentialité' : 'Privacy' }}</a>
            <a class="hover:text-fg" href="#">{{ locale === 'fr' ? 'Conditions' : 'Terms' }}</a>
          </div>
        </div>
      </div>

      <div class="border-t border-border">
        <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 text-xs font-semibold text-fg-subtle">
          <span>© {{ new Date().getFullYear() }} Fleetide AI</span>
          <span>{{ locale === 'fr' ? 'Bilingue FR/EN' : 'Bilingual EN/FR' }}</span>
        </div>
      </div>
    </footer>
  </div>
</template>

