<script lang="ts">
import AuthLayout from '~/layouts/auth.vue'

export default {
  layout: AuthLayout,
}
</script>

<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { Head } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import AuthNavyPanel from '~/components/auth/AuthNavyPanel.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useT } from '~/composables/use_t'

const { t } = useT()

const showPassword = ref(false)
const passwordValue = ref('')
const passwordType = computed(() => (showPassword.value ? 'text' : 'password'))
</script>

<template>
  <Head :title="t('auth.login.title')" />

  <div class="flex min-h-[calc(100vh-5rem)] overflow-hidden">
    <AuthNavyPanel mode="login" />

    <!-- Right panel -->
    <div class="flex flex-1 flex-col bg-cream">
      <!-- Top-right helper -->
      <div class="flex items-center justify-end gap-3.5 px-8 py-6">
        <span class="text-xs text-fg-muted">{{ t('auth.login.needHelp') }}</span>
        <BaseButton href="mailto:support@fleetai.io" variant="secondary" size="sm">
          {{ t('auth.login.contactSupport') }}
        </BaseButton>
      </div>

      <!-- Form, vertically centred -->
      <div class="flex flex-1 flex-col items-center justify-center px-8 pb-12 lg:px-16">
        <div class="w-full max-w-sm">
          <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-muted">
            {{ t('auth.login.eyebrow') }}
          </p>
          <h1
            class="mt-3.5 font-display text-[36px] leading-[1.05] text-fg"
            style="letter-spacing: -0.02em"
          >
            {{ t('auth.login.titleNew') }}
          </h1>
          <p class="mt-1.5 max-w-sm text-sm text-fg-muted">
            {{ t('auth.login.subtitleNew') }}
          </p>

          <Form route="session.store" class="mt-7" #default="{ processing, errors }">
            <div class="flex flex-col gap-3.5">
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
                :model-value="passwordValue"
                @update:model-value="passwordValue = $event"
              >
                <template #label-right>
                  <a
                    href="/forgot-password"
                    class="text-[12px] font-semibold text-[#e2674f] no-underline"
                    style="border-bottom: 1px solid rgba(226, 103, 79, 0.3); padding-bottom: 1px"
                  >
                    {{ t('auth.login.forgotPassword') }}
                  </a>
                </template>
                <template #trailing>
                  <button
                    type="button"
                    class="px-3 min-h-[44px] min-w-[44px] text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted focus-visible:outline-none"
                    @click="showPassword = !showPassword"
                  >
                    {{ showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword') }}
                  </button>
                </template>
              </BaseInput>

              <label class="flex cursor-pointer items-center gap-2.5 select-none">
                <input
                  type="checkbox"
                  name="remember"
                  class="h-[18px] w-[18px] rounded-[5px] border-bone accent-[#0b1d2e]"
                />
                <span class="text-[13px] text-fg-muted">{{ t('auth.login.rememberMe') }}</span>
              </label>

              <BaseButton
                type="submit"
                variant="primary"
                size="lg"
                :disabled="processing"
                class="mt-1 w-full"
              >
                {{ t('auth.login.submit') }}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </BaseButton>
            </div>
          </Form>

          <p class="mt-6 text-center text-[13px] text-fg-muted">
            {{ t('auth.login.noAccount') }}
            <a
              href="/signup"
              class="font-semibold text-[#e2674f] no-underline"
              style="border-bottom: 1px solid rgba(226, 103, 79, 0.3); padding-bottom: 1px"
            >
              {{ t('auth.login.createOrg') }} →
            </a>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
