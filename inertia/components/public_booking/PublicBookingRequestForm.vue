<script setup lang="ts">
import { computed } from 'vue'
import { useForm, usePage } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCheckbox from '~/components/base/BaseCheckbox.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useT } from '~/composables/use_t'
import {
  PUBLIC_BOOKING_MESSAGE_MAX,
  PUBLIC_BOOKING_REQUEST_RETENTION_DAYS,
} from '#shared/constants/public_booking'
import type { PublicBookingSelection } from '#shared/types/public_booking'

/**
 * Formulaire de demande de la page publique (#881). Miroir de
 * `publicBookingRequestValidator`. Le champ `website` est un piège à robots :
 * hors écran et hors tabulation, un humain ne le remplit jamais.
 */
const props = defineProps<{
  action: string
  orgName: string
  /** Sélection complète (arrivée et départ) — sans elle, le bouton reste inactif. */
  selection: PublicBookingSelection | null
}>()

const { t } = useT()
const page = usePage<{ locale?: string }>()

const form = useForm({
  name: '',
  email: '',
  phone: '',
  message: '',
  consent: false,
  website: '',
  // Posés depuis la sélection du calendrier au moment de l'envoi.
  startsOn: '',
  endsOn: '',
  locale: '',
})

const canSubmit = computed(() => props.selection !== null && !form.processing)

function submit() {
  if (!props.selection) return
  form.startsOn = props.selection.startsOn
  form.endsOn = props.selection.endsOn
  form.locale = page.props.locale ?? 'fr'
  form.post(props.action, {
    preserveScroll: true,
    onSuccess: () => form.reset(),
  })
}
</script>

<template>
  <form class="space-y-4" data-testid="public-booking-form" @submit.prevent="submit">
    <BaseInput
      id="booking-name"
      v-model="form.name"
      :label="t('public.booking.form.name')"
      autocomplete="name"
      :error="form.errors.name"
      required
    />
    <div class="grid gap-4 sm:grid-cols-2">
      <BaseInput
        id="booking-email"
        v-model="form.email"
        type="email"
        :label="t('public.booking.form.email')"
        autocomplete="email"
        :error="form.errors.email"
        required
      />
      <BaseInput
        id="booking-phone"
        v-model="form.phone"
        type="tel"
        :label="t('public.booking.form.phone')"
        autocomplete="tel"
        :error="form.errors.phone"
      />
    </div>
    <BaseTextarea
      id="booking-message"
      v-model="form.message"
      :label="t('public.booking.form.message')"
      :placeholder="t('public.booking.form.messagePlaceholder')"
      :maxlength="PUBLIC_BOOKING_MESSAGE_MAX"
      :error="form.errors.message"
    />

    <div class="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
      <label for="booking-website">{{ t('public.booking.form.honeypot') }}</label>
      <input
        id="booking-website"
        v-model="form.website"
        type="text"
        tabindex="-1"
        autocomplete="off"
      />
    </div>

    <BaseCheckbox
      id="booking-consent"
      v-model="form.consent"
      :label="
        t('public.booking.form.consent', {
          orgName,
          days: String(PUBLIC_BOOKING_REQUEST_RETENTION_DAYS),
        })
      "
      :error="form.errors.consent"
    />

    <p v-if="form.errors.startsOn || form.errors.endsOn" class="text-sm text-danger">
      {{ t('public.booking.form.datesError') }}
    </p>

    <BaseButton
      type="submit"
      class="w-full"
      :disabled="!canSubmit"
      data-testid="public-booking-submit"
    >
      {{ selection ? t('public.booking.form.submit') : t('public.booking.form.pickDates') }}
    </BaseButton>
    <p class="text-xs text-fg-subtle">{{ t('public.booking.form.noCommitment') }}</p>
  </form>
</template>
