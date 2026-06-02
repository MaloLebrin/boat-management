<script lang="ts">
import AuthLayout from '~/layouts/auth.vue'

export default {
  layout: AuthLayout,
}
</script>

<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { Head, usePage } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import BaseInput from '~/components/base/BaseInput.vue'
import AuthNavyPanel from '~/components/auth/AuthNavyPanel.vue'
import PasswordStrength from '~/components/auth/PasswordStrength.vue'
import { useT } from '~/composables/use_t'

const { t } = useT()
const page = usePage()

defineProps<{ token: string }>()

const showPassword = ref(false)
const showConfirm = ref(false)
const passwordValue = ref('')
const passwordType = computed(() => (showPassword.value ? 'text' : 'password'))
const confirmType = computed(() => (showConfirm.value ? 'text' : 'password'))
</script>

<template>
  <Head :title="t('auth.resetPassword.title')" />

  <div class="flex min-h-[calc(100vh-4rem)] overflow-hidden">
    <AuthNavyPanel mode="reset" />

    <!-- Right panel -->
    <div class="flex flex-1 flex-col bg-cream">
      <!-- Top-right helper -->
      <div class="flex items-center justify-end gap-3.5 px-8 py-6">
        <span class="text-xs text-fg-muted">{{ t('auth.login.needHelp') }}</span>
        <a
          href="mailto:support@fleetai.io"
          class="rounded-md border border-bone bg-white px-2.5 py-1.5 text-xs font-semibold text-fg transition-colors hover:bg-paper"
        >
          {{ t('auth.login.contactSupport') }}
        </a>
      </div>

      <!-- Form, vertically centred -->
      <div class="flex flex-1 flex-col items-center justify-center px-8 pb-12 lg:px-16">
        <div class="w-full max-w-sm">
          <!-- Back link -->
          <a
            href="/login"
            class="mb-4 inline-flex items-center gap-1.5 text-[12px] text-fg-muted no-underline transition-colors hover:text-fg"
          >
            ← {{ t('auth.resetPassword.backToLogin') }}
          </a>

          <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-muted">
            {{ t('auth.resetPassword.eyebrow') }}
          </p>
          <h1
            class="mt-3.5 font-display text-[36px] leading-[1.05] text-fg"
            style="letter-spacing: -0.02em"
          >
            {{ t('auth.resetPassword.title') }}
          </h1>
          <p class="mt-1.5 text-sm text-fg-muted">
            {{ t('auth.resetPassword.subtitle') }}
          </p>

          <div class="mt-7">
            <div
              v-if="page.props.flash?.error"
              class="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {{ page.props.flash.error }}
            </div>

            <Form method="POST" action="/reset-password" #default="{ processing, errors }">
              <input type="hidden" name="token" :value="token" />
              <div class="flex flex-col gap-3.5">
                <div>
                  <BaseInput
                    id="password"
                    name="password"
                    :type="passwordType"
                    autocomplete="new-password"
                    :label="t('auth.resetPassword.passwordLabel')"
                    placeholder="••••••••"
                    :errors="errors"
                    :model-value="passwordValue"
                    @update:model-value="passwordValue = $event"
                  >
                    <template #trailing>
                      <button
                        type="button"
                        class="px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted focus-visible:outline-none"
                        @click="showPassword = !showPassword"
                      >
                        {{
                          showPassword
                            ? t('auth.resetPassword.hidePassword')
                            : t('auth.resetPassword.showPassword')
                        }}
                      </button>
                    </template>
                  </BaseInput>
                  <PasswordStrength :value="passwordValue" />
                </div>

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
                      class="px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted focus-visible:outline-none"
                      @click="showConfirm = !showConfirm"
                    >
                      {{
                        showConfirm
                          ? t('auth.resetPassword.hidePassword')
                          : t('auth.resetPassword.showPassword')
                      }}
                    </button>
                  </template>
                </BaseInput>

                <button
                  type="submit"
                  :disabled="processing"
                  class="mt-1 flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3.5 text-sm font-semibold text-white transition-all duration-150 disabled:opacity-60 hover:brightness-110"
                  style="background: #0b1d2e"
                >
                  {{ t('auth.resetPassword.submit') }}
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
                </button>
              </div>
            </Form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
