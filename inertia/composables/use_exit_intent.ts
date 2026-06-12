import { onBeforeUnmount, onMounted, ref } from 'vue'

const STORAGE_KEY = 'simulator_exit_intent_shown'

export function useExitIntent(active: () => boolean) {
  const triggered = ref(false)
  let inactivityTimer: ReturnType<typeof setTimeout> | null = null

  function markShown() {
    triggered.value = true
    try {
      sessionStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // sessionStorage unavailable (SSR / private browsing edge case)
    }
  }

  function alreadyShown() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      return false
    }
  }

  function onMouseLeave(e: MouseEvent) {
    if (!active() || alreadyShown()) return
    if (e.clientY <= 10) {
      markShown()
    }
  }

  function resetInactivity() {
    if (!active() || alreadyShown()) return
    if (inactivityTimer) clearTimeout(inactivityTimer)
    inactivityTimer = setTimeout(() => {
      if (active() && !alreadyShown()) markShown()
    }, 20_000)
  }

  const isMobile = () => typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches

  onMounted(() => {
    if (alreadyShown()) return
    if (isMobile()) {
      window.addEventListener('touchstart', resetInactivity, { passive: true })
      window.addEventListener('scroll', resetInactivity, { passive: true })
      resetInactivity()
    } else {
      document.addEventListener('mouseleave', onMouseLeave)
    }
  })

  onBeforeUnmount(() => {
    document.removeEventListener('mouseleave', onMouseLeave)
    window.removeEventListener('touchstart', resetInactivity)
    window.removeEventListener('scroll', resetInactivity)
    if (inactivityTimer) clearTimeout(inactivityTimer)
  })

  return { triggered }
}
