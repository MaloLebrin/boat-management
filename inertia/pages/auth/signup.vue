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
          <svg width="28" height="28" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true">
            <circle cx="32" cy="32" r="28" stroke="#faf6ee" stroke-width="2.6" />
            <path d="M32 9 L37.5 32 L32 36.5 L26.5 32 Z" fill="#faf6ee" />
            <path d="M32 55 L37.5 32 L32 27.5 L26.5 32 Z" fill="#e2674f" />
            <circle cx="32" cy="32" r="2.4" fill="#102a40" stroke="#faf6ee" stroke-width="1.4" />
          </svg>
          <span class="font-display text-base text-white" style="letter-spacing:-0.025em">Fleet<em
              style="font-style:italic;color:#e2674f">Ai</em></span>
        </div>
        <h2 class="mt-8 font-display text-3xl italic leading-snug text-white">
          {{ t('auth.signup.marketing.tagline') }}
        </h2>
        <p class="mt-4 text-base leading-relaxed text-white/70">
          {{ t('auth.signup.marketing.description') }}
        </p>
      </div>

      <ul class="space-y-3">
        <li
          v-for="key in ['auth.signup.marketing.feature0', 'auth.signup.marketing.feature1', 'auth.signup.marketing.feature2']"
          :key="key" class="flex items-center gap-3 text-sm text-white/70">
          <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-white/50" />
          {{ t(key) }}
        </li>
      </ul>

      <p class="text-xs text-white/30">{{ t('auth.signup.marketing.copyright', {
        year: String(new Date().getFullYear())
      }) }}</p>
    </div>

    <!-- Panneau droit — fond crème -->
    <div class="flex flex-1 flex-col justify-center bg-cream px-8 py-12 lg:px-16">
      <div class="mx-auto w-full max-w-sm">
        <div class="space-y-2">
          <h1 class="font-display text-2xl italic text-fg">{{ t('auth.signup.title') }}</h1>
          <p class="text-sm text-fg-muted">{{ t('auth.signup.subtitle') }}</p>
        </div>

        <div class="mt-8">
          <!-- 
          <div class="space-y-2">
            <button type="button"
              class="flex w-full items-center justify-center gap-3 rounded-(--radius-control) border border-bone bg-paper py-2.5 text-sm font-medium text-fg transition-colors hover:bg-bone">
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4" />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853" />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05" />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335" />
              </svg>
              {{ t('auth.signup.withGoogle') }}
            </button>
            <button type="button"
              class="flex w-full items-center justify-center gap-3 rounded-(--radius-control) border border-bone bg-paper py-2.5 text-sm font-medium text-fg transition-colors hover:bg-bone">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path
                  d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              {{ t('auth.signup.withApple') }}
            </button>
          </div>

          <div class="relative my-5">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-bone"></div>
            </div>
            <div class="relative flex justify-center"><span class="bg-cream px-3 text-xs text-fg-subtle">{{
              t('auth.signup.withEmail') }}</span></div>
          </div> -->

          <Form route="new_account.store" #default="{ processing, errors }">
            <div class="space-y-5">
              <div class="flex gap-3">
                <BaseInput id="firstName" name="firstName" :label="t('auth.signup.firstNameLabel')"
                  :placeholder="t('auth.signup.firstNamePlaceholder')" autocomplete="given-name" :errors="errors"
                  class="flex-1" />
                <BaseInput id="lastName" name="lastName" :label="t('auth.signup.lastNameLabel')"
                  :placeholder="t('auth.signup.lastNamePlaceholder')" autocomplete="family-name" :errors="errors"
                  class="flex-1" />
              </div>

              <BaseInput id="email" name="email" type="email" autocomplete="email" :label="t('auth.signup.emailLabel')"
                :placeholder="t('auth.signup.emailPlaceholder')" :errors="errors" />

              <div class="border-t border-bone pt-4">
                <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">{{
                  t('auth.signup.orgSection') }}</p>
                <div class="space-y-3">
                  <BaseInput id="organizationName" name="organizationName" :label="t('auth.signup.orgNameLabel')"
                    :placeholder="t('auth.signup.orgNamePlaceholder')" :errors="errors" />
                  <div class="flex gap-3">
                    <div class="flex-1">
                      <label class="mb-1 block text-sm font-medium text-fg">{{ t('auth.signup.orgTypeLabel') }}</label>
                      <select name="organizationType"
                        class="w-full rounded-(--radius-control) border border-bone bg-cream px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand/30">
                        <option value="">{{ t('common.selectPlaceholder') }}</option>
                        <option value="rental">{{ t('auth.signup.orgTypes.rental') }}</option>
                        <option value="school">{{ t('auth.signup.orgTypes.school') }}</option>
                        <option value="marina">{{ t('auth.signup.orgTypes.marina') }}</option>
                        <option value="private">{{ t('auth.signup.orgTypes.private') }}</option>
                      </select>
                    </div>
                    <div class="flex-1">
                      <label class="mb-1 block text-sm font-medium text-fg">{{ t('auth.signup.fleetSizeLabel')
                      }}</label>
                      <select name="fleetSize"
                        class="w-full rounded-(--radius-control) border border-bone bg-cream px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand/30">
                        <option value="">{{ t('common.selectPlaceholder') }}</option>
                        <option value="1-4">{{ t('auth.signup.fleetSizes.s1') }}</option>
                        <option value="5-20">{{ t('auth.signup.fleetSizes.s2') }}</option>
                        <option value="21-50">{{ t('auth.signup.fleetSizes.s3') }}</option>
                        <option value="51+">{{ t('auth.signup.fleetSizes.s4') }}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <BaseInput id="password" name="password" :type="passwordType" autocomplete="new-password"
                :label="t('auth.signup.passwordLabel')" placeholder="••••••••" :errors="errors">
                <template #trailing>
                  <button type="button"
                    class="inline-flex items-center text-sm font-semibold text-fg-muted hover:text-fg focus-visible:outline-none"
                    :aria-label="showPassword ? t('auth.signup.hidePassword') : t('auth.signup.showPassword')"
                    @click="showPassword = !showPassword">
                    {{ showPassword ? t('auth.signup.hidePassword') : t('auth.signup.showPassword') }}
                  </button>
                </template>
              </BaseInput>

              <BaseInput id="passwordConfirmation" name="passwordConfirmation" :type="passwordConfirmationType"
                autocomplete="new-password" :label="t('auth.signup.passwordConfirmLabel')" placeholder="••••••••"
                :errors="errors">
                <template #trailing>
                  <button type="button"
                    class="inline-flex items-center text-sm font-semibold text-fg-muted hover:text-fg focus-visible:outline-none"
                    :aria-label="showPasswordConfirmation ? t('auth.signup.hidePassword') : t('auth.signup.showPassword')"
                    @click="showPasswordConfirmation = !showPasswordConfirmation">
                    {{ showPasswordConfirmation ? t('auth.signup.hidePassword') : t('auth.signup.showPassword') }}
                  </button>
                </template>
              </BaseInput>

              <label class="flex cursor-pointer items-start gap-2 text-sm text-fg-muted">
                <input type="checkbox" name="acceptTerms" required class="mt-0.5 rounded border-bone" />
                <span>
                  {{ t('auth.signup.acceptTermsPrefix') }}
                  <a href="#" class="text-brand hover:underline">{{ t('auth.signup.cgu') }}</a>
                  {{ t('auth.signup.acceptTermsConjunction') }}
                  <a href="#" class="text-brand hover:underline">{{ t('auth.signup.privacyPolicy') }}</a>
                </span>
              </label>

              <BaseButton type="submit" size="lg" :disabled="processing" class="w-full">
                {{ t('auth.signup.createOrg') }}
              </BaseButton>
            </div>
          </Form>
        </div>

        <p class="mt-6 text-center text-sm text-fg-muted">
          {{ t('auth.signup.hasAccount') }}
          <a href="/login" class="font-semibold text-brand hover:underline">{{ t('auth.signup.signIn') }}</a>
        </p>
      </div>
    </div>
  </div>
</template>
