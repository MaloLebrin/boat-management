<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { usePage } from '@inertiajs/vue3'
import NavIcon from '~/components/layout/NavIcon.vue'
import { useNavSections } from '~/composables/use_nav_sections'
import { useT } from '~/composables/use_t'

const page = usePage()
const { t } = useT()
const { bottomNavItems } = useNavSections()

function isActive(path: string): boolean {
  const url = page.url
  return url === path || url.startsWith(`${path}/`) || url.startsWith(`${path}?`)
}
</script>

<template>
  <!-- Bottom tab bar mobile (#492) : 4 raccourcis par rôle. Le drawer reste la
       navigation complète — les deux coexistent. Montée dans le flux du shell
       (pas en fixed) : elle ne recouvre jamais le contenu scrollable, et le
       pb-[env(...)] dégage l'indicateur home iOS (#484). -->
  <nav
    v-if="bottomNavItems.length > 0"
    class="lg:hidden shrink-0 border-t border-border bg-surface-elevated pb-[env(safe-area-inset-bottom)]"
    :aria-label="t('nav.bottomNav')"
  >
    <ul class="flex h-14">
      <li v-for="item in bottomNavItems" :key="item.path" class="flex-1 min-w-0">
        <Link
          :href="item.path"
          class="flex h-full min-h-11 flex-col items-center justify-center gap-0.5 px-1 text-xs font-medium transition-colors"
          :class="isActive(item.path) ? 'text-brand' : 'text-fg-muted hover:text-fg'"
          :aria-current="isActive(item.path) ? 'page' : undefined"
        >
          <NavIcon :name="item.icon" />
          <span class="truncate max-w-full">{{ item.name }}</span>
        </Link>
      </li>
    </ul>
  </nav>
</template>
