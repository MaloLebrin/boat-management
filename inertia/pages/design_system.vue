<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseField from '~/components/base/BaseField.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { inputClass } from '~/utils/form_styles'
</script>

<template>
  <Head title="Charte graphique & design system" />

  <div class="space-y-16 px-6 py-10 sm:px-8">
    <header class="max-w-3xl space-y-4">
      <p class="text-sm font-semibold uppercase tracking-wider text-brand">
        Fleet OS · identité visuelle
      </p>
      <BaseHeading level="display">
        Pilotez votre flotte avec clarté
      </BaseHeading>
      <p class="text-pretty text-lg text-fg-muted">
        Charte et composants pour une app nautique lumineuse : pastels lavande, pêche, menthe et
        ciel pour une ambiance colorée et douce — sans cliché marin. Ton
        <strong class="font-semibold text-fg">professionnel, concis, rassurant</strong>.
      </p>
      <Link
        route="home"
        class="inline-flex text-sm font-semibold text-brand hover:text-brand-hover"
      >
        ← Retour à l’accueil
      </Link>
    </header>

    <section class="space-y-6">
      <BaseHeading level="2">
        Promesse & principes
      </BaseHeading>
      <div class="grid gap-6 md:grid-cols-3">
        <BaseCard>
          <template #header>
            <h3 class="font-display text-sm font-semibold text-fg">
              Précision
            </h3>
          </template>
          <p class="text-sm text-fg-muted">
            Données techniques et navigation fluide : chaque écran réduit la charge cognitive.
          </p>
        </BaseCard>
        <BaseCard>
          <template #header>
            <h3 class="font-display text-sm font-semibold text-fg">
              Confiance
            </h3>
          </template>
          <p class="text-sm text-fg-muted">
            Contrastes lisibles, états explicites, feedback immédiat sur les actions.
          </p>
        </BaseCard>
        <BaseCard>
          <template #header>
            <h3 class="font-display text-sm font-semibold text-fg">
              Horizons
            </h3>
          </template>
          <p class="text-sm text-fg-muted">
            Palette lumineuse et profonde : l’outil accompagne l’exploration sans distraire.
          </p>
        </BaseCard>
      </div>
    </section>

    <section class="space-y-6">
      <BaseHeading level="2">
        Couleurs
      </BaseHeading>
      <p class="max-w-2xl text-sm text-fg-muted">
        <strong class="text-fg">À faire</strong> : menthe pour les actions primaires ; pêche et
        corail adouci pour le chaud ; lilas et ciel pour les surfaces d’info. <strong class="text-fg">À éviter</strong> :
        saturer un même bloc avec trop d’accents, ou atténuer les messages d’erreur.
      </p>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div class="overflow-hidden rounded-[var(--radius-card)] border border-border shadow-[var(--shadow-card)]">
          <div class="h-20 bg-lilac-200" />
          <p class="px-3 py-2 font-mono text-xs text-fg-muted">
            lilac · froid doux
          </p>
        </div>
        <div class="overflow-hidden rounded-[var(--radius-card)] border border-border shadow-[var(--shadow-card)]">
          <div class="h-20 bg-peach-200" />
          <p class="px-3 py-2 font-mono text-xs text-fg-muted">
            peach · chaud pastel
          </p>
        </div>
        <div class="overflow-hidden rounded-[var(--radius-card)] border border-border shadow-[var(--shadow-card)]">
          <div class="h-20 bg-mint-200" />
          <p class="px-3 py-2 font-mono text-xs text-fg-muted">
            mint · succès / mer
          </p>
        </div>
        <div class="overflow-hidden rounded-[var(--radius-card)] border border-border shadow-[var(--shadow-card)]">
          <div class="h-20 bg-sky-200" />
          <p class="px-3 py-2 font-mono text-xs text-fg-muted">
            sky · info
          </p>
        </div>
        <div class="overflow-hidden rounded-[var(--radius-card)] border border-border shadow-[var(--shadow-card)]">
          <div class="h-20 bg-mint-600" />
          <p class="px-3 py-2 font-mono text-xs text-fg-muted">
            mint-600 · marque
          </p>
        </div>
        <div class="overflow-hidden rounded-[var(--radius-card)] border border-border shadow-[var(--shadow-card)]">
          <div class="h-20 bg-surface-muted" />
          <p class="px-3 py-2 font-mono text-xs text-fg-muted">
            surface-muted · fonds
          </p>
        </div>
      </div>
    </section>

    <section class="space-y-6">
      <BaseHeading level="2">
        Typographie
      </BaseHeading>
      <p class="max-w-2xl text-sm text-fg-muted">
        <span class="font-display font-semibold text-fg">Sora</span> pour les titres ;
        <span class="font-semibold text-fg">Source Sans 3</span> pour le corps et les formulaires.
      </p>
      <div class="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface-elevated p-6 shadow-[var(--shadow-card)]">
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

    <section class="space-y-6">
      <BaseHeading level="2">
        Grille & espacements
      </BaseHeading>
      <p class="max-w-2xl text-sm text-fg-muted">
        Conteneur principal <code class="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs">max-w-6xl</code>,
        gouttières <code class="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs">px-6</code>,
        cartes avec rayon <code class="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs">--radius-card</code>.
      </p>
      <div class="flex flex-wrap gap-2">
        <BaseBadge>neutral</BaseBadge>
        <BaseBadge variant="info">
          info
        </BaseBadge>
        <BaseBadge variant="success">
          success
        </BaseBadge>
        <BaseBadge variant="warning">
          warning
        </BaseBadge>
      </div>
    </section>

    <section class="space-y-8">
      <BaseHeading level="2">
        Catalogue des composants
      </BaseHeading>

      <div class="space-y-4">
        <h3 class="font-display text-sm font-semibold text-fg-muted">
          BaseButton
        </h3>
        <div class="flex flex-wrap items-center gap-3">
          <BaseButton>Primary</BaseButton>
          <BaseButton variant="secondary">
            Secondary
          </BaseButton>
          <BaseButton variant="ghost">
            Ghost
          </BaseButton>
          <BaseButton variant="danger">
            Danger
          </BaseButton>
          <BaseButton disabled>
            Disabled
          </BaseButton>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <BaseButton size="sm">
            Small
          </BaseButton>
          <BaseButton size="md">
            Medium
          </BaseButton>
          <BaseButton size="lg">
            Large
          </BaseButton>
        </div>
      </div>

      <div class="space-y-4">
        <h3 class="font-display text-sm font-semibold text-fg-muted">
          BaseCard
        </h3>
        <BaseCard class="max-w-md">
          <template #header>
            <span class="font-display font-semibold text-fg">Carte exemple</span>
          </template>
          <p class="text-sm text-fg-muted">
            Contenu avec ombre douce et survol léger pour suggérer la profondeur.
          </p>
          <template #footer>
            <BaseButton variant="secondary" size="sm">
              Action
            </BaseButton>
          </template>
        </BaseCard>
      </div>

      <div class="space-y-4">
        <h3 class="font-display text-sm font-semibold text-fg-muted">
          BaseField
        </h3>
        <div class="grid max-w-md gap-6">
          <BaseField label="Nom du navire" hint="Tel qu’il apparaît sur le registre" html-for="ds-ship">
            <input id="ds-ship" type="text" :class="inputClass" placeholder="Ex. Belle Hélène" />
          </BaseField>
          <BaseField
            label="Indicatif"
            error="Ce champ est requis pour la conformité."
            html-for="ds-call"
          >
            <input id="ds-call" type="text" :class="inputClass" data-invalid="true" aria-invalid="true" />
          </BaseField>
        </div>
      </div>
    </section>
  </div>
</template>
