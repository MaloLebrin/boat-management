<script setup lang="ts">
import { router, usePage } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import AppHeaderMobileDrawer from '~/components/layout/AppHeaderMobileDrawer.vue'
import AppHeaderProductMenu from '~/components/layout/AppHeaderProductMenu.vue'
import ThemeSwitcher from '~/components/layout/ThemeSwitcher.vue'
import { useT } from '~/composables/use_t'
import { usePublicNav } from '~/composables/use_public_nav'
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

// Nav publique partagée avec le drawer mobile (source unique : use_public_nav).
const { productGroups, toolLinks, topLinks } = usePublicNav(locale)

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

const isMenuOpen = ref(false)

function openMenu() {
  isMenuOpen.value = true
}

function closeMenu() {
  isMenuOpen.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeMenu()
}

watch(
  () => page.url,
  () => closeMenu()
)

watch(
  () => isMenuOpen.value,
  (open) => {
    if (open) {
      window.addEventListener('keydown', onKeydown)
      return
    }
    window.removeEventListener('keydown', onKeydown)
  }
)

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
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
          <circle cx="32" cy="32" r="28" stroke="var(--color-fg)" stroke-width="2.6" />
          <g class="compass-needle">
            <path d="M32 9 L37.5 32 L32 36.5 L26.5 32 Z" fill="var(--color-fg)" />
            <path d="M32 55 L37.5 32 L32 27.5 L26.5 32 Z" fill="var(--color-coral-500)" />
          </g>
          <circle
            cx="32"
            cy="32"
            r="2.4"
            fill="var(--color-surface)"
            stroke="var(--color-fg)"
            stroke-width="1.4"
          />
        </svg>
        <span class="font-display text-lg leading-none text-fg" style="letter-spacing: -0.025em">
          Fleet<em class="italic text-coral-500">Ai</em>
        </span>
      </Link>

      <!-- 7 items (dropdown + outils gratuits + liens directs) : trop large
           pour 768 px, la nav complète n'apparaît qu'à partir de lg. -->
      <nav class="hidden items-center gap-0 lg:flex xl:gap-1">
        <AppHeaderProductMenu :groups="productGroups" />
        <Link
          v-for="link in [...toolLinks, ...topLinks]"
          :key="link.href"
          :href="link.href"
          class="whitespace-nowrap rounded-(--radius-control) px-1.5 py-2 text-sm font-medium text-fg-muted transition-colors duration-(--motion-fast) ease-premium hover:bg-paper hover:text-fg xl:px-3"
        >
          {{ t(link.labelKey) }}
        </Link>
      </nav>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex h-9 items-center justify-center rounded-(--radius-control) px-2 text-sm font-medium text-fg-muted transition-colors duration-(--motion-fast) hover:bg-paper hover:text-fg xl:px-3"
          @click="switchLocale"
        >
          {{ locale === 'en' ? 'FR' : 'EN' }}
        </button>
        <ThemeSwitcher class="hidden sm:flex" />
        <template v-if="isAuthed">
          <Link href="/dashboard">
            <BaseButton size="sm">Dashboard</BaseButton>
          </Link>
        </template>
        <template v-else>
          <Link href="/login" class="hidden md:inline-flex">
            <BaseButton variant="ghost" size="sm" class="whitespace-nowrap">{{
              t('public.actions.login')
            }}</BaseButton>
          </Link>
          <Link href="/signup" class="hidden md:inline-flex">
            <BaseButton size="sm" class="whitespace-nowrap">{{
              t('public.actions.tryFree')
            }}</BaseButton>
          </Link>
        </template>

        <!-- Hamburger button (mobile + tablette, tant que la nav complète est masquée) -->
        <button
          type="button"
          class="inline-flex lg:hidden items-center justify-center w-10 h-10 rounded-(--radius-control) text-fg-muted transition-colors duration-(--motion-fast) hover:bg-paper hover:text-fg"
          aria-controls="public-nav-drawer"
          :aria-expanded="isMenuOpen ? 'true' : 'false'"
          @click="openMenu"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          <span class="sr-only">{{ t('nav.menu') }}</span>
        </button>
      </div>
    </div>
  </header>

  <AppHeaderMobileDrawer
    :is-open="isMenuOpen"
    :locale="locale"
    :is-authed="isAuthed"
    @close="closeMenu"
    @switch-locale="switchLocale"
  />
</template>

<style scoped>
.compass-needle {
  transform-box: fill-box;
  transform-origin: center;
  animation: compass-spin 8s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .compass-needle {
    animation: none;
  }
}

@keyframes compass-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
