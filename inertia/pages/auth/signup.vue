<script lang="ts">
import AuthLayout from '~/layouts/auth.vue'

export default {
  layout: AuthLayout,
}
</script>

<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { Form } from '@adonisjs/inertia/vue'
import { Head } from '@inertiajs/vue3'
import { PLAN_LIMITS } from '#shared/types/plan'
import AuthNavyPanel from '~/components/auth/AuthNavyPanel.vue'
import SignupIdentityFields from '~/components/auth/signup/SignupIdentityFields.vue'
import SignupOrganizationFields from '~/components/auth/signup/SignupOrganizationFields.vue'
import SignupTermsCheckbox from '~/components/auth/signup/SignupTermsCheckbox.vue'
import BaseFormErrorSummary from '~/components/base/BaseFormErrorSummary.vue'
import { useT } from '~/composables/use_t'

const { t } = useT()

defineProps<{ fromSimulator?: boolean; fromDiagnostic?: boolean; fromPartsAi?: boolean }>()

/**
 * Every field of this form is rendered by one of the sections below and shows
 * its own error. Anything else the validator rejects is surfaced by
 * `<BaseFormErrorSummary>` — without it, a validator/form mismatch makes the
 * signup fail silently (#448).
 */
const RENDERED_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'password',
  'organizationName',
  'organizationType',
  'fleetSize',
  'acceptTerms',
] as const

/**
 * Ce que le plan Starter offre réellement, lu dans `PLAN_LIMITS` (#455) : la
 * page promettait « utilisateurs illimités » (Starter en autorise 1) et
 * « aucun prélèvement avant J+14 » alors qu'il n'existe aucune période d'essai.
 */
const STARTER_FEATURES = [
  { key: 'featureCSV', vars: undefined },
  { key: 'featureBoats', vars: { count: PLAN_LIMITS.starter.maxBoats ?? 0 } },
  { key: 'featureUsers', vars: { count: PLAN_LIMITS.starter.maxMembers ?? 0 } },
] as const
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
          href="mailto:support@fleetai.app"
          class="rounded-md border border-bone bg-surface-elevated px-2.5 py-1.5 text-xs font-semibold text-fg transition-colors hover:bg-paper"
        >
          {{ t('auth.login.contactSupport') }}
        </a>
      </div>

      <!-- Form, vertically centred -->
      <div class="flex flex-1 flex-col items-center justify-center px-8 pb-12 lg:px-16">
        <div class="w-full max-w-[460px]">
          <!-- Free plan badge -->
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-mint-50 text-mint-700"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-mint-700" />
              {{ t('auth.signup.freePlanBadge') }}
            </span>
            <span class="text-[11px] text-fg-muted">{{ t('auth.signup.freePlanCaption') }}</span>
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

          <div
            v-if="fromDiagnostic"
            class="mb-5 rounded-xl border border-coral-200 bg-coral-50 px-4 py-3 text-sm text-fg"
          >
            {{ t('auth.signup.fromDiagnosticNotice') }}
          </div>

          <div
            v-if="fromPartsAi"
            class="mb-5 rounded-xl border border-coral-200 bg-coral-50 px-4 py-3 text-sm text-fg"
          >
            {{ t('auth.signup.fromPartsAiNotice') }}
          </div>

          <Form route="new_account.store" class="mt-6" #default="{ processing, errors }">
            <div class="flex flex-col gap-3.5">
              <BaseFormErrorSummary
                :errors="errors"
                :handled-keys="RENDERED_FIELDS"
                :title="t('auth.signup.errorSummaryTitle')"
              />

              <SignupIdentityFields :errors="errors" />

              <SignupOrganizationFields :errors="errors" />

              <SignupTermsCheckbox :errors="errors" />

              <!-- Submit (coral) -->
              <button
                type="submit"
                :disabled="processing"
                class="mt-1 flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3.5 text-sm font-semibold text-white transition-all duration-150 disabled:opacity-60 hover:brightness-110 bg-coral-500"
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
                  v-for="feature in STARTER_FEATURES"
                  :key="feature.key"
                  class="inline-flex items-center gap-1.5"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-mint-700)"
                    stroke-width="2.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                  {{ t(`auth.signup.${feature.key}`, feature.vars) }}
                </span>
              </div>
            </div>
          </Form>

          <p class="mt-6 text-center text-[13px] text-fg-muted">
            {{ t('auth.signup.hasAccount') }}
            <Link
              href="/login"
              class="font-semibold text-coral-500 no-underline"
              style="border-bottom: 1px solid rgba(226, 103, 79, 0.3); padding-bottom: 1px"
            >
              {{ t('auth.signup.signIn') }} →
            </Link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
