<script lang="ts">
import PublicLayout from '~/layouts/public.vue'

export default {
  layout: PublicLayout,
}
</script>

<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { computed, ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useT } from '~/composables/useT'

const { t } = useT()

const showPassword = ref(false)
const showPasswordConfirmation = ref(false)
const passwordType = computed(() => (showPassword.value ? 'text' : 'password'))
const passwordConfirmationType = computed(() =>
  showPasswordConfirmation.value ? 'text' : 'password'
)
</script>

<template>
  <!-- Split layout : panneau gauche navy-800 · panneau droit crème -->
  <div class="-mx-6 -my-10 sm:-mx-8 flex min-h-[calc(100vh-4rem)] overflow-hidden">

    <!-- Panneau gauche navy (42 % desktop) -->
    <div class="hidden w-[42%] flex-col justify-between bg-navy-800 px-12 py-16 lg:flex">
      <div>
        <div class="inline-flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="32" cy="32" r="28" stroke="#faf6ee" stroke-width="2.6"/>
            <path d="M32 9 L37.5 32 L32 36.5 L26.5 32 Z" fill="#faf6ee"/>
            <path d="M32 55 L37.5 32 L32 27.5 L26.5 32 Z" fill="#e2674f"/>
            <circle cx="32" cy="32" r="2.4" fill="#102a40" stroke="#faf6ee" stroke-width="1.4"/>
          </svg>
          <span class="font-display text-base text-white" style="letter-spacing:-0.025em">Fleet<em style="font-style:italic;color:#e2674f">Ai</em></span>
        </div>
        <h2 class="mt-8 font-display text-3xl italic leading-snug text-white">
          Crée ta flotte en 2 minutes.
        </h2>
        <p class="mt-4 text-base leading-relaxed text-white/70">
          14 jours d'essai gratuits · pas de carte bleue.
          Importe tes données depuis Excel en quelques clics.
        </p>
      </div>

      <ul class="space-y-3">
        <li
          v-for="item in [
            'Gratuit jusqu\'à 3 bateaux',
            'Sans carte bancaire',
            'Migration depuis vos tableurs en 1 clic',
          ]"
          :key="item"
          class="flex items-center gap-3 text-sm text-white/70"
        >
          <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-white/50" />
          {{ item }}
        </li>
      </ul>

      <p class="text-xs text-white/30">© {{ new Date().getFullYear() }} FleetAi</p>
    </div>

    <!-- Panneau droit — fond crème -->
    <div class="flex flex-1 flex-col justify-center bg-cream px-8 py-12 lg:px-16">
      <div class="mx-auto w-full max-w-sm">
        <div class="space-y-2">
          <h1 class="font-display text-2xl italic text-fg">{{ t('auth.signup.title') }}</h1>
          <p class="text-sm text-fg-muted">{{ t('auth.signup.subtitle') }}</p>
        </div>

        <div class="mt-8">
          <Form route="new_account.store" #default="{ processing, errors }">
            <div class="space-y-5">
              <BaseInput
                id="fullName"
                name="fullName"
                :label="t('auth.signup.fullNameLabel')"
                :placeholder="t('auth.signup.fullNamePlaceholder')"
                autocomplete="name"
                :errors="errors"
              />

              <BaseInput
                id="email"
                name="email"
                type="email"
                autocomplete="email"
                :label="t('auth.signup.emailLabel')"
                :placeholder="t('auth.signup.emailPlaceholder')"
                :errors="errors"
              />

              <BaseInput
                id="password"
                name="password"
                :type="passwordType"
                autocomplete="new-password"
                :label="t('auth.signup.passwordLabel')"
                placeholder="••••••••"
                :errors="errors"
              >
                <template #trailing>
                  <button
                    type="button"
                    class="inline-flex items-center text-sm font-semibold text-fg-muted hover:text-fg focus-visible:outline-none"
                    :aria-label="showPassword ? t('auth.signup.hidePassword') : t('auth.signup.showPassword')"
                    @click="showPassword = !showPassword"
                  >
                    {{ showPassword ? t('auth.signup.hidePassword') : t('auth.signup.showPassword') }}
                  </button>
                </template>
              </BaseInput>

              <BaseInput
                id="passwordConfirmation"
                name="passwordConfirmation"
                :type="passwordConfirmationType"
                autocomplete="new-password"
                :label="t('auth.signup.passwordConfirmLabel')"
                placeholder="••••••••"
                :errors="errors"
              >
                <template #trailing>
                  <button
                    type="button"
                    class="inline-flex items-center text-sm font-semibold text-fg-muted hover:text-fg focus-visible:outline-none"
                    :aria-label="showPasswordConfirmation ? t('auth.signup.hidePassword') : t('auth.signup.showPassword')"
                    @click="showPasswordConfirmation = !showPasswordConfirmation"
                  >
                    {{ showPasswordConfirmation ? t('auth.signup.hidePassword') : t('auth.signup.showPassword') }}
                  </button>
                </template>
              </BaseInput>

              <BaseButton type="submit" size="lg" :disabled="processing" class="w-full">
                {{ t('auth.signup.submit') }}
              </BaseButton>
            </div>
          </Form>
        </div>

        <p class="mt-6 text-center text-sm text-fg-muted">
          Deja un compte ?
          <a href="/login" class="font-semibold text-brand hover:underline">Se connecter</a>
        </p>
      </div>
    </div>
  </div>
</template>
