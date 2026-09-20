<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'
import type { Data } from '@generated/data'
import { useT } from '~/composables/use_t'

/**
 * Rappel de vérification d'adresse (#768).
 *
 * Une bannière plutôt qu'un blocage : l'app reste accessible, seules les
 * actions qui engagent des tiers ou de l'argent attendent la vérification.
 * Sans ce rappel, l'utilisateur découvrirait la garde au moment d'envoyer sa
 * première facture, sans savoir quoi faire.
 *
 * `emailVerified` est un booléen porté par la prop partagée `user` : un
 * visiteur anonyme n'a pas de `user`, la bannière ne s'affiche donc jamais sur
 * les écrans publics.
 */
const page = usePage<Data.SharedProps>()
const { t } = useT()

const isVisible = computed(() => page.props.user !== undefined && !page.props.user.emailVerified)
</script>

<template>
  <div
    v-if="isVisible"
    role="status"
    class="flex items-center justify-between gap-4 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800"
  >
    <span>{{ t('auth.verifyEmail.bannerText') }}</span>
    <Link href="/verify-email" class="shrink-0 font-semibold underline underline-offset-2">
      {{ t('auth.verifyEmail.bannerAction') }}
    </Link>
  </div>
</template>
