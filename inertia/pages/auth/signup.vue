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
import PasswordStrength from '~/components/auth/PasswordStrength.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/use_t'

const { t } = useT()

defineProps<{ fromSimulator?: boolean }>()

const showPassword = ref(false)
const passwordValue = ref('')
const passwordType = computed(() => (showPassword.value ? 'text' : 'password'))
</script>

<template>
  <Head :title="t('auth.signup.title')" />

  <div class="flex min-h-[calc(100vh-5rem)] overflow-hidden">
    <AuthNavyPanel mode="register" />

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
        <div class="w-full max-w-[460px]">
          <!-- Trial badge -->
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style="background: #e6f3ec; color: #1f6b54"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-[#1f6b54]" />
              {{ t('auth.signup.trialBadge') }}
            </span>
            <span class="text-[11px] text-fg-muted">{{ t('auth.signup.trialCaption') }}</span>
          </div>

          <h1
            class="mt-3.5 font-display text-[34px] leading-[1.05] text-fg"
            style="letter-spacing: -0.02em"
          >
            {{ t('auth.signup.titleNew') }}
          </h1>
          <p class="mt-1.5 text-sm text-fg-muted">
            {{ t('auth.signup.marketing.subtitle') }}
          </p>

          <div
            v-if="fromSimulator"
            class="mb-5 rounded-xl border border-coral-200 bg-coral-50 px-4 py-3 text-sm text-fg"
          >
            {{ t('auth.signup.fromSimulatorNotice') }}
          </div>

          <Form route="new_account.store" class="mt-6" #default="{ processing, errors }">
            <div class="flex flex-col gap-3.5">
              <!-- Section 01 — Toi -->
              <div class="flex items-center gap-3">
                <span class="font-mono text-[11px] text-fg-subtle">01</span>
                <div class="h-px flex-1 bg-bone" />
                <div class="text-right">
                  <div class="text-[13px] font-semibold text-fg">
                    {{ t('auth.signup.section01Title') }}
                  </div>
                  <div class="text-[11px] text-fg-muted">{{ t('auth.signup.section01Sub') }}</div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2.5">
                <BaseInput
                  id="firstName"
                  name="firstName"
                  :label="t('auth.signup.firstNameLabel')"
                  :placeholder="t('auth.signup.firstNamePlaceholder')"
                  autocomplete="given-name"
                  :errors="errors"
                />
                <BaseInput
                  id="lastName"
                  name="lastName"
                  :label="t('auth.signup.lastNameLabel')"
                  :placeholder="t('auth.signup.lastNamePlaceholder')"
                  autocomplete="family-name"
                  :errors="errors"
                />
              </div>

              <BaseInput
                id="email"
                name="email"
                type="email"
                autocomplete="email"
                :label="t('auth.signup.emailLabel')"
                :placeholder="t('auth.signup.emailPlaceholder')"
                :hint="t('auth.signup.emailHint')"
                :errors="errors"
              />

              <div>
                <BaseInput
                  id="password"
                  name="password"
                  :type="passwordType"
                  autocomplete="new-password"
                  :label="t('auth.signup.passwordLabel')"
                  :placeholder="t('auth.signup.passwordPlaceholder')"
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
                        showPassword ? t('auth.signup.hidePassword') : t('auth.signup.showPassword')
                      }}
                    </button>
                  </template>
                </BaseInput>
                <PasswordStrength :value="passwordValue" />
              </div>

              <!-- Section 02 — Organisation -->
              <div class="mt-2.5 flex items-center gap-3">
                <span class="font-mono text-[11px] text-fg-subtle">02</span>
                <div class="h-px flex-1 bg-bone" />
                <div class="text-right">
                  <div class="text-[13px] font-semibold text-fg">
                    {{ t('auth.signup.section02Title') }}
                  </div>
                  <div class="text-[11px] text-fg-muted">{{ t('auth.signup.section02Sub') }}</div>
                </div>
              </div>

              <BaseInput
                id="organizationName"
                name="organizationName"
                :label="t('auth.signup.orgNameLabel')"
                :placeholder="t('auth.signup.orgNamePlaceholder')"
                :hint="t('auth.signup.orgNameHint')"
                :errors="errors"
              />

              <div class="grid grid-cols-2 gap-2.5">
                <BaseSelect
                  id="organizationType"
                  name="organizationType"
                  :label="t('auth.signup.orgTypeLabel')"
                  :placeholder="t('common.selectPlaceholder')"
                  :options="[
                    { value: 'rental', label: t('auth.signup.orgTypes.rental') },
                    { value: 'school', label: t('auth.signup.orgTypes.school') },
                    { value: 'marina', label: t('auth.signup.orgTypes.marina') },
                    { value: 'private', label: t('auth.signup.orgTypes.private') },
                  ]"
                  allow-empty
                />
                <BaseSelect
                  id="fleetSize"
                  name="fleetSize"
                  :label="t('auth.signup.fleetSizeLabel')"
                  :placeholder="t('common.selectPlaceholder')"
                  :options="[
                    { value: '1-4', label: t('auth.signup.fleetSizes.s1') },
                    { value: '5-20', label: t('auth.signup.fleetSizes.s2') },
                    { value: '21-50', label: t('auth.signup.fleetSizes.s3') },
                    { value: '51+', label: t('auth.signup.fleetSizes.s4') },
                  ]"
                  allow-empty
                />
              </div>

              <!-- Terms -->
              <label class="flex cursor-pointer items-start gap-2.5 select-none">
                <input
                  type="checkbox"
                  name="acceptTerms"
                  required
                  class="mt-0.5 h-[18px] w-[18px] shrink-0 rounded-[5px] border-bone accent-[#0b1d2e]"
                />
                <span class="text-[13px] leading-relaxed text-fg-muted">
                  {{ t('auth.signup.acceptTermsPrefix') }}
                  <a href="#" class="font-semibold text-[#e2674f]">{{ t('auth.signup.cgu') }}</a>
                  {{ t('auth.signup.acceptTermsConjunction') }}
                  <a href="#" class="font-semibold text-[#e2674f]">{{
                    t('auth.signup.privacyPolicy')
                  }}</a
                  >.
                  {{ t('auth.signup.termsHosting') }}
                </span>
              </label>

              <!-- Submit (coral) -->
              <button
                type="submit"
                :disabled="processing"
                class="mt-1 flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3.5 text-sm font-semibold text-white transition-all duration-150 disabled:opacity-60 hover:brightness-110"
                style="background: #e2674f"
              >
                {{ t('auth.signup.createOrg') }}
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

              <!-- Feature checks -->
              <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-fg-muted">
                <span
                  v-for="key in ['featureCSV', 'featureUsers', 'featureNoCharge']"
                  :key="key"
                  class="inline-flex items-center gap-1.5"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#1f6b54"
                    stroke-width="2.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                  {{ t(`auth.signup.${key}`) }}
                </span>
              </div>
            </div>
          </Form>

          <p class="mt-6 text-center text-[13px] text-fg-muted">
            {{ t('auth.signup.hasAccount') }}
            <a
              href="/login"
              class="font-semibold text-[#e2674f] no-underline"
              style="border-bottom: 1px solid rgba(226, 103, 79, 0.3); padding-bottom: 1px"
            >
              {{ t('auth.signup.signIn') }} →
            </a>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
