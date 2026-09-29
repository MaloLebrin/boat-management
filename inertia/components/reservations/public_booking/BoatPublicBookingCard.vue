<script setup lang="ts">
import { ref } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseToggle from '~/components/base/BaseToggle.vue'
import { useT } from '~/composables/use_t'
import type { BoatPublicBookingSettings } from '#shared/types/public_booking'

/**
 * Encart « Réservation en ligne » d'un bateau (#881) : ouvrir la page publique
 * où le client final voit les disponibilités et envoie une demande, et copier
 * son adresse. Les demandes arrivent en `option` dans la liste ci-dessous.
 */
const props = defineProps<{
  boatId: number
  settings: BoatPublicBookingSettings
}>()

const { t } = useT()
const saving = ref(false)
const copied = ref(false)

function toggle(enabled: boolean) {
  router.patch(
    `/boats/${props.boatId}/public-booking`,
    { enabled },
    {
      preserveScroll: true,
      onStart: () => (saving.value = true),
      onFinish: () => (saving.value = false),
    }
  )
}

async function copy() {
  if (!props.settings.url) return
  try {
    await navigator.clipboard.writeText(props.settings.url)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    // Presse-papiers refusé : l'adresse reste sélectionnable dans le champ.
  }
}
</script>

<template>
  <BaseCard data-testid="boat-public-booking">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0 flex-1">
        <p class="text-base font-semibold text-fg">{{ t('reservations.publicBooking.title') }}</p>
        <p class="mt-1 text-sm text-fg-muted">{{ t('reservations.publicBooking.intro') }}</p>
      </div>
      <BaseToggle
        v-if="settings.canManage"
        id="public-booking-enabled"
        :model-value="settings.enabled"
        :disabled="saving"
        :label="t('reservations.publicBooking.toggle')"
        @update:model-value="toggle"
      />
    </div>

    <div v-if="settings.enabled && settings.url" class="mt-4 space-y-2">
      <div class="flex flex-wrap items-end gap-2">
        <BaseInput
          id="public-booking-url"
          class="min-w-0 flex-1"
          :model-value="settings.url"
          readonly
        />
        <BaseButton size="sm" variant="secondary" type="button" @click="copy">
          {{
            copied ? t('reservations.publicBooking.copied') : t('reservations.publicBooking.copy')
          }}
        </BaseButton>
        <!-- eslint-disable vue/no-restricted-v-bind -- nouvel onglet : `<Link target="_blank">` naviguerait dans l'onglet courant (voir CLAUDE.md) -->
        <a
          :href="settings.url"
          target="_blank"
          rel="noopener"
          class="text-sm font-medium text-brand hover:underline"
        >
          {{ t('reservations.publicBooking.open') }}
        </a>
        <!-- eslint-enable vue/no-restricted-v-bind -->
      </div>
      <p class="text-xs text-fg-muted">
        {{ t('reservations.publicBooking.fleetHint', { url: settings.fleetUrl }) }}
      </p>
      <p class="text-xs text-fg-muted">{{ t('reservations.publicBooking.requestsHint') }}</p>
    </div>
    <p v-else class="mt-3 text-sm text-fg-muted">{{ t('reservations.publicBooking.closed') }}</p>
  </BaseCard>
</template>
