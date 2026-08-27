<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg' | 'icon'
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    route?: string
    params?: Record<string, string | number>
    href?: string
    /**
     * Force le rendu en ancre `<a>` brute au lieu d'un `<Link>` Inertia, même
     * pour un chemin interne (#533). À réserver aux `href` qui ne sont pas une
     * navigation : téléchargement de fichier, export, ouverture en nouvel
     * onglet — une visite Inertia y afficherait le binaire comme une page.
     */
    externalHref?: boolean
    target?: string
    rel?: string
    method?: 'get' | 'post' | 'put' | 'patch' | 'delete'
    preserveScroll?: boolean
    preserveState?: boolean
    replace?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'md',
    disabled: false,
    type: 'button',
  }
)

/**
 * Un `href` interne (`/boats/12`) est une navigation : il doit passer par
 * `<Link>` pour préserver le routing SPA Inertia (#533). Seuls les `href`
 * absolus (`https:`, `mailto:`, `tel:`) et ceux marqués `external-href`
 * — téléchargements, exports — restent des ancres brutes.
 */
const isInternalHref = computed(() => {
  if (!props.href || props.externalHref) return false
  // `//example.org` est une URL protocol-relative, pas un chemin de l'app.
  return props.href.startsWith('/') && !props.href.startsWith('//')
})

const isInertiaLink = computed(() => Boolean(props.route) || isInternalHref.value)
const isAnchorLink = computed(() => !isInertiaLink.value && Boolean(props.href))

const componentTag = computed(() => {
  if (isInertiaLink.value) return Link
  if (isAnchorLink.value) return 'a'
  return 'button'
})

const variantClass: Record<NonNullable<typeof props.variant>, string> = {
  primary:
    'bg-brand text-on-brand shadow-sm hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  secondary:
    'border border-border-strong bg-surface-elevated text-fg shadow-sm hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  outline:
    'border border-border-strong bg-transparent text-fg hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  ghost:
    'text-fg-muted hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  danger:
    'bg-danger-soft text-danger-strong shadow-sm hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
}

const sizeClass: Record<NonNullable<typeof props.size>, string> = {
  sm: 'h-8 rounded-[var(--radius-control)] px-3 text-xs font-semibold',
  md: 'h-10 rounded-[var(--radius-control)] px-4 text-sm font-semibold',
  lg: 'h-11 rounded-[var(--radius-control)] px-5 text-base font-semibold',
  icon: 'h-8 w-8 rounded-[var(--radius-control)] p-0',
}

/**
 * Zone tactile ≥ 44 px sur pointeur grossier (#494) : le visuel garde sa
 * densité, un pseudo-élément étend la cible sur écran tactile uniquement
 * (`pointer-coarse:`). sm/icon font 32 px (+12), md 40 px (+4), lg est déjà
 * à 44 px. Classes écrites en littéral complet — le scanner Tailwind ne voit
 * pas les noms concaténés.
 */
const touchTargetClass: Record<NonNullable<typeof props.size>, string> = {
  sm: 'relative pointer-coarse:before:absolute pointer-coarse:before:content-[""] pointer-coarse:before:inset-x-0 pointer-coarse:before:-inset-y-1.5',
  md: 'relative pointer-coarse:before:absolute pointer-coarse:before:content-[""] pointer-coarse:before:inset-x-0 pointer-coarse:before:-inset-y-0.5',
  lg: '',
  icon: 'relative pointer-coarse:before:absolute pointer-coarse:before:content-[""] pointer-coarse:before:-inset-1.5',
}

const baseClass = computed(() => {
  const classList = [
    'inline-flex items-center justify-center gap-2 transition-colors cursor-pointer',
    'disabled:cursor-not-allowed disabled:opacity-50',
    variantClass[props.variant],
    sizeClass[props.size],
    touchTargetClass[props.size],
  ]

  if ((isInertiaLink.value || isAnchorLink.value) && props.disabled) {
    classList.push('cursor-not-allowed opacity-50 pointer-events-none')
  }

  return classList
})

function onClick(e: MouseEvent) {
  if ((isInertiaLink.value || isAnchorLink.value) && props.disabled) {
    e.preventDefault()
    e.stopPropagation()
  }
}
</script>

<template>
  <component
    :is="componentTag"
    :type="componentTag === 'button' ? type : undefined"
    :disabled="componentTag === 'button' ? disabled : undefined"
    :route="isInertiaLink ? route : undefined"
    :params="isInertiaLink ? params : undefined"
    :method="isInertiaLink ? method : undefined"
    :preserve-scroll="isInertiaLink ? preserveScroll : undefined"
    :preserve-state="isInertiaLink ? preserveState : undefined"
    :replace="isInertiaLink ? replace : undefined"
    :href="route ? undefined : href"
    :target="isAnchorLink ? target : undefined"
    :rel="isAnchorLink ? rel : undefined"
    :aria-disabled="componentTag !== 'button' && disabled ? 'true' : undefined"
    :tabindex="componentTag !== 'button' && disabled ? -1 : undefined"
    :class="baseClass"
    @click="onClick"
  >
    <slot />
  </component>
</template>
