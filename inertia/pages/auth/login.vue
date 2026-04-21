<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { computed, ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseInput from '~/components/base/BaseInput.vue'

const showPassword = ref(false)
const passwordType = computed(() => (showPassword.value ? 'text' : 'password'))
</script>

<template>
  <div
    class="mx-auto flex min-h-[calc(100vh-16rem)] w-full max-w-md flex-col justify-center px-6 py-14 sm:px-8"
  >
    <div class="space-y-2">
      <BaseHeading level="1">Login</BaseHeading>
      <p class="text-pretty text-base text-fg-muted">
        Enter your details below to login to your account.
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
            label="Email"
            placeholder="you@company.com"
            :errors="errors"
          />

          <BaseInput
            id="password"
            name="password"
            :type="passwordType"
            autocomplete="current-password"
            label="Password"
            placeholder="••••••••"
            :errors="errors"
          >
            <template #trailing>
              <button
                type="button"
                class="inline-flex items-center text-sm font-semibold text-fg-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                :aria-pressed="showPassword ? 'true' : 'false'"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? 'Hide' : 'Show' }}
              </button>
            </template>
          </BaseInput>

          <div class="pt-1">
            <BaseButton type="submit" size="lg" :disabled="processing" class="w-full">
              Login
            </BaseButton>
          </div>
        </div>
      </Form>
    </div>
  </div>
</template>
