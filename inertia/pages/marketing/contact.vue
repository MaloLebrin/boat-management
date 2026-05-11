<script lang="ts">
import PublicLayout from '~/layouts/public.vue'
export default { layout: PublicLayout }
</script>

<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { ref } from 'vue'
import { useT } from '~/composables/useT'

type PageProps = {
  t: {
    meta: { title: string; description: string }
    contact: {
      hero: { title: string; subtitle: string }
      form: {
        firstName: string; lastName: string; email: string
        organization: string; fleetSize: string; subject: string
        subjects: string[]; message: string; messagePlaceholder: string; submit: string
      }
      info: {
        phone: { label: string; number: string; hours: string }
        email: { label: string; value: string }
        address: { label: string; value: string }
        cta: { title: string; text: string; button: string }
      }
    }
  }
}

const props = defineProps<PageProps>()
const t = props.t
const { t: tApp } = useT()
const selectedSubject = ref<string | null>(null)
</script>

<template>
  <Head :title="t.meta.title">
    <meta name="description" :content="t.meta.description" />
    <meta property="og:title" :content="t.meta.title" />
  </Head>

  <div class="mx-auto max-w-7xl">
    <!-- Hero -->
    <div class="py-12">
      <p class="text-xs font-semibold uppercase tracking-widest text-fg-subtle">Contact</p>
      <h1 class="mt-3 font-display text-3xl italic text-fg">{{ t.contact.hero.title }}</h1>
      <p class="mt-2 text-sm text-fg-muted">{{ t.contact.hero.subtitle }}</p>
    </div>

    <!-- Split layout -->
    <div class="grid gap-12 pb-16 lg:grid-cols-[1fr_280px]">
      <!-- Form -->
      <form class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-fg">{{ t.contact.form.firstName }}</label>
            <input type="text" name="firstName" class="w-full rounded-(--radius-control) border border-bone bg-cream px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand/30" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-fg">{{ t.contact.form.lastName }}</label>
            <input type="text" name="lastName" class="w-full rounded-(--radius-control) border border-bone bg-cream px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand/30" />
          </div>
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-fg">{{ t.contact.form.email }}</label>
          <input type="email" name="email" class="w-full rounded-(--radius-control) border border-bone bg-cream px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand/30" />
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-fg">{{ t.contact.form.organization }}</label>
            <input type="text" name="organization" class="w-full rounded-(--radius-control) border border-bone bg-cream px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand/30" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-fg">{{ t.contact.form.fleetSize }}</label>
            <select name="fleetSize" class="w-full rounded-(--radius-control) border border-bone bg-cream px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand/30">
              <option value="">{{ tApp('common.selectPlaceholder') }}</option>
              <option>1-4</option><option>5-20</option><option>21-50</option><option>51+</option>
            </select>
          </div>
        </div>
        <div>
          <p class="mb-2 text-sm font-medium text-fg">{{ t.contact.form.subject }}</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="s in t.contact.form.subjects" :key="s"
              type="button"
              @click="selectedSubject = s"
              :class="['rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                selectedSubject === s
                  ? 'border-brand bg-brand text-white'
                  : 'border-bone bg-paper text-fg-muted hover:bg-bone']"
            >{{ s }}</button>
          </div>
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-fg">{{ t.contact.form.message }}</label>
          <textarea name="message" rows="5" :placeholder="t.contact.form.messagePlaceholder"
            class="w-full rounded-(--radius-control) border border-bone bg-cream px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand/30"></textarea>
        </div>
        <button type="submit"
          class="rounded-(--radius-control) bg-navy-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-800">
          {{ t.contact.form.submit }}
        </button>
      </form>

      <!-- Sidebar -->
      <div class="space-y-4">
        <div class="rounded-xl border border-bone bg-paper p-4">
          <p class="font-semibold text-sm text-fg">📞 {{ t.contact.info.phone.label }}</p>
          <p class="mt-1 text-sm text-fg">{{ t.contact.info.phone.number }}</p>
          <p class="text-xs text-fg-subtle">{{ t.contact.info.phone.hours }}</p>
        </div>
        <div class="rounded-xl border border-bone bg-paper p-4">
          <p class="font-semibold text-sm text-fg">✉ {{ t.contact.info.email.label }}</p>
          <p class="mt-1 text-sm text-fg">{{ t.contact.info.email.value }}</p>
        </div>
        <div class="rounded-xl border border-bone bg-paper p-4">
          <p class="font-semibold text-sm text-fg">📍 {{ t.contact.info.address.label }}</p>
          <p class="mt-1 text-sm leading-relaxed text-fg-muted whitespace-pre-line">{{ t.contact.info.address.value }}</p>
        </div>
        <div class="rounded-xl border border-bone bg-cream/60 p-4">
          <p class="font-semibold text-sm text-fg">{{ t.contact.info.cta.title }}</p>
          <p class="mt-1 text-xs text-fg-muted">{{ t.contact.info.cta.text }}</p>
          <a href="/signup" class="mt-3 inline-block rounded-(--radius-control) border border-bone bg-paper px-3 py-1.5 text-xs font-medium text-fg hover:bg-bone transition-colors">
            {{ t.contact.info.cta.button }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
