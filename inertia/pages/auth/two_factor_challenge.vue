<script lang="ts">
import AuthLayout from '~/layouts/auth.vue'

export default {
  layout: AuthLayout,
}
</script>

<script setup lang="ts">
import { Form, Link } from '@adonisjs/inertia/vue'
import { Head } from '@inertiajs/vue3'
import AuthNavyPanel from '~/components/auth/AuthNavyPanel.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useT } from '~/composables/use_t'

/**
 * Second facteur à la connexion (#884) : code de l'appli d'authentification ou
 * code de secours, dans le même champ — le serveur reconnaît le format.
 */
const { t } = useT()
</script>

<template>
  <Head :title="t('auth.twoFactor.challenge.title')" />

  <div class="flex min-h-[calc(100vh-5rem)] overflow-hidden">
    <AuthNavyPanel mode="login" />

    <div class="flex flex-1 flex-col bg-cream">
      <div class="flex flex-1 flex-col items-center justify-center px-8 py-12 lg:px-16">
        <div class="w-full max-w-sm">
          <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-muted">
            {{ t('auth.twoFactor.challenge.eyebrow') }}
          </p>
          <h1
            class="mt-3.5 font-display text-[36px] leading-[1.05] text-fg"
            style="letter-spacing: -0.02em"
          >
            {{ t('auth.twoFactor.challenge.title') }}
          </h1>
          <p class="mt-1.5 text-sm text-fg-muted">{{ t('auth.twoFactor.challenge.subtitle') }}</p>

          <Form
            route="login.two_factor.store"
            class="mt-7"
            reset-on-error
            #default="{ processing, errors }"
          >
            <div class="flex flex-col gap-3.5">
              <BaseInput
                id="code"
                name="code"
                autocomplete="one-time-code"
                :label="t('auth.twoFactor.challenge.codeLabel')"
                :hint="t('auth.twoFactor.challenge.codeHint')"
                :errors="errors"
              />
              <BaseButton
                type="submit"
                variant="primary"
                size="lg"
                :disabled="processing"
                class="mt-1 w-full"
              >
                {{ t('auth.twoFactor.challenge.submit') }}
              </BaseButton>
            </div>
          </Form>

          <p class="mt-6 text-center text-[13px] text-fg-muted">
            <Link href="/login" class="font-semibold text-brand no-underline">
              {{ t('auth.twoFactor.challenge.back') }}
            </Link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
