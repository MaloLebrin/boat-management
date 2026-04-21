<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import BaseAlert from '~/components/base/BaseAlert.vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseCheckbox from '~/components/base/BaseCheckbox.vue'
import BaseDropdown from '~/components/base/BaseDropdown.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import BaseField from '~/components/base/BaseField.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import BasePagination from '~/components/base/BasePagination.vue'
import BaseRadio from '~/components/base/BaseRadio.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseSkeleton from '~/components/base/BaseSkeleton.vue'
import BaseStatCard from '~/components/base/BaseStatCard.vue'
import BaseTabs from '~/components/base/BaseTabs.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import BaseToggle from '~/components/base/BaseToggle.vue'

import brandIconUrl from '~/assets/brand/fleetide_ai_icon_C.svg?url'

const tab = ref<'overview' | 'components' | 'patterns'>('overview')
const page = ref(1)
const modalOpen = ref(false)

const radioValue = ref<'fast' | 'safe'>('safe')
const engineType = ref('')
const shipName = ref('Belle Hélène')
const notes = ref('')
const agree = ref(false)
const enabled = ref(true)

const tableRows = computed(() => {
  return [
    { name: 'Belle Hélène', type: 'Sailboat', status: 'Ready' },
    { name: 'Céleste', type: 'Motor', status: 'Maintenance' },
    { name: 'Aurore', type: 'Catamaran', status: 'Ready' },
    { name: 'Mistral', type: 'Sailboat', status: 'Docked' },
    { name: 'Lagoon', type: 'Motor', status: 'Ready' },
  ]
})
</script>

<template>
  <Head title="Charte graphique & design system" />

  <div class="px-6 py-10 space-y-16 sm:px-8">
    <header class="space-y-8">
      <div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div class="space-y-4">
          <p class="text-sm font-semibold tracking-wider uppercase text-brand">
            Fleet OS · design system
          </p>
          <BaseHeading level="display">
            Un design premium, pastel
          </BaseHeading>
          <div class="flex flex-wrap gap-3 items-center">
            <Link
              route="home"
              class="inline-flex text-sm font-semibold text-brand hover:text-brand-hover"
            >
              ← Retour à l’accueil
            </Link>
            <BaseBadge variant="info">
              motion: subtle
            </BaseBadge>
            <BaseBadge variant="success">
              tests: vitest
            </BaseBadge>
          </div>
        </div>

        <div class="flex flex-col gap-3">
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <BaseStatCard label="Composants" value="17" delta="Base primitives + patterns" tone="info" />
            <BaseStatCard label="États" value="A11y" delta="focus, disabled, invalid" tone="success" />
            <BaseStatCard label="Motion" value="220ms" delta="ease premium" tone="neutral" />
            <BaseStatCard label="Palette" value="Pastel" delta="lilac · peach · mint · sky" tone="warning" />
          </div>
          <div class="flex gap-2 justify-end items-center">
            <BaseButton variant="secondary" size="sm" type="button" @click="modalOpen = true">
              Ouvrir modal
            </BaseButton>
            <BaseButton size="sm" type="button" @click="tab = 'components'">
              Aller au catalogue
            </BaseButton>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap gap-4 justify-between items-center">
        <BaseTabs
          v-model="tab"
          :tabs="[
            { key: 'overview', label: 'Foundations', badge: 'tokens' },
            { key: 'components', label: 'Components', badge: 'base' },
            { key: 'patterns', label: 'Patterns', badge: 'examples' },
          ]"
        />
        <div class="hidden gap-2 items-center sm:flex">
          <BaseButton variant="ghost" size="sm" disabled>
            Reduced motion
          </BaseButton>
          <BaseButton variant="ghost" size="sm">
            Copy tokens
          </BaseButton>
        </div>
      </div>
    </header>

    <section v-if="tab === 'overview'" class="space-y-10">
      <BaseCard padded>
        <template #header>
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <img
                :src="brandIconUrl"
                alt="Fleetide AI icon"
                class="h-10 w-10 rounded-(--radius-control) shadow-(--shadow-xs)"
              />
              <div>
                <p class="font-display text-sm font-semibold text-fg">Fleetide AI</p>
                <p class="text-xs font-semibold text-fg-subtle">Horizon · wave · AI spark</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <BaseBadge variant="info">icon</BaseBadge>
              <BaseBadge variant="success">pastel</BaseBadge>
            </div>
          </div>
        </template>
        <div class="grid gap-6 md:grid-cols-3">
          <div class="rounded-(--radius-control) border border-border bg-surface-elevated p-4 shadow-(--shadow-xs)">
            <p class="text-xs font-semibold text-fg-muted">Usage</p>
            <p class="mt-2 text-sm text-fg-muted">
              Utiliser l’icône seule pour favicon/app icon. Préférer le lockup “Fleetide AI” dans le header.
            </p>
          </div>
          <div class="rounded-(--radius-control) border border-border bg-surface-elevated p-4 shadow-(--shadow-xs)">
            <p class="text-xs font-semibold text-fg-muted">Do</p>
            <ul class="mt-2 space-y-1 text-sm text-fg-muted">
              <li>Fond clair/pastel, marges généreuses.</li>
              <li>Contraste net sur petits formats.</li>
            </ul>
          </div>
          <div class="rounded-(--radius-control) border border-border bg-surface-elevated p-4 shadow-(--shadow-xs)">
            <p class="text-xs font-semibold text-fg-muted">Don’t</p>
            <ul class="mt-2 space-y-1 text-sm text-fg-muted">
              <li>Ne pas ajouter de bruit/texture.</li>
              <li>Ne pas animer le logo (branding stable).</li>
            </ul>
          </div>
        </div>
      </BaseCard>

      <div class="grid gap-6 lg:grid-cols-3">
        <BaseCard padded>
          <template #header>
            <h3 class="text-sm font-semibold font-display text-fg">Principes</h3>
          </template>
          <ul class="px-2 space-y-2 text-sm text-fg-muted">
            <li><span class="font-semibold text-fg">Cohérence</span> : tokens sémantiques d’abord.</li>
            <li><span class="font-semibold text-fg">Subtil</span> : motion courte, jamais tape-à-l’œil.</li>
            <li><span class="font-semibold text-fg">A11y</span> : focus visible, états complets.</li>
          </ul>
        </BaseCard>
        <BaseCard padded>
          <template #header>
            <h3 class="text-sm font-semibold font-display text-fg">Couleurs</h3>
          </template>
          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-(--radius-control) border border-border bg-lilac-100 px-3 py-2 text-xs font-semibold text-lilac-800 ring-1 ring-lilac-200">
              lilac
            </div>
            <div class="rounded-(--radius-control) border border-border bg-peach-100 px-3 py-2 text-xs font-semibold text-peach-800 ring-1 ring-peach-200">
              peach
            </div>
            <div class="rounded-(--radius-control) border border-border bg-mint-100 px-3 py-2 text-xs font-semibold text-mint-800 ring-1 ring-mint-200">
              mint
            </div>
            <div class="rounded-(--radius-control) border border-border bg-sky-100 px-3 py-2 text-xs font-semibold text-sky-800 ring-1 ring-sky-200">
              sky
            </div>
          </div>
        </BaseCard>
        <BaseCard padded>
          <template #header>
            <h3 class="text-sm font-semibold font-display text-fg">Elevation</h3>
          </template>
          <div class="grid gap-3">
            <div class="rounded-(--radius-control) bg-surface-elevated p-3 shadow-(--shadow-xs)">
              <p class="text-xs font-semibold text-fg-muted">shadow-xs</p>
            </div>
            <div class="rounded-(--radius-control) bg-surface-elevated p-3 shadow-(--shadow-sm)">
              <p class="text-xs font-semibold text-fg-muted">shadow-sm</p>
            </div>
          </div>
        </BaseCard>
      </div>

      <BaseHeading level="2">
        Typographie
      </BaseHeading>
      <p class="max-w-2xl text-sm text-fg-muted">
        <span class="font-semibold font-display text-fg">Sora</span> pour les titres ;
        <span class="font-semibold text-fg">Source Sans 3</span> pour le corps et les formulaires.
      </p>
      <div class="space-y-4 rounded-(--radius-card) border border-border bg-surface-elevated p-6 shadow-(--shadow-card)">
        <BaseHeading level="display">
          Display
        </BaseHeading>
        <BaseHeading level="1">
          Titre niveau 1
        </BaseHeading>
        <BaseHeading level="2">
          Titre niveau 2
        </BaseHeading>
        <BaseHeading level="3">
          Titre niveau 3
        </BaseHeading>
        <p class="max-w-prose text-base text-fg-muted">
          Texte courant pour paragraphes, listes et tableaux. Hauteur de ligne confortable pour
          la lecture prolongée à bord ou au bureau.
        </p>
      </div>
    </section>

    <section v-else-if="tab === 'components'" class="space-y-10">
      <BaseHeading level="2">
        Components
      </BaseHeading>
      <div class="grid gap-8 lg:grid-cols-2">
        <BaseCard padded>
          <template #header>
            <div class="flex gap-3 justify-between items-center">
              <p class="text-sm font-semibold font-display text-fg">Buttons</p>
              <BaseBadge variant="success">focus-ready</BaseBadge>
            </div>
          </template>
          <div class="flex flex-wrap gap-3 items-center">
            <BaseButton>Primary</BaseButton>
            <BaseButton variant="secondary">Secondary</BaseButton>
            <BaseButton variant="ghost">Ghost</BaseButton>
            <BaseButton variant="danger">Danger</BaseButton>
            <BaseButton disabled>Disabled</BaseButton>
          </div>
          <div class="flex flex-wrap gap-3 items-center mt-4">
            <BaseButton size="sm">Small</BaseButton>
            <BaseButton size="md">Medium</BaseButton>
            <BaseButton size="lg">Large</BaseButton>
          </div>
        </BaseCard>

        <BaseCard padded>
          <template #header>
            <div class="flex gap-3 justify-between items-center">
              <p class="text-sm font-semibold font-display text-fg">Badges</p>
              <BaseBadge variant="info">tokenized</BaseBadge>
            </div>
          </template>
          <div class="flex flex-wrap gap-2">
            <BaseBadge>neutral</BaseBadge>
            <BaseBadge variant="info">info</BaseBadge>
            <BaseBadge variant="success">success</BaseBadge>
            <BaseBadge variant="warning">warning</BaseBadge>
          </div>
        </BaseCard>
      </div>

      <div class="grid gap-8 lg:grid-cols-2">
        <BaseCard padded>
          <template #header>
            <p class="text-sm font-semibold font-display text-fg">Form controls</p>
          </template>
          <div class="grid gap-5">
            <BaseInput v-model="shipName" id="shipName" label="Nom du navire" hint="Visible sur la flotte" />
            <BaseSelect
              v-model="engineType"
              id="engineType"
              label="Type de propulsion"
              :options="[
                { label: 'Sailboat', value: 'sail' },
                { label: 'Motor', value: 'motor' },
                { label: 'Catamaran', value: 'cat' },
              ]"
              placeholder="Choisir…"
            />
            <BaseTextarea v-model="notes" id="notes" label="Notes" placeholder="Ex. vérification annuelle…" />
            <BaseRadio
              v-model="radioValue"
              label="Priorité"
              name="priority"
              :options="[
                { label: 'Safe', value: 'safe' },
                { label: 'Fast', value: 'fast' },
              ]"
              hint="Démo d’un choix exclusif"
            />
            <BaseCheckbox v-model="agree" id="agree" label="Consentement">
              J’accepte les règles de sécurité
            </BaseCheckbox>
            <BaseToggle v-model="enabled" id="enabled" label="Mode" hint="Désactive les notifications si off">
              Notifications
            </BaseToggle>
          </div>
        </BaseCard>

        <BaseCard padded>
          <template #header>
            <p class="text-sm font-semibold font-display text-fg">Navigation & feedback</p>
          </template>
          <div class="grid gap-5">
            <BaseTabs
              v-model="radioValue"
              :tabs="[
                { key: 'safe', label: 'Safe' },
                { key: 'fast', label: 'Fast', badge: 'beta' },
              ]"
            />
            <BasePagination v-model:page="page" :page-count="5" />
            <BaseAlert variant="info" title="Info">
              Les actions principales restent en menthe, le reste en surfaces douces.
            </BaseAlert>
            <div class="grid gap-2">
              <BaseSkeleton height-class="h-6" />
              <BaseSkeleton height-class="h-6" width-class="w-2/3" />
            </div>
          </div>
        </BaseCard>
      </div>

      <div class="grid gap-8 lg:grid-cols-2">
        <BaseCard padded>
          <template #header>
            <p class="text-sm font-semibold font-display text-fg">BaseField (wrapper)</p>
          </template>
          <div class="grid gap-6">
            <BaseField label="Champ custom" hint="Utilise un slot libre (input, select, etc.)" html-for="customField">
              <input
                id="customField"
                type="text"
                class="h-10 w-full rounded-(--radius-control) border border-border bg-surface-elevated px-3 text-sm text-fg shadow-sm placeholder:text-fg-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-shadow duration-(--motion-fast) ease-premium"
                placeholder="Libre"
              />
            </BaseField>

            <BaseField
              label="Champ invalide"
              error="Message d’erreur clair et lisible."
              html-for="invalidField"
            >
              <input
                id="invalidField"
                type="text"
                data-invalid="true"
                aria-invalid="true"
                class="h-10 w-full rounded-(--radius-control) border border-border bg-surface-elevated px-3 text-sm text-fg shadow-sm placeholder:text-fg-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 data-[invalid=true]:border-danger transition-shadow duration-(--motion-fast) ease-premium"
                value="Oops"
              />
            </BaseField>
          </div>
        </BaseCard>

        <BaseCard padded>
          <template #header>
            <p class="text-sm font-semibold font-display text-fg">BaseCard (tilt subtil)</p>
          </template>
          <p class="text-sm text-fg-muted">
            Survol = tilt + scale léger (désactivé si <span class="font-semibold text-fg">reduced motion</span>).
          </p>
          <div class="grid gap-3 mt-4 sm:grid-cols-2">
            <BaseStatCard label="Uptime" value="99.9%" delta="mensuel" tone="success" />
            <BaseStatCard label="Alerts" value="3" delta="à traiter" tone="warning" />
          </div>
        </BaseCard>
      </div>
    </section>

    <section v-else class="space-y-10">
      <BaseHeading level="2">Patterns</BaseHeading>

      <div class="grid gap-8 lg:grid-cols-2">
        <BaseCard padded>
          <template #header>
            <p class="text-sm font-semibold font-display text-fg">Dropdown menu</p>
          </template>
          <div class="flex gap-3 items-center">
            <BaseDropdown>
              <template #trigger>
                Actions
              </template>
              <template #default="{ close }">
                <button
                  type="button"
                  class="w-full rounded-(--radius-control) px-3 py-2 text-left text-sm font-semibold text-fg-muted transition-colors duration-(--motion-fast) ease-premium hover:bg-surface-muted hover:text-fg"
                  role="menuitem"
                  @click="close()"
                >
                  Exporter CSV
                </button>
                <button
                  type="button"
                  class="w-full rounded-(--radius-control) px-3 py-2 text-left text-sm font-semibold text-fg-muted transition-colors duration-(--motion-fast) ease-premium hover:bg-surface-muted hover:text-fg"
                  role="menuitem"
                  @click="close()"
                >
                  Archiver
                </button>
              </template>
            </BaseDropdown>
            <BaseButton variant="secondary" size="sm" type="button" @click="modalOpen = true">
              Modal
            </BaseButton>
          </div>
        </BaseCard>

        <BaseEmptyState
          title="Aucun bateau pour l’instant"
          description="Créez votre premier navire et commencez le suivi technique."
          action-label="Créer un bateau"
        />
      </div>

      <BaseCard padded>
        <template #header>
          <div class="flex gap-3 justify-between items-center">
            <p class="text-sm font-semibold font-display text-fg">Mini table</p>
            <BaseBadge variant="info">dense</BaseBadge>
          </div>
        </template>
        <div class="overflow-hidden rounded-(--radius-control) border border-border">
          <table class="w-full text-sm">
            <thead class="bg-surface-muted text-fg-muted">
              <tr>
                <th class="px-4 py-3 font-semibold text-left">Name</th>
                <th class="px-4 py-3 font-semibold text-left">Type</th>
                <th class="px-4 py-3 font-semibold text-left">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border bg-surface-elevated">
              <tr
                v-for="row in tableRows"
                :key="row.name"
                class="transition-colors duration-(--motion-fast) ease-premium hover:bg-lilac-50/60"
              >
                <td class="px-4 py-3 font-semibold text-fg">{{ row.name }}</td>
                <td class="px-4 py-3 text-fg-muted">{{ row.type }}</td>
                <td class="px-4 py-3">
                  <BaseBadge :variant="row.status === 'Ready' ? 'success' : 'warning'">
                    {{ row.status }}
                  </BaseBadge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </BaseCard>
    </section>

    <BaseModal v-model:open="modalOpen" title="Modal premium (subtil)">
      <p class="text-sm text-fg-muted">
        Le fond utilise un voile + blur léger. Le contenu reste net, et l’action principale est évidente.
      </p>
      <template #footer>
        <div class="flex gap-2 justify-end items-center">
          <BaseButton variant="secondary" type="button" @click="modalOpen = false">
            Cancel
          </BaseButton>
          <BaseButton type="button" @click="modalOpen = false">
            Confirm
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
