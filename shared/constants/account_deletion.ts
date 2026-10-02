/**
 * Suppression en libre-service (#886).
 *
 * Délai de rétractation d'une suppression de compte : une reconnexion avant
 * son terme l'annule, après quoi le job `PurgeDeletedAccounts` anonymise le
 * compte.
 */
export const ACCOUNT_DELETION_GRACE_DAYS = 14

/**
 * Période de grâce d'une suppression d'organisation : récupérable par un
 * admin jusqu'à son terme, puis purgée par `PurgeDeletedOrganizations`.
 */
export const ORGANIZATION_DELETION_GRACE_DAYS = 30

/** Domaine réservé (RFC 2606) des adresses de comptes anonymisés. */
export const ANONYMIZED_EMAIL_DOMAIN = 'deleted.invalid'
