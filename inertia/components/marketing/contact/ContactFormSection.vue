<script setup lang="ts">
import { computed, ref } from 'vue'
import { useForm, usePage } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import ContactFormSidebar from './ContactFormSidebar.vue'
import ContactPillGroup from './ContactPillGroup.vue'
import { useScrollReveal } from '~/composables/use_scroll_reveal'
import type { ContactSubject, ContactSubjectOption } from '../../../../shared/types/contact'

interface SidebarContact {
  icon: string
  label: string
  sub: string
  href: string
}

const props = defineProps<{
  anchorId: string
  action: string
  eyebrow: string
  title: string
  subjectLabel: string
  subjects: ContactSubjectOption[]
  fleetSizes: string[]
  firstNameLabel: string
  firstNamePlaceholder: string
  lastNameLabel: string
  lastNamePlaceholder: string
  emailLabel: string
  emailPlaceholder: string
  orgLabel: string
  orgPlaceholder: string
  fleetSizeLabel: string
  messageLabel: string
  messagePlaceholder: string
  privacyText: string
  privacyLinkLabel: string
  submitLabel: string
  sendingLabel: string
  successTitle: string
  successBody: string
  successNewLabel: string
  errorGeneric: string
  responseTime: string
  otherMeansTitle: string
  sidebarContacts: SidebarContact[]
  ctaTitle: string
  ctaSubtitle: string
  ctaButton: string
  sent: boolean
}>()

const page = usePage<{ locale?: 'en' | 'fr' }>()
const locale = computed<'en' | 'fr'>(() => (page.props.locale ?? 'en') as 'en' | 'fr')
const privacyHref = computed(() => (locale.value === 'fr' ? '/fr/confidentialite' : '/en/privacy'))

const { el, isVisible } = useScrollReveal()

const isSent = ref(props.sent)

const form = useForm({
  subject: (props.subjects[0]?.value ?? 'demo') as ContactSubject,
  firstName: '',
  lastName: '',
  email: '',
  organization: '',
  fleetSize: props.fleetSizes[1] ?? props.fleetSizes[0] ?? '',
  message: '',
  consent: true,
  locale: locale.value,
})

const hasErrors = computed(() => Object.keys(form.errors).length > 0)
const fleetSizeOptions = computed(() =>
  props.fleetSizes.map((size) => ({ value: size, label: size }))
)

const inputClass =
  'w-full rounded-xl border bg-cream px-4 py-3 text-sm text-fg outline-none transition-colors focus:border-navy-900'
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-widest text-fg-subtle'

function borderClass(error?: string) {
  return error ? 'border-danger' : 'border-bone'
}

function submit() {
  form.post(props.action, {
    preserveScroll: true,
    onSuccess: () => {
      isSent.value = true
      form.reset('firstName', 'lastName', 'email', 'organization', 'message')
    },
  })
}

function writeAnother() {
  isSent.value = false
  form.clearErrors()
}
</script>

<template>
  <section
    :id="anchorId"
    :ref="el"
    class="reveal scroll-mt-24 bg-paper px-6 py-20 lg:px-8"
    :class="{ visible: isVisible }"
  >
    <div class="mx-auto max-w-7xl">
      <div class="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        <!-- Form card -->
        <div class="rounded-2xl border border-bone bg-surface-elevated p-8 shadow-sm">
          <p class="font-mono text-xs font-semibold uppercase tracking-widest text-fg-subtle">
            {{ eyebrow }}
          </p>
          <h2 class="mt-2 font-display text-3xl leading-tight text-fg lg:text-4xl">{{ title }}</h2>

          <div v-if="isSent" class="mt-8 rounded-xl border border-mint-200 bg-mint-50 p-6">
            <p class="font-display text-2xl text-mint-700">{{ successTitle }}</p>
            <p class="mt-2 text-sm leading-relaxed text-mint-700">{{ successBody }}</p>
            <BaseButton variant="secondary" class="mt-5" @click="writeAnother">
              {{ successNewLabel }}
            </BaseButton>
          </div>

          <form v-else class="mt-8 space-y-5" @submit.prevent="submit">
            <!-- Subject pills -->
            <div>
              <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-fg-subtle">
                {{ subjectLabel }}
              </p>
              <ContactPillGroup
                :model-value="form.subject"
                :options="subjects"
                @update:model-value="form.subject = $event as ContactSubject"
              />
              <p v-if="form.errors.subject" class="mt-2 text-xs text-danger">
                {{ form.errors.subject }}
              </p>
            </div>

            <!-- Name row -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label :class="labelClass" for="contact-first-name">{{ firstNameLabel }}</label>
                <input
                  id="contact-first-name"
                  v-model="form.firstName"
                  type="text"
                  autocomplete="given-name"
                  :placeholder="firstNamePlaceholder"
                  :class="[inputClass, borderClass(form.errors.firstName)]"
                />
                <p v-if="form.errors.firstName" class="mt-1 text-xs text-danger">
                  {{ form.errors.firstName }}
                </p>
              </div>
              <div>
                <label :class="labelClass" for="contact-last-name">{{ lastNameLabel }}</label>
                <input
                  id="contact-last-name"
                  v-model="form.lastName"
                  type="text"
                  autocomplete="family-name"
                  :placeholder="lastNamePlaceholder"
                  :class="[inputClass, borderClass(form.errors.lastName)]"
                />
                <p v-if="form.errors.lastName" class="mt-1 text-xs text-danger">
                  {{ form.errors.lastName }}
                </p>
              </div>
            </div>

            <!-- Email -->
            <div>
              <label :class="labelClass" for="contact-email">{{ emailLabel }}</label>
              <input
                id="contact-email"
                v-model="form.email"
                type="email"
                autocomplete="email"
                :placeholder="emailPlaceholder"
                :class="[inputClass, borderClass(form.errors.email)]"
              />
              <p v-if="form.errors.email" class="mt-1 text-xs text-danger">
                {{ form.errors.email }}
              </p>
            </div>

            <!-- Org + Fleet size -->
            <div class="grid grid-cols-[1.5fr_1fr] gap-4">
              <div>
                <label :class="labelClass" for="contact-org">{{ orgLabel }}</label>
                <input
                  id="contact-org"
                  v-model="form.organization"
                  type="text"
                  autocomplete="organization"
                  :placeholder="orgPlaceholder"
                  :class="[inputClass, borderClass(form.errors.organization)]"
                />
              </div>
              <div>
                <p :class="labelClass">{{ fleetSizeLabel }}</p>
                <ContactPillGroup
                  v-model="form.fleetSize"
                  layout="row"
                  :options="fleetSizeOptions"
                />
              </div>
            </div>

            <!-- Message -->
            <div>
              <label :class="labelClass" for="contact-message">{{ messageLabel }}</label>
              <textarea
                id="contact-message"
                v-model="form.message"
                :placeholder="messagePlaceholder"
                rows="5"
                :class="['resize-y', inputClass, borderClass(form.errors.message)]"
              />
              <p v-if="form.errors.message" class="mt-1 text-xs text-danger">
                {{ form.errors.message }}
              </p>
            </div>

            <!-- Privacy -->
            <div>
              <label class="flex items-start gap-3 text-xs leading-relaxed text-fg-subtle">
                <input v-model="form.consent" type="checkbox" class="mt-0.5 accent-navy-900" />
                <span>
                  {{ privacyText }}
                  <!-- `<a>` légitime : page publique servie hors bundle Inertia -->
                  <a :href="privacyHref" class="text-fg underline">{{ privacyLinkLabel }}</a
                  >.
                </span>
              </label>
              <p v-if="form.errors.consent" class="mt-1 text-xs text-danger">
                {{ form.errors.consent }}
              </p>
            </div>

            <p v-if="hasErrors" class="text-sm text-danger">{{ errorGeneric }}</p>

            <BaseButton type="submit" class="w-full justify-center" :disabled="form.processing">
              {{ form.processing ? sendingLabel : submitLabel }}
            </BaseButton>
            <p class="text-center text-xs text-fg-subtle">{{ responseTime }}</p>
          </form>
        </div>

        <ContactFormSidebar
          :other-means-title="otherMeansTitle"
          :sidebar-contacts="sidebarContacts"
          :cta-title="ctaTitle"
          :cta-subtitle="ctaSubtitle"
          :cta-button="ctaButton"
        />
      </div>
    </div>
  </section>
</template>
