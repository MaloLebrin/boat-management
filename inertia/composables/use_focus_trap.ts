import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue'

/**
 * Éléments atteignables au clavier. Pas de test de visibilité par la mise en
 * page (`offsetParent`, `getClientRects`) : un champ masqué par CSS dans une
 * modale est rare, et ces API renvoient du vide sous happy-dom.
 */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',')

export interface FocusTrapOptions {
  /** Sélecteur CSS de l'élément à focaliser à l'ouverture. */
  initialFocus?: () => string | undefined
  /**
   * Zone où chercher le premier élément focalisable quand `initialFocus` est
   * absent — le corps de la modale plutôt que le bouton « Fermer » de l'en-tête.
   */
  preferredZone?: () => HTMLElement | null
}

/**
 * Pile des pièges actifs : une modale ouverte depuis une autre (confirmation
 * de suppression…) prend la main, et la première ne la reprend qu'à la
 * fermeture de la seconde.
 */
const stack: symbol[] = []

export function focusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('hidden') && !el.closest('[inert],[aria-hidden="true"]')
  )
}

/**
 * Piège de focus d'un dialogue modal (#861).
 *
 * Un `role="dialog"` + `aria-modal` promet au lecteur d'écran que le reste de
 * la page est inerte ; sans gestion du focus, `Tab` repartait parcourir la page
 * grisée derrière. Tant que `active` est vrai :
 *
 * 1. le focus entre dans le conteneur (`initialFocus`, sinon le premier élément
 *    focalisable, sinon le conteneur lui-même) ;
 * 2. `Tab` / `Maj+Tab` bouclent sur ses éléments, et un focus qui en sort
 *    (clic hors du panneau, script) y est ramené ;
 * 3. à la désactivation, le focus revient à l'élément qui l'avait avant
 *    l'ouverture — en général le bouton qui a ouvert la modale.
 */
export function useFocusTrap(
  container: Ref<HTMLElement | null>,
  active: () => boolean,
  options: FocusTrapOptions = {}
) {
  const id = Symbol('focus-trap')
  let previouslyFocused: HTMLElement | null = null

  const isTop = () => stack.at(-1) === id

  function focusInitial(el: HTMLElement) {
    const selector = options.initialFocus?.()
    const target =
      (selector ? el.querySelector<HTMLElement>(selector) : null) ??
      (options.preferredZone?.() ? focusableIn(options.preferredZone()!)[0] : undefined) ??
      focusableIn(el)[0] ??
      el
    target.focus()
  }

  function onKeyDown(e: KeyboardEvent) {
    const el = container.value
    if (e.key !== 'Tab' || !el || !isTop()) return
    const items = focusableIn(el)
    if (items.length === 0) {
      e.preventDefault()
      el.focus()
      return
    }
    const first = items[0]
    const last = items.at(-1)!
    const current = document.activeElement
    if (e.shiftKey && (current === first || !el.contains(current))) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && (current === last || !el.contains(current))) {
      e.preventDefault()
      first.focus()
    }
  }

  function onFocusIn(e: FocusEvent) {
    const el = container.value
    if (!el || !isTop() || el.contains(e.target as Node)) return
    focusInitial(el)
  }

  async function activate() {
    if (stack.includes(id)) return
    previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    stack.push(id)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('focusin', onFocusIn)
    // Le panneau est rendu par un `v-if` dans une `<Transition>` : il n'existe
    // qu'après le rendu qui suit le passage de `open` à vrai.
    await nextTick()
    if (container.value && isTop()) focusInitial(container.value)
  }

  function deactivate() {
    const index = stack.indexOf(id)
    if (index === -1) return
    stack.splice(index, 1)
    document.removeEventListener('keydown', onKeyDown)
    document.removeEventListener('focusin', onFocusIn)
    const target = previouslyFocused
    previouslyFocused = null
    if (target?.isConnected) target.focus()
  }

  watch(
    active,
    (isActive) => {
      if (typeof document === 'undefined') return
      if (isActive) void activate()
      else deactivate()
    },
    { immediate: true, flush: 'post' }
  )

  onBeforeUnmount(deactivate)

  return { isTop }
}
