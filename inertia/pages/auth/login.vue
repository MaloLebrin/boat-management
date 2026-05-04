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

  <Head title="Login" />
  <div class="-mx-6 -my-10 sm:-mx-8 flex min-h-[calc(100vh-4rem)] overflow-hidden">
    <!-- Left dark panel -->
    <div class="hidden w-1/2 flex-col justify-between bg-abyss-950 px-12 py-16 lg:flex">
      <div>
        <div
          class="inline-flex items-center gap-2 rounded-full bg-lagoon-500/15 px-3 py-1.5 text-sm font-semibold text-lagoon-400">
          &#10022; Fleet AI
        </div>
        <h2 class="mt-8 font-display text-3xl font-bold leading-tight text-white">
          Gerez votre flotte avec l'intelligence artificielle
        </h2>
        <p class="mt-4 text-base text-abyss-300">
          Suivi technique, maintenance predictive et alertes intelligentes pour tous vos bateaux.
        </p>
      </div>
      <ul class="space-y-4">
        <li v-for="item in [
          { icon: '&#9989;', text: 'Historique de maintenance complet' },
          { icon: '&#9989;', text: 'Planning intelligent par heures moteur' },
          { icon: '&#9989;', text: 'Suggestions IA personnalisees' },
        ]" :key="item.text" class="flex items-center gap-3 text-sm text-abyss-200">
          <span class="text-lagoon-400" v-html="item.icon" />
          {{ item.text }}
        </li>
      </ul>
      <p class="text-xs text-abyss-500">© {{ new Date().getFullYear() }} Fleetide AI</p>
    </div>

    <!-- Right form panel -->
    <div
      class="flex flex-1 flex-col justify-center bg-linear-to-br from-lilac-50 via-peach-50 to-mint-100 px-8 py-12 lg:px-16">
      <div class="mx-auto w-full max-w-sm">
        <div class="space-y-2">
          <h1 class="font-display text-2xl font-bold text-fg">{{ t('auth.login.title') }}</h1>
          <p class="text-base text-fg-muted">{{ t('auth.login.subtitle') }}</p>
        </div>

        <div class="mt-8">
          <Form route="session.store" #default="{ processing, errors }">
            <div class="space-y-5">
              <BaseInput id="email" name="email" type="email" autocomplete="username"
                :label="t('auth.login.emailLabel')" :placeholder="t('auth.login.emailPlaceholder')" :errors="errors" />

              <BaseInput id="password" name="password" :type="passwordType" autocomplete="current-password"
                :label="t('auth.login.passwordLabel')" placeholder="••••••••" :errors="errors">
                <template #trailing>
                  <button type="button"
                    class="inline-flex items-center text-sm font-semibold text-fg-muted hover:text-fg focus-visible:outline-none"
                    :aria-label="showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')"
                    @click="showPassword = !showPassword">
                    {{ showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword') }}
                  </button>
                </template>
              </BaseInput>

              <BaseButton type="submit" size="lg" :disabled="processing" class="w-full">
                {{ t('auth.login.submit') }}
              </BaseButton>
            </div>
          </Form>
        </div>

        <p class="mt-6 text-center text-sm text-fg-muted">
          Pas encore de compte ?
          <a href="/signup" class="font-semibold text-brand hover:underline">S'inscrire</a>
        </p>
      </div>
    </div>
  </div>
</template>
