<script lang="ts">
import DefaultLayout from '~/layouts/default.vue'
export default { layout: DefaultLayout }
</script>

<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { Form } from '@adonisjs/inertia/vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { useT } from '~/composables/use_t'

defineProps<{
  email: string
  isVerified: boolean
}>()

const { t } = useT()
</script>

<template>
  <Head :title="t('auth.verifyEmail.title')" />

  <div class="mx-auto w-full max-w-2xl px-4 py-8">
    <BaseCard>
      <BaseHeading :level="'1'" size="lg">{{ t('auth.verifyEmail.title') }}</BaseHeading>

      <template v-if="isVerified">
        <p class="mt-3 text-sm text-fg-muted">
          {{ t('auth.verifyEmail.alreadyVerified', { email }) }}
        </p>
      </template>

      <template v-else>
        <p class="mt-3 text-sm text-fg-muted">
          {{ t('auth.verifyEmail.intro', { email }) }}
        </p>
        <p class="mt-2 text-sm text-fg-muted">
          {{ t('auth.verifyEmail.gatedActions') }}
        </p>

        <!--
          Mutation Inertia : `<Form>` + redirection côté contrôleur, jamais un
          `fetch` avec CSRF à la main.
        -->
        <Form route="email_verification.resend" #default="{ processing }" class="mt-5">
          <button
            type="submit"
            :disabled="processing"
            class="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand transition-all duration-150 hover:brightness-110 disabled:opacity-60"
          >
            {{ t('auth.verifyEmail.resend') }}
          </button>
        </Form>

        <p class="mt-4 text-xs text-fg-subtle">
          {{ t('auth.verifyEmail.spamHint') }}
        </p>
      </template>
    </BaseCard>
  </div>
</template>
