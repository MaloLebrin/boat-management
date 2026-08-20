<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseDropdown from '~/components/base/BaseDropdown.vue'
import { useT } from '~/composables/use_t'
import type { FleetBoatOption } from '~/types/reservation'

defineProps<{
  boats: FleetBoatOption[]
  selectedBoatId: number | null
}>()

const { t } = useT()

function targetHref(boatId: number): string {
  return `/boats/${boatId}/reservations#reservation-form`
}

const menuItemClass =
  'block w-full rounded-(--radius-control) px-3 py-2 text-left text-sm font-semibold text-fg-muted transition-colors duration-(--motion-fast) ease-premium hover:bg-surface-muted hover:text-fg'
</script>

<template>
  <BaseButton v-if="boats.length === 0" variant="secondary" size="sm" disabled>
    {{ t('reservations.form.createTitle') }}
  </BaseButton>

  <Link
    v-else-if="selectedBoatId || boats.length === 1"
    :href="targetHref(selectedBoatId ?? boats[0].id)"
    class="inline-flex h-8 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-brand px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
  >
    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
    </svg>
    {{ t('reservations.form.createTitle') }}
  </Link>

  <BaseDropdown v-else variant="primary">
    <template #trigger>+ {{ t('reservations.form.createTitle') }}</template>
    <template #default="{ close }">
      <p class="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
        {{ t('reservations.fleet.chooseBoat') }}
      </p>
      <Link
        v-for="boat in boats"
        :key="boat.id"
        :href="targetHref(boat.id)"
        role="menuitem"
        :class="menuItemClass"
        @click="close"
      >
        {{ boat.name }}
      </Link>
    </template>
  </BaseDropdown>
</template>
