<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import PublicBoatSpecs from '~/components/public_booking/PublicBoatSpecs.vue'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import type { PublicBookingBoatCard } from '#shared/types/public_booking'

/** Carte d'un bateau sur la page flotte publique (#881). */
defineProps<{
  orgSlug: string
  boat: PublicBookingBoatCard
}>()

const { t } = useT()
const { formatCurrency } = useNumberFormat()
</script>

<template>
  <Link
    :href="`/book/${orgSlug}/${boat.slug}`"
    class="group block overflow-hidden rounded-(--radius-card) border border-border bg-surface-elevated shadow-(--shadow-xs) transition hover:shadow-(--shadow-sm)"
    data-testid="public-boat-card"
  >
    <div class="aspect-[4/3] bg-surface-muted">
      <img
        v-if="boat.photoUrl"
        :src="boat.photoUrl"
        :alt="boat.name"
        class="h-full w-full object-cover"
        loading="lazy"
      />
    </div>
    <div class="space-y-1 p-4">
      <p class="text-base font-semibold text-fg group-hover:text-brand">{{ boat.name }}</p>
      <PublicBoatSpecs :boat="boat" />
      <p v-if="boat.pricing" class="pt-1 text-sm font-medium text-fg">
        {{
          t('public.booking.boat.fromPrice', {
            price: formatCurrency(boat.pricing.dailyPrice, { currency: boat.pricing.currency }),
          })
        }}
      </p>
    </div>
  </Link>
</template>
