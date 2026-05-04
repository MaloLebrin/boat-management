<script setup lang="ts">
import { ref } from 'vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useT } from '~/composables/useT'

const { t } = useT()

const props = defineProps<{
  user: {
    id: number
    email: string
    fullName: string | null
  }
}>()

type SettingsSection = 'org' | 'members' | 'billing' | 'me'

const activeSection = ref<SettingsSection>('me')

const sections: { key: SettingsSection; label: string }[] = [
  { key: 'org', label: 'Profil organisation' },
  { key: 'members', label: 'Membres et acces' },
  { key: 'billing', label: 'Facturation et plan' },
  { key: 'me', label: 'Mon profil' },
]

const localFullName = ref(props.user.fullName ?? '')

// TODO: implement PUT /settings/profile to save fullName — wire the "Enregistrer les modifications" button to a Form submit
// TODO: implement org profile (org name, logo) — requires an Organisation model and PUT /settings/org endpoint
// TODO: implement member invitation — requires sending an invite email and a pending-member flow
// TODO: implement billing — integrate Stripe or another payment provider for plan upgrades
</script>

<template>
  <div class="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-6xl px-6 py-10 sm:px-8">
    <div class="flex w-full gap-8">
      <!-- Left sidebar navigation -->
      <nav class="w-56 shrink-0">
        <BaseHeading level="2" class="mb-6">{{ t('settings.title') || 'Parametres' }}</BaseHeading>
        <ul class="space-y-1">
          <li v-for="section in sections" :key="section.key">
            <button
              type="button"
              :class="[
                'w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
                activeSection === section.key
                  ? 'bg-brand/10 text-brand'
                  : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
              ]"
              @click="activeSection = section.key"
            >
              {{ section.label }}
            </button>
          </li>
        </ul>
      </nav>

      <!-- Main content area -->
      <div class="flex-1">
        <!-- Organisation Profile Section -->
        <div v-if="activeSection === 'org'">
          <BaseHeading level="2" class="mb-6">Profil organisation</BaseHeading>
          <BaseCard>
            <div class="space-y-6">
              <div>
                <label class="block text-sm font-medium text-fg mb-2">Nom de l'organisation</label>
                <BaseInput
                  placeholder="Mon organisation"
                  disabled
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-fg mb-2">Logo</label>
                <div class="flex items-center gap-4">
                  <div class="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border bg-surface-muted">
                    <span class="text-fg-muted text-xs">Logo</span>
                  </div>
                  <!-- TODO: implement logo upload — POST /settings/org/logo, store in S3/local, display preview -->
                  <BaseButton variant="secondary" size="sm" disabled>
                    Changer le logo
                  </BaseButton>
                </div>
              </div>
            </div>
            <template #footer>
              <div class="flex justify-end">
                <!-- TODO: wire to PUT /settings/org once Organisation model exists -->
                <BaseButton variant="primary" disabled>
                  Enregistrer
                </BaseButton>
              </div>
            </template>
          </BaseCard>
        </div>

        <!-- Members Section -->
        <div v-if="activeSection === 'members'">
          <div class="mb-6 flex items-center justify-between">
            <BaseHeading level="2">Membres et acces</BaseHeading>
            <!-- TODO: open an invite modal that POSTs email to /settings/members/invite and sends an invitation email -->
            <BaseButton variant="primary" size="sm" disabled>
              Inviter un membre
            </BaseButton>
          </div>
          <BaseCard :padded="false">
            <table class="w-full">
              <thead>
                <tr class="border-b border-border">
                  <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-fg-muted">
                    Membre
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-fg-muted">
                    Role
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-fg-muted">
                    Statut
                  </th>
                  <th class="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-b border-border last:border-b-0">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white text-sm font-medium">
                        {{ user.fullName?.charAt(0)?.toUpperCase() ?? user.email.charAt(0).toUpperCase() }}
                      </div>
                      <div>
                        <p class="text-sm font-medium text-fg">{{ user.fullName ?? 'Sans nom' }}</p>
                        <p class="text-xs text-fg-muted">{{ user.email }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <span class="inline-flex items-center rounded-full bg-brand/10 px-2 py-1 text-xs font-medium text-brand">
                      Admin
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <span class="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                      Actif
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <span class="text-xs text-fg-muted">Vous</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </BaseCard>
        </div>

        <!-- Billing Section -->
        <div v-if="activeSection === 'billing'">
          <BaseHeading level="2" class="mb-6">Facturation et plan</BaseHeading>
          <div class="space-y-6">
            <BaseCard>
              <template #header>
                <div class="flex items-center justify-between">
                  <span class="text-sm font-semibold text-fg">Plan actuel</span>
                  <span class="inline-flex items-center rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-brand">
                    Gratuit
                  </span>
                </div>
              </template>
              <div class="space-y-4">
                <p class="text-sm text-fg-muted">
                  Vous utilisez actuellement le plan gratuit avec des fonctionnalites limitees.
                </p>
                <ul class="space-y-2 text-sm text-fg-muted">
                  <li class="flex items-center gap-2">
                    <span class="text-green-600">&#10003;</span>
                    Jusqu'a 3 bateaux
                  </li>
                  <li class="flex items-center gap-2">
                    <span class="text-green-600">&#10003;</span>
                    Historique de maintenance
                  </li>
                  <li class="flex items-center gap-2">
                    <span class="text-fg-muted">&#10007;</span>
                    Suggestions IA
                  </li>
                </ul>
              </div>
              <template #footer>
                <!-- TODO: integrate Stripe Checkout — redirect to a Stripe session URL returned by POST /billing/checkout -->
                <BaseButton variant="primary" disabled>
                  Passer au plan Pro
                </BaseButton>
              </template>
            </BaseCard>

            <BaseCard>
              <template #header>
                <span class="text-sm font-semibold text-fg">Methode de paiement</span>
              </template>
              <p class="text-sm text-fg-muted">
                Aucune methode de paiement configuree.
              </p>
              <template #footer>
                <!-- TODO: integrate Stripe Customer Portal or Stripe Elements for payment method management -->
                <BaseButton variant="secondary" size="sm" disabled>
                  Ajouter une carte
                </BaseButton>
              </template>
            </BaseCard>
          </div>
        </div>

        <!-- My Profile Section -->
        <div v-if="activeSection === 'me'">
          <BaseHeading level="2" class="mb-6">Mon profil</BaseHeading>
          <BaseCard>
            <div class="space-y-6">
              <div>
                <BaseInput
                  label="Nom complet"
                  v-model="localFullName"
                  placeholder="Jean Dupont"
                />
              </div>
              <div>
                <BaseInput
                  label="Adresse email"
                  :model-value="user.email"
                  disabled
                  readonly
                />
                <p class="mt-1 text-xs text-fg-muted">
                  L'adresse email ne peut pas etre modifiee.
                </p>
              </div>
            </div>
            <template #footer>
              <div class="flex justify-end">
                <!-- TODO: wrap in a Form with action PUT /settings/profile and remove the `disabled` attribute -->
                <BaseButton variant="primary" disabled>
                  Enregistrer les modifications
                </BaseButton>
              </div>
            </template>
          </BaseCard>
        </div>
      </div>
    </div>
  </div>
</template>
