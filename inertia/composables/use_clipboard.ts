import { getCurrentInstance, onMounted, onScopeDispose, ref } from 'vue'

interface ClipboardOptions {
  /** Délai (ms) avant de repasser `copied` à `false`. */
  resetAfterMs?: number
}

/**
 * Copie un texte dans le presse-papiers et expose un état `copied` éphémère
 * (#1018). Aucun accès à `navigator` au SSR ni au chargement du module :
 * `supported` est confirmé au montage. Un refus du navigateur (permission,
 * contexte non sécurisé) renvoie `false` sans lever — le texte reste
 * sélectionnable dans le champ. Le timer est nettoyé à la destruction du scope.
 */
export function useClipboard(options: ClipboardOptions = {}) {
  const { resetAfterMs = 2000 } = options

  const copied = ref(false)
  // Optimiste au rendu (serveur et premier rendu client identiques, pas de
  // décalage d'hydratation) ; corrigé au montage ou à la première copie.
  const supported = ref(true)
  let timer: ReturnType<typeof setTimeout> | null = null

  function isAvailable() {
    return typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function'
  }

  function clearTimer() {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }

  async function copy(text: string): Promise<boolean> {
    clearTimer()
    if (!isAvailable()) {
      supported.value = false
      copied.value = false
      return false
    }
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      copied.value = false
      return false
    }
    copied.value = true
    timer = setTimeout(() => {
      copied.value = false
      timer = null
    }, resetAfterMs)
    return true
  }

  if (getCurrentInstance()) {
    onMounted(() => {
      supported.value = isAvailable()
    })
    onScopeDispose(clearTimer)
  }

  return { copied, supported, copy }
}
