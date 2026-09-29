<script setup lang="ts">
import { computed } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { Toaster } from 'vue-sonner'
import { useFlashToasts } from '~/composables/use_flash_toasts'
import { useT } from '~/composables/use_t'
import type { PublicBookingOrganization } from '#shared/types/public_booking'

/**
 * Habillage de la page publique de réservation (#881) : c'est la page du
 * loueur, pas celle de FleetAi. L'en-tête porte son nom (et son logo en
 * marque blanche), le pied de page une simple mention « propulsé par ».
 */
const page = usePage<{ organization?: PublicBookingOrganization }>()
const organization = computed(() => page.props.organization ?? null)

const { t } = useT()
useFlashToasts()
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-surface text-fg">
    <header class="border-b border-border bg-surface-elevated">
      <div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
        <Link
          v-if="organization"
          :href="`/book/${organization.slug}`"
          class="flex items-center gap-3"
          data-testid="booking-org"
        >
          <img
            v-if="organization.logoUrl"
            :src="organization.logoUrl"
            :alt="organization.name"
            class="h-9 max-w-40 object-contain"
          />
          <span class="text-lg font-semibold text-fg">{{ organization.name }}</span>
        </Link>
      </div>
    </header>

    <main class="w-full flex-1">
      <slot />
    </main>

    <footer class="border-t border-border py-6 text-center text-xs text-fg-subtle">
      {{ t('public.booking.poweredBy') }}
    </footer>

    <Toaster
      position="top-center"
      rich-colors
      close-button
      :container-aria-label="t('common.toasts.region')"
      :toast-options="{ closeButtonAriaLabel: t('common.toasts.close') }"
    />
  </div>
</template>
