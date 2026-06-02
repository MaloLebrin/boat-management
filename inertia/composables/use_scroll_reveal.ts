import { ref, type Ref } from 'vue'
import { useIntersectionObserver } from '@vueuse/core'

export function useScrollReveal(threshold = 0.12) {
  const el: Ref<HTMLElement | null> = ref(null)
  const isVisible = ref(false)

  useIntersectionObserver(
    el,
    ([entry]) => {
      if (entry.isIntersecting) {
        isVisible.value = true
      }
    },
    { threshold }
  )

  return { el, isVisible }
}
