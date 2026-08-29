import { DateTime } from 'luxon'
import { lifetimeFor } from '#shared/constants/safety/division240_content'

/** Échéance effective d'un équipement de sécurité. */
export interface EffectiveExpiry {
  /** Date d'échéance (péremption ou révision). */
  date: DateTime
  /** `declared` = `expiry_date` saisie, `default` = durée de vie du corpus. */
  source: 'declared' | 'default'
  /** `expiry` = matériel périmé, `review` = révision / vérification à faire. */
  kind: 'expiry' | 'review'
}

/** Vue minimale d'un équipement pour le calcul d'échéance. */
export interface ExpirableSafetyItem {
  equipmentType: string
  expiryDate: string | DateTime | null
  purchasedAt: string | DateTime | null
}

function toDate(value: string | DateTime | null): DateTime | null {
  if (value === null) return null
  const date = DateTime.isDateTime(value) ? value : DateTime.fromISO(value, { zone: 'utc' })
  return date.isValid ? date.startOf('day') : null
}

/**
 * Échéance à retenir pour un équipement de sécurité.
 *
 * Une `expiry_date` saisie prime **toujours** : c'est la date lue sur le
 * matériel. À défaut, le corpus Division 240 fournit une durée de vie par type
 * (fusées 3 ans, extincteur vérifié tous les ans…) appliquée à la date d'achat —
 * sans quoi un équipement sans date saisie n'était jamais signalé (#582).
 *
 * @param item équipement (type, date de péremption saisie, date d'achat)
 * @returns l'échéance et sa provenance, ou `null` si rien ne permet d'en dater une
 */
export function resolveEffectiveExpiry(item: ExpirableSafetyItem): EffectiveExpiry | null {
  const declared = toDate(item.expiryDate)
  if (declared) return { date: declared, source: 'declared', kind: 'expiry' }

  const lifetime = lifetimeFor(item.equipmentType)
  if (!lifetime) return null

  const purchasedAt = toDate(item.purchasedAt)
  if (!purchasedAt) return null

  return {
    date: purchasedAt.plus({ months: lifetime.months }),
    source: 'default',
    kind: lifetime.kind,
  }
}
