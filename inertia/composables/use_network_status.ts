import { computed, onMounted, onUnmounted, ref } from 'vue'
import { connectivityState, readNavigatorOnline } from '~/composables/use_connectivity'

/**
 * Dérivé de `use_connectivity` (#953) pour les formulaires qui choisissent
 * entre envoi direct et mise en file : hors-ligne **ou** réseau dégradé
 * (Wi-Fi de bord sans WAN), un envoi direct échouerait — la saisie part en file.
 *
 * Les événements `online`/`offline` restent écoutés ici : sans layout qui pilote
 * la probe, `isOnline` suit le navigateur comme avant.
 */
export function useNetworkStatus() {
  const navigatorOnline = ref(readNavigatorOnline())
  const connectivity = connectivityState()
  const isOnline = computed(() => navigatorOnline.value && connectivity.value !== 'degraded')

  function updateStatus() {
    navigatorOnline.value = readNavigatorOnline()
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
