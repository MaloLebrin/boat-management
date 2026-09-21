import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue'

/**
 * Révèle un bloc quand il entre dans le viewport.
 *
 * `refName` doit être l'attribut `ref="…"` posé sur l'élément à observer :
 * c'est `useTemplateRef` qui le résout. Le composant n'a donc plus à ré-exposer
 * le ref dans son template — un `:ref="el"` liait la valeur déréférencée
 * (`null` au premier rendu), l'observer n'observait rien et la section
 * apparaissait sans animation.
 */
export function useScrollReveal(refName = 'el', threshold = 0.1) {
  const el = useTemplateRef<HTMLElement>(refName)
  const isVisible = ref(false)
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    if (!el.value) {
      isVisible.value = true
      return
    }
    if (typeof IntersectionObserver === 'undefined') {
      isVisible.value = true
      return
    }
    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          isVisible.value = true
          observer?.disconnect()
          observer = null
        }
      },
      { threshold }
    )
    observer.observe(el.value)
  })

  onUnmounted(() => {
    observer?.disconnect()
    observer = null
  })

  return { el, isVisible }
}
