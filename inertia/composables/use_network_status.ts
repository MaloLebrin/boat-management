import { onMounted, onUnmounted, ref } from 'vue'

// Issue #459 — en SSR, Node ≥ 21 expose bien un objet `navigator` global mais
// sans `onLine` : lire `navigator.onLine` y renvoyait `undefined`, l'état partait
// donc à « hors-ligne » et la bannière orange était rendue dans le HTML SSR
// jusqu'à l'hydratation (~1 s). On ne considère l'app hors-ligne que sur un
// `false` explicite du navigateur.
function readOnlineStatus(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine !== false
}

export function useNetworkStatus() {
  const isOnline = ref(readOnlineStatus())

  function updateStatus() {
    isOnline.value = readOnlineStatus()
  }

  onMounted(() => {
    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)
  })

  onUnmounted(() => {
    window.removeEventListener('online', updateStatus)
    window.removeEventListener('offline', updateStatus)
  })

  return { isOnline }
}
