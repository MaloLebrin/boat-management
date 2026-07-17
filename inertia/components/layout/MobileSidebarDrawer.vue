<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { nextTick, ref, watch } from 'vue'
import brandIconUrl from '~/assets/brand/fleetai_compass.svg'
import LanguageSwitcher from '~/components/layout/LanguageSwitcher.vue'
import NavItem from '~/components/layout/NavItem.vue'
import { useNavSections } from '~/composables/use_nav_sections'
import { useT } from '~/composables/use_t'

type AuthUser = {
  id: number
  email: string
  fullName: string | null
  initials: string
}

const props = defineProps<{
  open: boolean
  user?: AuthUser
}>()

const emit = defineEmits<{ close: [] }>()

const drawerTitleId = 'auth-sidebar-title'
const closeButtonEl = ref<HTMLButtonElement | null>(null)

const { t } = useT()
const { navSections, settingsItem } = useNavSections()

watch(
  () => props.open,
  (open) => {
    if (open) nextTick(() => closeButtonEl.value?.focus())
  }
)

function close() {
  emit('close')
}
</script>

<template>
  <Transition name="drawer-overlay">
    <button
      v-if="open"
      type="button"
      class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden"
      :aria-label="t('nav.closeMenu')"
      @click="close"
    />
  </Transition>
  <Transition name="drawer-panel">
    <div
      v-if="open"
      id="auth-sidebar-drawer"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="drawerTitleId"
      class="fixed left-0 top-0 z-50 h-full w-64 bg-navy-900 shadow-xl lg:hidden flex flex-col"
    >
      <!-- Drawer header -->
      <div class="shrink-0 flex items-center justify-between px-5 py-4 border-b border-navy-700">
        <div class="flex items-center gap-3">
          <img :src="brandIconUrl" alt="FleetAi" class="h-10 w-10 rounded-lg shadow-md" />
          <div class="flex flex-col leading-tight">
            <span :id="drawerTitleId" class="font-display text-base font-semibold text-white"
              >FleetAi</span
            >
            <span class="text-xs font-medium text-navy-200">Fleet intelligence</span>
          </div>
        </div>
        <button
          ref="closeButtonEl"
          type="button"
          class="inline-flex items-center justify-center w-9 h-9 rounded-lg text-navy-100 hover:bg-navy-700 hover:text-white transition-colors"
          :aria-label="t('nav.closeMenu')"
          @click="close"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Drawer navigation -->
      <nav class="flex-1 min-h-0 overflow-y-auto px-3 py-4">
        <div v-for="section in navSections" :key="section.label" class="mb-6">
          <p class="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-navy-300">
            {{ section.label }}
          </p>
          <ul class="space-y-1">
            <li v-for="item in section.items" :key="item.path">
              <NavItem
                :name="item.name"
                :path="item.path"
                :route="item.route"
                :icon="item.icon"
                @click="close"
              />
            </li>
          </ul>
        </div>
      </nav>

      <!-- Drawer footer with settings + user info -->
      <div class="shrink-0 border-t border-navy-700 px-4 py-4 bg-navy-900">
        <div class="mb-3">
          <NavItem
            :name="settingsItem.name"
            :path="settingsItem.path"
            :route="settingsItem.route"
            :icon="settingsItem.icon"
            @click="close"
          />
        </div>
        <div class="mb-3">
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
        <Form route="session.destroy" @submit="close">
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
    </div>
  </Transition>
</template>
