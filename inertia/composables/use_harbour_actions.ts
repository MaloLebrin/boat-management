import { router } from '@inertiajs/vue3'
import { useT } from '~/composables/use_t'
import { confirmDelete, confirmed } from '~/utils/native_dialog'
import type { MarinaStayRow, MooringContractRow } from '../../shared/types/marina'

/**
 * Gestes de la capitainerie (#891) : visites Inertia vers les routes
 * d'escales et de contrats, rechargement partiel des seules props touchées.
 */
export function useHarbourActions(portId: () => number) {
  const { t } = useT()
  const reload = { preserveScroll: true, only: ['harbour', 'port'] }

  const stayUrl = (stay: MarinaStayRow) => `/ports/${portId()}/marina-stays/${stay.id}`
  const contractUrl = (contract: MooringContractRow) =>
    `/ports/${portId()}/mooring-contracts/${contract.id}`

  function setStayStatus(stay: MarinaStayRow, status: 'arrived' | 'departed' | 'cancelled') {
    router.patch(`${stayUrl(stay)}/status`, { status }, reload)
  }

  /** Facture brouillon, puis la fiche facture (redirection serveur). */
  function invoiceStay(stay: MarinaStayRow) {
    if (!confirmed(t('ports.harbour.stays.invoiceConfirm'))) return
    router.post(`${stayUrl(stay)}/invoice`)
  }

  function deleteStay(stay: MarinaStayRow) {
    confirmDelete(t('ports.harbour.stays.deleteConfirm'), stayUrl(stay), reload)
  }

  function terminateContract(contract: MooringContractRow) {
    if (!confirmed(t('ports.harbour.contracts.terminateConfirm'))) return
    router.patch(`${contractUrl(contract)}/terminate`, {}, reload)
  }

  function deleteContract(contract: MooringContractRow) {
    confirmDelete(t('ports.harbour.contracts.deleteConfirm'), contractUrl(contract), reload)
  }

  return { setStayStatus, invoiceStay, deleteStay, terminateContract, deleteContract }
}
