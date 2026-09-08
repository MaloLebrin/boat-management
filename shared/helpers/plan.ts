import { ADDON_QUOTA_INCREMENTS, MODULE_FLAGS, PLAN_LIMITS } from '#shared/types/plan'
import type { PlanAddon, PlanModule, PlanQuotas, PlanTier } from '#shared/types/plan'
import type { OrganizationType } from '#shared/types/organization'

/** Add-on actif avec sa quantité, tel que consommé par la résolution de quotas. */
export interface ActiveAddonQuantity {
  addon: PlanAddon
  quantity: number
}

/**
 * Profils d'organisation qui n'ont rien à cartographier : un amateur privé
 * range un ou deux bateaux personnels, il n'a ni ponton ni mouillage à
 * modéliser. Le volet Ports leur est fermé quel que soit leur plan — c'est une
 * restriction de **profil**, pas de tier : la grille tarifaire ne bouge pas.
 */
const PORTLESS_ORGANIZATION_TYPES: readonly OrganizationType[] = ['private']

/**
 * Vrai si le profil déclaré exclut la cartographie de port. Un profil non
 * renseigné (`null` — comptes antérieurs à la collecte du profil, jamais
 * backfillés) ne restreint rien : seul un profil explicitement particulier perd
 * des capacités.
 */
export function isPortlessOrganizationProfile(organizationType: OrganizationType | null): boolean {
  return organizationType !== null && PORTLESS_ORGANIZATION_TYPES.includes(organizationType)
}

/**
 * Superpose aux quotas de plan les restrictions liées au profil déclaré à
 * l'inscription (`organizations.type`). Fonction pure, appliquée en sortie de
 * `resolveEffectiveQuotas` côté backend comme côté frontend — ne jamais
 * recombiner tier + modules + add-ons + profil ailleurs.
 */
export function applyOrganizationProfileOverrides(
  quotas: PlanQuotas,
  organizationType: OrganizationType | null
): PlanQuotas {
  if (!isPortlessOrganizationProfile(organizationType)) return quotas
  return { ...quotas, canManagePorts: false }
}

/**
 * Raccourci pour les appelants qui n'ont pas besoin des quotas complets
 * (`QuotaService`, `PortService`) : la cartographie de port est une capacité de
 * tier pur — aucun module ni add-on ne l'accorde — restreinte ensuite par le
 * profil. Dérivée de {@link applyOrganizationProfileOverrides} pour garder une
 * seule source de vérité.
 */
export function canManagePortsFor(
  tier: PlanTier,
  organizationType: OrganizationType | null
): boolean {
  return applyOrganizationProfileOverrides(PLAN_LIMITS[tier], organizationType).canManagePorts
}

/**
 * Quotas effectifs d'une organisation = quotas du tier, fusionnés avec les
 * flags booléens de ses modules actifs (épic #327), puis augmentés par les
 * add-ons quantitatifs (épic #333). Fonction pure, seule source de vérité
 * partagée backend (policies, QuotaService) / frontend (navigation,
 * composables) — ne jamais recombiner tier + modules + add-ons ailleurs.
 *
 * - Un **module** ne fait qu'écraser des flags (jamais un quota numérique).
 * - Un **add-on** ajoute `perUnit × quantity` à un quota numérique, sauf si
 *   celui-ci est illimité (`null`, ex. Enterprise) — l'illimité n'est jamais
 *   dégradé.
 * - Le **profil déclaré** de l'organisation est appliqué en dernier et ne peut
 *   que retirer une capacité : ni un module ni un add-on ne rend ce que le
 *   profil refuse. Omis (`null`), il ne restreint rien.
 */
export function resolveEffectiveQuotas(
  tier: PlanTier,
  modules: readonly PlanModule[],
  addons: readonly ActiveAddonQuantity[] = [],
  organizationType: OrganizationType | null = null
): PlanQuotas {
  const quotas: PlanQuotas = { ...PLAN_LIMITS[tier] }
  for (const module of modules) {
    Object.assign(quotas, MODULE_FLAGS[module])
  }
  for (const { addon, quantity } of addons) {
    if (quantity <= 0) continue
    const { field, perUnit } = ADDON_QUOTA_INCREMENTS[addon]
    const current = quotas[field]
    if (typeof current === 'number') {
      quotas[field] = current + perUnit * quantity
    }
  }
  return applyOrganizationProfileOverrides(quotas, organizationType)
}
