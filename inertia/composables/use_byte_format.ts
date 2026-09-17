import { useT } from '~/composables/use_t'
import { renderFileSize, renderStorageSize, type ByteUnitLabels } from '~/utils/format_bytes'

/**
 * Tailles en octets dans la langue de l'app. Deux styles au catalogue, comme
 * pour les dates (#461) : un écran choisit, il n'écrit pas son propre calcul.
 *
 * Les unités passaient en dur en français dans les listes de documents — un
 * utilisateur anglophone y lisait « Ko » et « Mo » alors que les clés
 * existaient. Elles viennent maintenant de `common.units.*` des deux côtés.
 */
export function useByteFormat() {
  const { t } = useT()

  function labels(): ByteUnitLabels {
    return {
      bytes: t('common.units.bytes'),
      kb: t('common.units.kb'),
      mb: t('common.units.mb'),
      gb: t('common.units.gb'),
    }
  }

  /** `512 o` · `1.5 Ko` — taille d'un document (listes, modale d'ajout). */
  function formatFileSize(bytes: number): string {
    return renderFileSize(bytes, labels())
  }

  /** `12 Mo` · `1.4 Go` — volume consommé ou alloué (jauge de quota). */
  function formatStorageSize(bytes: number): string {
    return renderStorageSize(bytes, labels())
  }

  return { formatFileSize, formatStorageSize }
}
