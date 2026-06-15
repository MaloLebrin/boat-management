<script setup lang="ts">
import { router, usePage } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useT } from '~/composables/use_t'
import { buildLocaleSwitchHref, type AppLocale } from '#shared/helpers/locale_path'

type SharedProps = {
  locale?: 'en' | 'fr'
  path?: string
  user?: unknown
}

const page = usePage<SharedProps>()
const { t } = useT()

const locale = computed<'en' | 'fr'>(() => page.props.locale ?? 'en')
const isAuthed = computed(() => Boolean(page.props.user))

const guideHref = computed(() =>
  locale.value === 'fr' ? '/fr/cout-entretien-bateau' : '/en/boat-maintenance-cost'
)

const otherLocale = computed<AppLocale>(() => (locale.value === 'en' ? 'fr' : 'en'))

const localeSwitchHref = computed(() =>
  buildLocaleSwitchHref(page.props.path ?? '', otherLocale.value)
)

function switchLocale() {
  const href = localeSwitchHref.value
  if (href) {
    router.visit(href)
    return
  }
  router.post('/locale', { locale: otherLocale.value }, { preserveScroll: true })
}
</script>

<template>
  <header
    class="sticky top-0 z-40 border-b border-bone bg-cream/95 backdrop-blur-sm px-2.5 md:px-0"
  >
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between">
      <Link
        :href="`/${locale}`"
        class="inline-flex items-center gap-2.5 transition-opacity duration-(--motion-fast) hover:opacity-80"
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="32" cy="32" r="28" stroke="#0b1d2e" stroke-width="2.6" />
          <path d="M32 9 L37.5 32 L32 36.5 L26.5 32 Z" fill="#0b1d2e" />
          <path d="M32 55 L37.5 32 L32 27.5 L26.5 32 Z" fill="#e2674f" />
          <circle cx="32" cy="32" r="2.4" fill="#faf6ee" stroke="#0b1d2e" stroke-width="1.4" />
        </svg>
        <span class="font-display text-lg leading-none text-fg" style="letter-spacing: -0.025em">
          Fleet<em style="font-style: italic; color: #e2674f">Ai</em>
        </span>
      </Link>

      <nav class="hidden items-center gap-1 md:flex">
        <Link
          :href="`/${locale}#features`"
          class="rounded-(--radius-control) px-3 py-2 text-sm font-medium text-fg-muted transition-colors duration-(--motion-fast) ease-premium hover:bg-paper hover:text-fg"
        >
          {{ t('public.nav.features') }}
        </Link>
        <Link
          :href="`/${locale}/tarifs`"
          class="rounded-(--radius-control) px-3 py-2 text-sm font-medium text-fg-muted transition-colors duration-(--motion-fast) ease-premium hover:bg-paper hover:text-fg"
        >
          {{ t('public.nav.pricing') }}
        </Link>
        <Link
          :href="guideHref"
          class="rounded-(--radius-control) px-3 py-2 text-sm font-medium text-fg-muted transition-colors duration-(--motion-fast) ease-premium hover:bg-paper hover:text-fg"
        >
          {{ t('public.nav.guide') }}
        </Link>
        <Link
          href="/design-system"
          class="rounded-(--radius-control) px-3 py-2 text-sm font-medium text-fg-muted transition-colors duration-(--motion-fast) ease-premium hover:bg-paper hover:text-fg"
        >
          Design system
        </Link>
      </nav>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex h-9 items-center justify-center rounded-(--radius-control) px-3 text-sm font-medium text-fg-muted transition-colors duration-(--motion-fast) hover:bg-paper hover:text-fg"
          @click="switchLocale"
        >
          {{ locale === 'en' ? 'FR' : 'EN' }}
        </button>
        <template v-if="isAuthed">
          <Link href="/dashboard">
            <BaseButton size="sm">Dashboard</BaseButton>
          </Link>
        </template>
        <template v-else>
          <Link href="/login">
            <BaseButton variant="ghost" size="sm">{{ t('public.actions.login') }}</BaseButton>
          </Link>
          <Link href="/signup">
            <BaseButton size="sm">{{ t('public.actions.tryFree') }}</BaseButton>
          </Link>
        </template>
      </div>
    </div>
  </header>
</template>
