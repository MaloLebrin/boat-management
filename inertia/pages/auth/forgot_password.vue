<script lang="ts">
import AuthLayout from '~/layouts/auth.vue'

export default {
  layout: AuthLayout,
}
</script>

<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { Head, usePage } from '@inertiajs/vue3'
import AuthNavyPanel from '~/components/auth/AuthNavyPanel.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useT } from '~/composables/useT'

const { t } = useT()
const page = usePage()
</script>

<template>
  <Head :title="t('auth.forgotPassword.title')" />

  <div class="flex min-h-[calc(100vh-5rem)] overflow-hidden">

    <AuthNavyPanel mode="forgot" />

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
            ← {{ t('auth.forgotPassword.backToLogin') }}
          </a>

          <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-muted">
            {{ t('auth.forgotPassword.eyebrow') }}
          </p>
          <h1 class="mt-3.5 font-display text-[36px] leading-[1.05] text-fg" style="letter-spacing:-0.02em">
            {{ t('auth.forgotPassword.titleNew') }}
          </h1>
          <p class="mt-1.5 text-sm text-fg-muted">
            {{ t('auth.forgotPassword.subtitleNew') }}
          </p>

          <div class="mt-7 flex flex-col gap-3.5">

            <!-- Flash messages -->
            <div
              v-if="page.props.flash?.success"
              class="flex flex-col gap-2 rounded-[10px] border p-4"
              style="background:#e6f3ec; border-color:#cfe8de"
            >
              <div class="flex items-center gap-2.5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1f6b54" stroke-width="2.2"
                  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M5 12l5 5L20 7" />
                </svg>
                <strong class="text-sm text-[#1f6b54]">{{ t('auth.forgotPassword.successTitle') }}</strong>
              </div>
              <p class="text-[13px] leading-relaxed text-[#1f6b54]">
                {{ t('auth.forgotPassword.successContent') }}
              </p>
              <a href="/login" class="mt-1 text-[12px] font-semibold text-[#1f6b54]">
                {{ t('auth.forgotPassword.resend') }}
              </a>
            </div>

            <div
              v-else-if="page.props.flash?.error"
              class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {{ page.props.flash.error }}
            </div>

            <template v-if="!page.props.flash?.success">
              <Form route="password.forgot" #default="{ processing, errors }">
                <div class="flex flex-col gap-3.5">
                  <BaseInput
                    id="email"
                    name="email"
                    type="email"
                    autocomplete="username"
                    :label="t('auth.forgotPassword.emailLabel')"
                    :placeholder="t('auth.forgotPassword.emailPlaceholder')"
                    :hint="t('auth.forgotPassword.emailHint')"
                    :errors="errors"
                  />

                  <button
                    type="submit"
                    :disabled="processing"
                    class="flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3.5 text-sm font-semibold text-white transition-all duration-150 disabled:opacity-60 hover:brightness-110"
                    style="background:#0b1d2e"
                  >
                    {{ t('auth.forgotPassword.submit') }}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </button>
                </div>
              </Form>
            </template>

            <!-- Spam warning -->
            <div
              class="flex gap-2.5 rounded-lg p-3.5"
              style="background: rgba(11,29,46,0.04); border: 1px solid #ebe2d0"
            >
              <svg class="mt-0.5 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="#b87b1d" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0zM12 9v4M12 17h.01" />
              </svg>
              <p class="text-[12px] leading-relaxed text-fg-muted">
                {{ t('auth.forgotPassword.spamWarning') }}
              </p>
            </div>

          </div>

        </div>
      </div>
    </div>
  </div>
</template>
