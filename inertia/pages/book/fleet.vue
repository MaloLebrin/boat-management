<script lang="ts">
import BookingLayout from '~/layouts/booking.vue'
export default { layout: BookingLayout }
</script>

<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import PublicBoatCard from '~/components/public_booking/PublicBoatCard.vue'
import { useT } from '~/composables/use_t'
import type { PublicBookingBoatCard, PublicBookingOrganization } from '#shared/types/public_booking'

/**
 * Page flotte publique d'un loueur (`/book/:orgSlug`, #881) : les bateaux
 * dont la page de réservation est ouverte. Le lien à mettre sur un site ou un
 * réseau social quand on loue plusieurs bateaux.
 */
defineProps<{
  organization: PublicBookingOrganization
  boats: PublicBookingBoatCard[]
}>()

const { t } = useT()
</script>

<template>
  <Head :title="t('public.booking.fleet.title', { orgName: organization.name })">
    <meta name="robots" content="noindex" />
  </Head>

  <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6">
    <BaseHeading level="1">
      {{ t('public.booking.fleet.heading', { orgName: organization.name }) }}
    </BaseHeading>
    <p class="mt-2 text-fg-muted">{{ t('public.booking.fleet.intro') }}</p>

    <div v-if="boats.length" class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <PublicBoatCard
        v-for="boat in boats"
        :key="boat.slug"
        :org-slug="organization.slug"
        :boat="boat"
      />
    </div>
    <BaseEmptyState
      v-else
      class="mt-8"
      :title="t('public.booking.fleet.emptyTitle')"
      :description="t('public.booking.fleet.emptyDescription')"
    />
  </div>
</template>
