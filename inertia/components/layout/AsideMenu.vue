<script setup lang="ts">
import { Form, Link } from '@adonisjs/inertia/vue'
import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'
import brandIconUrl from '~/assets/brand/fleetide_ai_icon_C.svg?url'
import { useT } from '~/composables/useT'

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

const currentPath = computed(() => props.currentRoute ?? page.url)

function isActive(path: string): boolean {
  const current = currentPath.value
  if (path === '/dashboard') {
    return current === '/dashboard' || current === '/en/dashboard' || current === '/fr/dashboard'
  }
  return current.startsWith(path) || current.includes(path)
}

const navSections = computed(() => [
  {
    label: t('nav.sections.fleet'),
    items: [
      { name: t('nav.dashboard'), path: '/dashboard', route: 'dashboard', icon: 'house' },
      { name: t('nav.myBoats'), path: '/boats', route: null, icon: 'boat' },
    ],
  },
  {
    label: t('nav.sections.maintenance'),
    items: [
      { name: t('nav.planning'), path: '/planning', route: null, icon: 'calendar' },
      { name: t('nav.history'), path: '/maintenance/history', route: null, icon: 'clock' },
    ],
  },
  {
    label: t('nav.sections.preferences'),
    items: [
      { name: t('nav.settings'), path: '/settings', route: null, icon: 'gear' },
    ],
  },
])
</script>

<template>
  <aside class="hidden lg:flex flex-col w-64 h-full bg-abyss-950 text-white">
    <!-- Logo -->
    <div class="px-5 py-6 border-b border-abyss-800">
      <a href="/dashboard" class="flex items-center gap-3">
        <img
          :src="brandIconUrl"
          alt="FleetAi"
          class="h-10 w-10 rounded-lg shadow-md"
        />
        <div class="flex flex-col leading-tight">
          <span class="font-display text-base font-semibold text-white">FleetAi</span>
          <span class="text-xs font-medium text-abyss-300">Fleet intelligence</span>
        </div>
      </a>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto px-3 py-4">
      <div v-for="section in navSections" :key="section.label" class="mb-6">
        <p class="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-abyss-400">
          {{ section.label }}
        </p>
        <ul class="space-y-1">
          <li v-for="item in section.items" :key="item.path">
            <Link
              v-if="item.route"
              :route="item.route"
              class="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              :class="isActive(item.path)
                ? 'bg-abyss-800 text-white'
                : 'text-abyss-200 hover:bg-abyss-800 hover:text-white'"
            >
              <!-- Left accent bar for active state -->
              <span
                v-if="isActive(item.path)"
                class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-lagoon-500 rounded-r"
              />

              <!-- Icons -->
              <svg v-if="item.icon === 'house'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <svg v-else-if="item.icon === 'boat'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 17h18M5 17l2-8h10l2 8M9 9V6a3 3 0 116 0v3" />
              </svg>
              <svg v-else-if="item.icon === 'calendar'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <svg v-else-if="item.icon === 'clock'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg v-else-if="item.icon === 'gear'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>

              <span>{{ item.name }}</span>
            </Link>
            <a
              v-else
              :href="item.path"
              class="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              :class="isActive(item.path)
                ? 'bg-abyss-800 text-white'
                : 'text-abyss-200 hover:bg-abyss-800 hover:text-white'"
            >
              <!-- Left accent bar for active state -->
              <span
                v-if="isActive(item.path)"
                class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-lagoon-500 rounded-r"
              />

              <!-- Icons -->
              <svg v-if="item.icon === 'house'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <svg v-else-if="item.icon === 'boat'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 17h18M5 17l2-8h10l2 8M9 9V6a3 3 0 116 0v3" />
              </svg>
              <svg v-else-if="item.icon === 'calendar'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <svg v-else-if="item.icon === 'clock'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg v-else-if="item.icon === 'gear'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>

              <span>{{ item.name }}</span>
            </a>
          </li>
        </ul>
      </div>
    </nav>

    <!-- User info + Logout -->
    <div class="mt-auto border-t border-abyss-800 px-4 py-4">
      <div class="flex items-center gap-3 mb-3">
        <div class="flex items-center justify-center w-10 h-10 rounded-full bg-lagoon-500 text-white font-semibold text-sm">
          {{ user?.initials ?? '?' }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-white truncate">
            {{ user?.fullName ?? t('nav.unknownUser') }}
          </p>
          <p class="text-xs text-abyss-300 truncate">
            {{ user?.email ?? '' }}
          </p>
        </div>
      </div>
      <Form route="session.destroy">
        <button
          type="submit"
          class="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-abyss-200 hover:bg-abyss-800 hover:text-white transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>{{ t('nav.logout') }}</span>
        </button>
      </Form>
    </div>
  </aside>
</template>
