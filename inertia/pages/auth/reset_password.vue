<script lang="ts">
import PublicLayout from '~/layouts/public.vue'

export default {
  layout: PublicLayout,
}
</script>

<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { usePage } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useT } from '~/composables/useT'

const { t } = useT()
const page = usePage()

defineProps<{ token: string }>()

const showPassword = ref(false)
const showConfirm = ref(false)
const passwordType = computed(() => (showPassword.value ? 'text' : 'password'))
const confirmType = computed(() => (showConfirm.value ? 'text' : 'password'))
</script>

<template>
  <Head :title="t('auth.resetPassword.title')" />

  <div class="-mx-6 -my-10 sm:-mx-8 flex min-h-[calc(100vh-4rem)] overflow-hidden">

    <!-- Panneau gauche navy -->
    <div class="hidden w-[42%] flex-col justify-between bg-navy-800 px-12 py-16 lg:flex">
      <div>
        <div class="inline-flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="32" cy="32" r="28" stroke="#faf6ee" stroke-width="2.6" />
            <path d="M32 9 L37.5 32 L32 36.5 L26.5 32 Z" fill="#faf6ee" />
            <path d="M32 55 L37.5 32 L32 27.5 L26.5 32 Z" fill="#e2674f" />
            <circle cx="32" cy="32" r="2.4" fill="#102a40" stroke="#faf6ee" stroke-width="1.4" />
          </svg>
          <span class="font-display text-base text-white" style="letter-spacing:-0.025em">Fleet<em style="font-style:italic;color:#e2674f">Ai</em></span>
        </div>
        <h2 class="mt-8 font-display text-3xl italic leading-snug text-white">
          {{ t('auth.login.marketing.tagline') }}
        </h2>
      </div>

      <p class="text-xs text-white/30">{{ t('auth.login.marketing.copyright', { year: String(new Date().getFullYear()) }) }}</p>
    </div>

    <!-- Panneau droit crème -->
    <div class="flex flex-1 flex-col justify-center bg-cream px-8 py-12 lg:px-16">
      <div class="mx-auto w-full max-w-sm">
        <div class="space-y-1.5">
          <h1 class="font-display text-2xl italic text-fg">{{ t('auth.resetPassword.title') }}</h1>
          <p class="text-sm text-fg-muted">{{ t('auth.resetPassword.subtitle') }}</p>
        </div>

        <div class="mt-8">
          <div
            v-if="page.props.flash?.error"
            class="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {{ page.props.flash.error }}
          </div>

          <Form method="POST" action="/reset-password" #default="{ processing, errors }">
            <input type="hidden" name="token" :value="token" />
            <div class="space-y-5">
              <BaseInput
                id="password"
                name="password"
                :type="passwordType"
                autocomplete="new-password"
                :label="t('auth.resetPassword.passwordLabel')"
                placeholder="••••••••"
                :errors="errors"
              >
                <template #trailing>
                  <button
                    type="button"
                    class="inline-flex items-center text-sm font-medium text-fg-muted hover:text-fg focus-visible:outline-none"
                    @click="showPassword = !showPassword"
                  >
                    {{ showPassword ? t('auth.resetPassword.hidePassword') : t('auth.resetPassword.showPassword') }}
                  </button>
                </template>
              </BaseInput>

              <BaseInput
                id="passwordConfirmation"
                name="passwordConfirmation"
                :type="confirmType"
                autocomplete="new-password"
                :label="t('auth.resetPassword.passwordConfirmLabel')"
                placeholder="••••••••"
                :errors="errors"
              >
                <template #trailing>
                  <button
                    type="button"
                    class="inline-flex items-center text-sm font-medium text-fg-muted hover:text-fg focus-visible:outline-none"
                    @click="showConfirm = !showConfirm"
                  >
                    {{ showConfirm ? t('auth.resetPassword.hidePassword') : t('auth.resetPassword.showPassword') }}
                  </button>
                </template>
              </BaseInput>

              <BaseButton type="submit" size="lg" :disabled="processing" class="w-full">
                {{ t('auth.resetPassword.submit') }}
              </BaseButton>
            </div>
          </Form>
        </div>

        <p class="mt-6 text-center text-sm text-fg-muted">
          <a href="/login" class="font-semibold text-brand hover:underline">
            {{ t('auth.resetPassword.backToLogin') }}
          </a>
        </p>
      </div>
    </div>
  </div>
</template>
