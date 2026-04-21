<script lang="ts">
import PublicLayout from '~/layouts/public.vue'

export default {
  layout: PublicLayout,
}
</script>

<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
</script>

<template>
  <Head title="Homepage" />

  <div class="px-6 py-14 sm:px-8">
    <div class="max-w-3xl">
      <BaseHeading level="display">
        It works — welcome to the power of a full-stack Vue app
      </BaseHeading>
      <p class="mt-4 text-pretty text-lg text-fg-muted sm:text-xl">
        Powered by Inertia and Vue, this setup blends server-driven routing with rich client-side
        interactivity — seamless, fast, and cohesive.
      </p>
    </div>
  </div>

  <div class="grid gap-4 border-t border-border px-6 py-10 sm:px-8 md:grid-cols-3">
    <a href="https://insiders.adonisjs.com/docs/v7-alpha/introduction" target="_blank" rel="noreferrer">
      <BaseCard padded class="h-full transition-colors hover:bg-surface-muted">
        <p class="text-lg font-semibold text-fg">
          Official Docs <span class="ml-1 inline-block transition group-hover:translate-x-0.5">›</span>
        </p>
        <p class="mt-2 text-sm text-fg-muted">Comprehensive reference for building with AdonisJS</p>
      </BaseCard>
    </a>

    <a href="https://adocasts.com/" target="_blank" rel="noreferrer">
      <BaseCard padded class="h-full transition-colors hover:bg-surface-muted">
        <p class="text-lg font-semibold text-fg">
          Adocasts <span class="ml-1 inline-block transition group-hover:translate-x-0.5">›</span>
        </p>
        <p class="mt-2 text-sm text-fg-muted">Guided video tutorials for everyday development</p>
      </BaseCard>
    </a>

    <a href="https://discord.gg/vDcEjq6" target="_blank" rel="noreferrer">
      <BaseCard padded class="h-full transition-colors hover:bg-surface-muted">
        <p class="text-lg font-semibold text-fg">
          Discord <span class="ml-1 inline-block transition group-hover:translate-x-0.5">›</span>
        </p>
        <p class="mt-2 text-sm text-fg-muted">Connect with developers building with AdonisJS every day</p>
      </BaseCard>
    </a>
  </div>
</template>
