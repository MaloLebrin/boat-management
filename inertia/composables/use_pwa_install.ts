import { ref } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Module-level shared state — event fires at most once per page load
const canInstall = ref(false)
let deferredPrompt: BeforeInstallPromptEvent | null = null

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    canInstall.value = true
  })

  window.addEventListener('appinstalled', () => {
    canInstall.value = false
    deferredPrompt = null
  })
}

/**
 * PWA installée (mode standalone) — sur iOS, Web Push ne fonctionne que dans
 * ce mode (#498). `navigator.standalone` est le legacy Safari.
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  )
}

/**
 * Safari iOS n'émet jamais `beforeinstallprompt` (`canInstall` y reste faux) :
 * l'entonnoir d'installation passe par des instructions manuelles
 * (`IosInstallHint.vue`). iPadOS se déclare « MacIntel » avec du tactile.
 */
export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export function usePwaInstall() {
  async function promptInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    deferredPrompt = null
    if (outcome === 'accepted') canInstall.value = false
  }

  return { canInstall, promptInstall, isStandalone, isIos }
}
