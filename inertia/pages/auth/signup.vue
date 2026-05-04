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
  <div class="-mx-6 -my-10 sm:-mx-8 flex min-h-[calc(100vh-4rem)] overflow-hidden">
    <!-- Left dark panel -->
    <div class="hidden w-1/2 flex-col justify-between bg-abyss-950 px-12 py-16 lg:flex">
      <div>
        <div class="inline-flex items-center gap-2 rounded-full bg-lagoon-500/15 px-3 py-1.5 text-sm font-semibold text-lagoon-400">
          &#10022; Fleetide AI
        </div>
        <h2 class="mt-8 font-display text-3xl font-bold leading-tight text-white">
          Demarrez gratuitement en 2 minutes
        </h2>
        <p class="mt-4 text-base text-abyss-300">
          Creez votre compte et commencez a suivre l'etat technique de vos bateaux des aujourd'hui.
        </p>
      </div>
      <ul class="space-y-4">
        <li v-for="item in [
          { icon: '&#9989;', text: 'Gratuit jusqu\'a 3 bateaux' },
          { icon: '&#9989;', text: 'Sans carte bancaire' },
          { icon: '&#9989;', text: 'Migration depuis vos tableurs en 1 clic' },
        ]" :key="item.text" class="flex items-center gap-3 text-sm text-abyss-200">
          <span class="text-lagoon-400" v-html="item.icon" />
          {{ item.text }}
        </li>
      </ul>
      <p class="text-xs text-abyss-500">© {{ new Date().getFullYear() }} Fleetide AI</p>
    </div>

    <!-- Right form panel -->
    <div class="flex flex-1 flex-col justify-center bg-linear-to-br from-lilac-50 via-peach-50 to-mint-100 px-8 py-12 lg:px-16">
      <div class="mx-auto w-full max-w-sm">
        <div class="space-y-2">
          <h1 class="font-display text-2xl font-bold text-fg">{{ t('auth.signup.title') }}</h1>
          <p class="text-base text-fg-muted">{{ t('auth.signup.subtitle') }}</p>
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
