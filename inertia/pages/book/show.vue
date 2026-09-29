<script lang="ts">
import BookingLayout from '~/layouts/booking.vue'
export default { layout: BookingLayout }
</script>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import BaseAlert from '~/components/base/BaseAlert.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import PublicBoatGallery from '~/components/public_booking/PublicBoatGallery.vue'
import PublicBoatSpecs from '~/components/public_booking/PublicBoatSpecs.vue'
import PublicBookingCalendar from '~/components/public_booking/PublicBookingCalendar.vue'
import PublicBookingQuotePanel from '~/components/public_booking/PublicBookingQuotePanel.vue'
import PublicBookingRequestForm from '~/components/public_booking/PublicBookingRequestForm.vue'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import { nextDraft, type PublicBookingDraft } from '#shared/helpers/public_booking'
import type {
  PublicBookingBoat,
  PublicBookingOrganization,
  PublicBookingQuote,
  PublicBusyRange,
} from '#shared/types/public_booking'

/**
 * Page publique de réservation d'un bateau (`/book/:orgSlug/:boatSlug`, #881).
 * Le client choisit ses dates sur le calendrier ; chaque sélection complète
 * recharge la seule prop `quote` (visite partielle) pour afficher le devis
 * calculé par le serveur, puis il envoie sa demande.
 */
const props = defineProps<{
  organization: PublicBookingOrganization
  boat: PublicBookingBoat
  busy: PublicBusyRange[]
  /** Premier jour réservable et horizon du calendrier (`YYYY-MM-DD`). */
  bookableFrom: string
  bookableUntil: string
  quote: PublicBookingQuote | null
  /** La demande vient d'être envoyée (retour de `POST …/request`). */
  submitted: boolean
}>()

const { t } = useT()
const { formatCurrency } = useNumberFormat()

const pageUrl = computed(() => `/book/${props.organization.slug}/${props.boat.slug}`)

const draft = ref<PublicBookingDraft | null>(props.quote ? { ...props.quote.selection } : null)
const loading = ref(false)

/** Sélection envoyable : complète, devis à jour, dates libres et durée dans les bornes. */
const selection = computed(() => {
  const current = draft.value
  const quote = props.quote
  if (!current?.endsOn || !quote || quote.state !== 'ok') return null
  if (quote.selection.startsOn !== current.startsOn || quote.selection.endsOn !== current.endsOn) {
    return null
  }
  if (quote.quote?.boundsError) return null
  return { startsOn: current.startsOn, endsOn: current.endsOn }
})

function pick(day: string) {
  draft.value = nextDraft(day, draft.value, props.busy)
  if (!draft.value.endsOn) return
  router.get(
    pageUrl.value,
    { startsOn: draft.value.startsOn, endsOn: draft.value.endsOn },
    {
      only: ['quote'],
      preserveState: true,
      preserveScroll: true,
      replace: true,
      onStart: () => (loading.value = true),
      onFinish: () => (loading.value = false),
    }
  )
}

function money(value: number): string {
  return formatCurrency(value, { currency: props.boat.pricing?.currency || 'EUR' })
}
</script>

<template>
  <Head
    :title="t('public.booking.show.title', { boatName: boat.name, orgName: organization.name })"
  >
    <meta name="robots" content="noindex" />
  </Head>

  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_26rem]">
      <section class="space-y-6">
        <PublicBoatGallery :photos="boat.photos" :boat-name="boat.name" />
        <div>
          <BaseHeading level="1">{{ boat.name }}</BaseHeading>
          <PublicBoatSpecs class="mt-2" :boat="boat" />
          <p
            v-if="boat.manufacturer || boat.model || boat.yearBuilt"
            class="mt-1 text-sm text-fg-muted"
          >
            {{ [boat.manufacturer, boat.model, boat.yearBuilt].filter(Boolean).join(' · ') }}
          </p>
        </div>
        <BaseCard v-if="boat.pricing">
          <p class="text-sm font-semibold text-fg">{{ t('public.booking.pricing.title') }}</p>
          <dl class="mt-3 space-y-1.5 text-sm">
            <div class="flex justify-between gap-4">
              <dt class="text-fg-muted">{{ t('public.booking.pricing.daily') }}</dt>
              <dd class="text-fg">{{ money(boat.pricing.dailyPrice) }}</dd>
            </div>
            <div v-if="boat.pricing.weeklyPrice !== null" class="flex justify-between gap-4">
              <dt class="text-fg-muted">{{ t('public.booking.pricing.weekly') }}</dt>
              <dd class="text-fg">{{ money(boat.pricing.weeklyPrice) }}</dd>
            </div>
            <div v-if="boat.pricing.depositAmount" class="flex justify-between gap-4">
              <dt class="text-fg-muted">{{ t('public.booking.pricing.securityDeposit') }}</dt>
              <dd class="text-fg">{{ money(boat.pricing.depositAmount) }}</dd>
            </div>
            <div v-if="boat.pricing.minDays" class="flex justify-between gap-4">
              <dt class="text-fg-muted">{{ t('public.booking.pricing.minDays') }}</dt>
              <dd class="text-fg">
                {{ t('public.booking.pricing.nights', { count: String(boat.pricing.minDays) }) }}
              </dd>
            </div>
          </dl>
          <p class="mt-3 text-xs text-fg-subtle">{{ t('public.booking.pricing.seasons') }}</p>
        </BaseCard>
      </section>

      <aside>
        <BaseCard class="lg:sticky lg:top-6">
          <BaseAlert v-if="submitted" variant="success" data-testid="public-booking-submitted">
            {{ t('public.booking.submitted', { orgName: organization.name }) }}
          </BaseAlert>
          <template v-else>
            <p class="text-base font-semibold text-fg">{{ t('public.booking.show.heading') }}</p>
            <PublicBookingCalendar
              class="mt-4"
              :busy="busy"
              :bookable-from="bookableFrom"
              :bookable-until="bookableUntil"
              :draft="draft"
              @pick="pick"
            />
            <PublicBookingQuotePanel
              class="mt-5"
              :draft="draft"
              :quote="quote"
              :loading="loading"
            />
            <div class="mt-6 border-t border-border pt-6">
              <PublicBookingRequestForm
                :action="`${pageUrl}/request`"
                :org-name="organization.name"
                :selection="selection"
              />
            </div>
          </template>
        </BaseCard>
      </aside>
    </div>
  </div>
</template>
