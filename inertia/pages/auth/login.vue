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
import BaseInput from '~/components/base/BaseInput.vue'
import { useT } from '~/composables/useT'

const { t } = useT()

const showPassword = ref(false)
const passwordType = computed(() => (showPassword.value ? 'text' : 'password'))
</script>

<template>

  <Head title="Connexion" />

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
          Mer calme, flotte sereine.
        </h2>
        <p class="mt-4 text-base leading-relaxed text-white/70">
          La plateforme de maintenance pour gestionnaires de flotte maritime —
          historique immuable, planification intelligente, IA Mistral.
        </p>
      </div>

      <ul class="space-y-3">
        <li
          v-for="item in [
            'Historique de maintenance complet',
            'Planning intelligent par heures moteur',
            'Suggestions IA personnalisées',
          ]"
          :key="item"
          class="flex items-center gap-3 text-sm text-white/70"
        >
          <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-white/50" />
          {{ item }}
        </li>
      </ul>

      <blockquote class="border-l-2 border-white/25 pl-4">
        <p class="text-sm italic leading-relaxed text-white/60">
          "Depuis FleetAi, je sais ce qui doit être fait avant que ça grince."
        </p>
        <footer class="mt-2 text-xs text-white/40">— Marc, Marina Bleue</footer>
      </blockquote>

      <p class="text-xs text-white/30">© {{ new Date().getFullYear() }} FleetAi</p>
    </div>

    <!-- Panneau droit — fond crème -->
    <div class="flex flex-1 flex-col justify-center bg-cream px-8 py-12 lg:px-16">
      <div class="mx-auto w-full max-w-sm">
        <div class="space-y-1.5">
          <h1 class="font-display text-2xl italic text-fg">{{ t('auth.login.title') }}</h1>
          <p class="text-sm text-fg-muted">{{ t('auth.login.subtitle') }}</p>
        </div>

        <div class="mt-8">
          <Form route="session.store" #default="{ processing, errors }">
            <div class="space-y-5">
              <BaseInput
                id="email"
                name="email"
                type="email"
                autocomplete="username"
                :label="t('auth.login.emailLabel')"
                :placeholder="t('auth.login.emailPlaceholder')"
                :errors="errors"
              />

              <BaseInput
                id="password"
                name="password"
                :type="passwordType"
                autocomplete="current-password"
                :label="t('auth.login.passwordLabel')"
                placeholder="••••••••"
                :errors="errors"
              >
                <template #trailing>
                  <button
                    type="button"
                    class="inline-flex items-center text-sm font-medium text-fg-muted hover:text-fg focus-visible:outline-none"
                    :aria-label="showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')"
                    @click="showPassword = !showPassword"
                  >
                    {{ showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword') }}
                  </button>
                </template>
              </BaseInput>

              <div class="flex items-center justify-between">
                <label class="flex cursor-pointer items-center gap-2 text-sm text-fg-muted">
                  <input type="checkbox" name="remember" class="rounded border-bone" />
                  Rester connecté 30 jours
                </label>
                <a href="/forgot-password" class="text-sm text-brand hover:underline">
                  Oublié ?
                </a>
              </div>

              <BaseButton type="submit" size="lg" :disabled="processing" class="w-full">
                {{ t('auth.login.submit') }}
              </BaseButton>
            </div>
          </Form>
        </div>

        <p class="mt-6 text-center text-sm text-fg-muted">
          Pas encore de compte ?
          <a href="/signup" class="font-semibold text-brand hover:underline">Créer une organisation</a>
        </p>
      </div>
    </div>
  </div>
</template>
