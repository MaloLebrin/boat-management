<script setup lang="ts">
import { Form, Link } from '@adonisjs/inertia/vue'
import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'
import Logo from '~/components/Logo.vue'
import LanguageSwitcher from '~/components/layout/LanguageSwitcher.vue'
import NavIcon from '~/components/layout/NavIcon.vue'
import { useNavSections } from '~/composables/use_nav_sections'
import { useT } from '~/composables/use_t'

type AuthUser = {
  id: number
  email: string
  fullName: string | null
  initials: string
}

const props = defineProps<{
  user?: AuthUser
  currentRoute?: string
}>()

const page = usePage()
const { t } = useT()
const { navSections } = useNavSections()

const currentPath = computed(() => props.currentRoute ?? page.url)

function isActive(path: string): boolean {
  const current = currentPath.value
  if (path === '/dashboard') {
    return current === '/dashboard' || current === '/en/dashboard' || current === '/fr/dashboard'
  }
  return current.startsWith(path) || current.includes(path)
}
</script>

<template>
  <aside class="hidden lg:flex flex-col w-64 h-full bg-navy-900 text-white">
    <!-- Logo -->
    <div class="px-5 py-6 border-b border-navy-700">
      <Logo />
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto px-3 py-4">
      <div v-for="section in navSections" :key="section.label" class="mb-6">
        <p class="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-navy-300">
          {{ section.label }}
        </p>
        <ul class="space-y-1">
          <li v-for="item in section.items" :key="item.path">
            <Link
              v-if="item.route"
              :route="item.route"
              class="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              :class="
                isActive(item.path)
                  ? 'bg-navy-700 text-white'
                  : 'text-navy-100 hover:bg-navy-700 hover:text-white'
              "
            >
              <span
                v-if="isActive(item.path)"
                class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-navy-500 rounded-r"
              />
              <NavIcon :name="item.icon" />
              <span>{{ item.name }}</span>
            </Link>
            <a
              v-else
              :href="item.path"
              class="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              :class="
                isActive(item.path)
                  ? 'bg-navy-700 text-white'
                  : 'text-navy-100 hover:bg-navy-700 hover:text-white'
              "
            >
              <span
                v-if="isActive(item.path)"
                class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-navy-500 rounded-r"
              />
              <NavIcon :name="item.icon" />
              <span>{{ item.name }}</span>
            </a>
          </li>
        </ul>
      </div>
    </nav>

    <!-- User info + Logout -->
    <div class="mt-auto border-t border-navy-700 px-4 py-4">
      <div class="flex items-center justify-between mb-3 px-0">
        <LanguageSwitcher />
      </div>
      <div class="flex items-center gap-3 mb-3">
        <div
          class="flex items-center justify-center w-10 h-10 rounded-full bg-navy-500 text-white font-semibold text-sm"
        >
          {{ user?.initials ?? '?' }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-white truncate">
            {{ user?.fullName ?? t('nav.unknownUser') }}
          </p>
          <p class="text-xs text-navy-200 truncate">
            {{ user?.email ?? '' }}
          </p>
        </div>
      </div>
      <Form route="session.destroy">
        <button
          type="submit"
          class="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-navy-100 hover:bg-navy-700 hover:text-white transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span>{{ t('nav.logout') }}</span>
        </button>
      </Form>
    </div>
  </aside>
</template>
