<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
</script>

<template>
  <div class="mx-auto flex min-h-[calc(100vh-16rem)] w-full max-w-md flex-col justify-center px-8 py-14">
    <div>
      <h1 class="text-3xl font-semibold tracking-tight text-zinc-900">Login</h1>
      <p class="mt-2 text-base text-zinc-600">Enter your details below to login to your account</p>
    </div>

    <div class="mt-10">
      <Form route="session.store" #default="{ processing, errors }">
        <div class="space-y-6">
          <div>
            <label for="email" class="mb-1 block text-sm font-medium text-zinc-800">Email</label>
            <input
              type="email"
              name="email"
              id="email"
              autocomplete="username"
              :data-invalid="errors.email ? 'true' : undefined"
              class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 data-[invalid=true]:border-red-500"
            />
            <p v-if="errors.email" class="mt-2 text-sm font-medium text-red-600">
              {{ errors.email }}
            </p>
          </div>

          <div>
            <label for="password" class="mb-1 block text-sm font-medium text-zinc-800">
              Password
            </label>
            <input
              type="password"
              name="password"
              id="password"
              autocomplete="current-password"
              :data-invalid="errors.password ? 'true' : undefined"
              class="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 data-[invalid=true]:border-red-500"
            />
            <p v-if="errors.password" class="mt-2 text-sm font-medium text-red-600">
              {{ errors.password }}
            </p>
          </div>

          <div>
            <button
              type="submit"
              :disabled="processing"
              class="inline-flex h-10 w-full items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Login
            </button>
          </div>
        </div>
      </Form>
    </div>
  </div>
</template>
