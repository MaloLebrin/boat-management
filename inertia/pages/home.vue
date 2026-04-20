<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
</script>

<template>
  <Head title="Homepage" />

  <div class="px-8 py-14">
    <div class="max-w-3xl">
      <h1 class="text-balance text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
        It works — welcome to the power of a full-stack Vue app
      </h1>
      <p class="mt-4 text-pretty text-lg text-zinc-600 sm:text-xl">
        Powered by Inertia and Vue, this setup blends server-driven routing with rich client-side
        interactivity — seamless, fast, and cohesive.
      </p>
    </div>
  </div>

  <div class="grid gap-0 border-t border-zinc-200 md:grid-cols-3">
    <a
      class="group border-zinc-200 p-8 transition hover:bg-zinc-50 md:border-r"
      href="https://insiders.adonisjs.com/docs/v7-alpha/introduction"
      target="_blank"
      rel="noreferrer"
    >
      <h3 class="text-lg font-semibold text-zinc-900">
        Official Docs <span class="ml-1 inline-block transition group-hover:translate-x-0.5">›</span>
      </h3>
      <p class="mt-2 text-sm text-zinc-600">Comprehensive reference for building with AdonisJS</p>
    </a>

    <a
      class="group border-zinc-200 p-8 transition hover:bg-zinc-50 md:border-r"
      href="https://adocasts.com/"
      target="_blank"
      rel="noreferrer"
    >
      <h3 class="text-lg font-semibold text-zinc-900">
        Adocasts <span class="ml-1 inline-block transition group-hover:translate-x-0.5">›</span>
      </h3>
      <p class="mt-2 text-sm text-zinc-600">Guided video tutorials for everyday development</p>
    </a>

    <a
      class="group p-8 transition hover:bg-zinc-50"
      href="https://discord.gg/vDcEjq6"
      target="_blank"
      rel="noreferrer"
    >
      <h3 class="text-lg font-semibold text-zinc-900">
        Discord <span class="ml-1 inline-block transition group-hover:translate-x-0.5">›</span>
      </h3>
      <p class="mt-2 text-sm text-zinc-600">Connect with developers building with AdonisJS every day</p>
    </a>
  </div>
</template>
