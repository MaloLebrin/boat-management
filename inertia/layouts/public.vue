<script setup lang="ts">
import { Link, usePage } from '@inertiajs/vue3';
import { computed } from 'vue';
import brandIconUrl from '~/assets/brand/fleetide_ai_icon_C.svg?url';
import BaseButton from '~/components/base/BaseButton.vue';

const props = defineProps<{
  locale?: 'en' | 'fr'
  path?: string
}>()

type SharedProps = {
  locale?: 'en' | 'fr'
  path?: string
  user?: unknown
}

const page = usePage<SharedProps>()

const locale = computed<'en' | 'fr'>(() => props.locale ?? page.props.locale ?? 'en')
const path = computed(() => props.path ?? page.props.path ?? '')
const isAuthed = computed(() => Boolean(page.props.user))

const otherLocale = computed(() => (locale.value === 'en' ? 'fr' : 'en'))
const otherHref = computed(() => `/${otherLocale.value}${path.value || ''}`)
</script>

<template>
  <div class="min-h-screen bg-linear-to-br from-lilac-50 via-peach-50 to-mint-100 text-fg">
    <header class="sticky top-0 z-40 border-b border-abyss-800 bg-abyss-950">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link :href="`/${locale}`" class="inline-flex items-center gap-3 text-white hover:text-lagoon-400">
          <img :src="brandIconUrl" alt="Fleetide AI" class="h-9 w-9 rounded-(--radius-control) shadow-(--shadow-xs)" />
          <div class="hidden sm:flex flex-col leading-tight">
            <span class="font-display text-sm font-semibold text-white">Fleetide AI</span>
            <span class="text-xs font-semibold text-abyss-300">Fleet intelligence</span>
          </div>
        </Link>

        <nav class="hidden items-center gap-2 md:flex">
          <Link :href="`/${locale}#features`"
            class="rounded-(--radius-control) px-3 py-2 text-sm font-semibold text-abyss-200 transition-colors duration-(--motion-fast) ease-premium hover:bg-abyss-800 hover:text-white">
            Features
          </Link>
          <Link :href="`/${locale}/tarifs`"
            class="rounded-(--radius-control) px-3 py-2 text-sm font-semibold text-abyss-200 transition-colors duration-(--motion-fast) ease-premium hover:bg-abyss-800 hover:text-white">
            {{ locale === 'fr' ? 'Tarifs' : 'Pricing' }}
          </Link>
          <a href="https://docs.adonisjs.com/" target="_blank" rel="noreferrer"
            class="rounded-(--radius-control) px-3 py-2 text-sm font-semibold text-abyss-200 transition-colors duration-(--motion-fast) ease-premium hover:bg-abyss-800 hover:text-white">
            Docs
          </a>
          <Link href="/design-system"
            class="rounded-(--radius-control) px-3 py-2 text-sm font-semibold text-abyss-200 transition-colors duration-(--motion-fast) ease-premium hover:bg-abyss-800 hover:text-white">
            Design
          </Link>
        </nav>

        <div class="flex items-center gap-2">
          <Link :href="otherHref"
            class="inline-flex h-10 items-center justify-center rounded-(--radius-control) px-3 text-sm font-semibold text-abyss-200 hover:bg-abyss-800 hover:text-white">
            {{ locale === 'en' ? 'FR' : 'EN' }}
          </Link>
          <template v-if="isAuthed">
            <a href="/dashboard">
              <BaseButton size="sm">
                {{ locale === 'fr' ? 'Dashboard' : 'Dashboard' }}
              </BaseButton>
            </a>
          </template>
          <template v-else>
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
          </template>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-7xl px-6 py-10">
      <slot />
    </main>

    <PublicFooter :locale="locale" />
  </div>
</template>
