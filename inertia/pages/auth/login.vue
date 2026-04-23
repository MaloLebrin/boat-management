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
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useT } from '~/composables/useT'

const { t } = useT()

const showPassword = ref(false)
const passwordType = computed(() => (showPassword.value ? 'text' : 'password'))
</script>

<template>
  <div
    class="mx-auto flex min-h-[calc(100vh-16rem)] w-full max-w-md flex-col justify-center px-6 py-14 sm:px-8"
  >
    <div class="space-y-2">
      <BaseHeading level="1">{{ t('auth.login.title') }}</BaseHeading>
      <p class="text-pretty text-base text-fg-muted">
        {{ t('auth.login.subtitle') }}
      </p>
    </div>

    <div class="mt-10">
      <Form route="session.store" #default="{ processing, errors }">
        <div class="space-y-6">
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
          >
            <template #trailing>
              <button
                type="button"
                class="inline-flex items-center text-sm font-semibold text-fg-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                :aria-label="showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')"
                :aria-pressed="showPassword ? 'true' : 'false'"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword') }}
              </button>
            </template>
          </BaseInput>

          <div class="pt-1">
            <BaseButton type="submit" size="lg" :disabled="processing" class="w-full">
              {{ t('auth.login.submit') }}
            </BaseButton>
          </div>
        </div>
      </Form>
    </div>
  </div>
</template>
